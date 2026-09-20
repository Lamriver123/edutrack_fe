import { expect, test, type Page } from "@playwright/test";

const classId = "6a9c3a55b1285e2c15bbc741";
const secondClassId = "6a9c3a55b1285e2c15bbc742";
const studentId = "6a9c3a55b1285e2c15bbc743";
const customId = "6a9c3a55b1285e2c15bbc744";
const oldId = "6a9c3a55b1285e2c15bbc745";
const revision = "a".repeat(64);
const student = {
  id: studentId,
  teacherId: "teacher",
  studentCode: "HS001",
  fullName: "Test Student",
  gender: "male",
  status: "active",
};
const classroom = {
  id: classId,
  teacherId: "teacher",
  name: "English A",
  imageUrl: "/logo.png",
  colorIndex: 0,
  regularPrice: 150000,
  makeupPrice: 100000,
  studentCount: 1,
  status: "active",
  latestFixedSchedule: null,
  students: [student],
};
const classes = [
  classroom,
  { ...classroom, id: secondClassId, name: "English B" },
];
const templates = [
  {
    id: "SYSTEM_INVOICE_V2",
    name: "System",
    version: 2,
    type: "SYSTEM",
    isDefault: true,
  },
  {
    id: customId,
    name: "My invoice",
    version: 3,
    type: "CUSTOM",
    isDefault: true,
  },
  {
    id: oldId,
    name: "Previous invoice",
    version: 2,
    type: "CUSTOM",
    isDefault: false,
  },
];

async function setup(page: Page, merged = false, failure = { active: false }) {
  const requests: { path: string; body: Record<string, unknown> }[] = [];
  const lessons = (merged ? classes : [classroom]).map((item, index) => ({
    id: `lesson-${index}`,
    tuitionEntryId: `lesson-${index}`,
    classId: item.id,
    className: item.name,
    sequence: index + 1,
    date: "2026-09-01",
    startTime: "18:00",
    endTime: "19:30",
    scheduleType: "fixed",
    attendanceStatus: "present",
    unitPrice: 150000,
    amount: 150000,
    topic: "Revision",
  }));
  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    const user = {
      id: "teacher",
      fullName: "Test Teacher",
      email: "test@example.com",
      role: "teacher",
      isEmailVerified: true,
    };
    if (path === "/api/auth/refresh")
      return route.fulfill({ json: { accessToken: "test-token", user } });
    if (path === "/api/auth/me") return route.fulfill({ json: user });
    if (path === "/api/invoice-templates") {
      if (failure.active)
        return route.fulfill({
          status: 503,
          json: { message: "Template list unavailable" },
        });
      return route.fulfill({ json: templates });
    }
    if (path.endsWith("/receipts/preview")) {
      const body = request.postDataJSON() as Record<string, unknown>;
      requests.push({ path, body });
      const template = templates.find((item) => item.id === body.templateId)!;
      return route.fulfill({
        json: {
          template: { ...template, revision },
          receipt: {},
          html: `<html><body><h1>${template.name}</h1><p>Test Student</p></body></html>`,
        },
      });
    }
    if (path.endsWith("/receipts") && request.method() === "POST") {
      requests.push({
        path,
        body: request.postDataJSON() as Record<string, unknown>,
      });
      return route.fulfill({
        json: {
          id: "issued-test",
          receiptNumber: "TEST-001",
          pdfStatus: "generated",
        },
      });
    }
    if (path.endsWith("/billing-candidates"))
      return route.fulfill({
        json: {
          class: classroom,
          classes: merged ? classes : [classroom],
          student,
          periodStart: "2026-09-01",
          periodEnd: "2026-09-01",
          suggestedTuitionEntryIds: lessons.map((item) => item.tuitionEntryId),
          tuitionEntries: lessons,
          exams: [],
          summary: {
            unbilledLessonCount: lessons.length,
            unbilledAmount: lessons.length * 150000,
            examCount: 0,
          },
        },
      });
    if (path === `/api/students/${studentId}/billing/overview`)
      return route.fulfill({
        json: {
          student,
          classes: classes.map((item) => ({
            class: item,
            unbilledLessonCount: 1,
            unbilledAmount: 150000,
          })),
          totals: { unbilledLessonCount: 2, unbilledAmount: 300000 },
        },
      });
    if (path.endsWith("/billing/overview"))
      return route.fulfill({
        json: {
          classId,
          className: classroom.name,
          regularPrice: 150000,
          makeupPrice: 100000,
          totals: {
            students: 1,
            unbilledLessonCount: 1,
            unbilledAmount: 150000,
            readyToIssueCount: 0,
          },
          students: [
            {
              student,
              unbilledLessonCount: 1,
              unbilledAmount: 150000,
              reachedSuggestedCycle: false,
            },
          ],
        },
      });
    if (path === `/api/classes/${classId}`)
      return route.fulfill({ json: classroom });
    if (path === "/api/classes") return route.fulfill({ json: classes });
    return route.fulfill({ json: [] });
  });
  await page.goto(
    `/classes/${classId}?receiptStudentId=${studentId}&receiptMode=${merged ? "multi_class" : "class"}`,
  );
  return requests;
}

async function chooseTemplate(page: Page, picker: ReturnType<Page["getByRole"]>, name: string) {
  await picker.click();
  await page.getByRole("option", { name, exact: true }).click();
}

for (const merged of [false, true]) {
  test(`selects and issues the chosen version for ${merged ? "merged" : "single-class"} invoices`, async ({
    page,
  }) => {
    const requests = await setup(page, merged);
    const picker = page.getByRole("combobox", {
      name: "Mẫu hóa đơn",
      exact: true,
    });
    await expect(picker).toContainText("My invoice · V3");
    await chooseTemplate(page, picker, "Previous invoice · V2");
    const popupPromise = page.waitForEvent("popup");
    await page.getByRole("button", { name: "Xem trước", exact: true }).click();
    const popup = await popupPromise;
    await expect(popup.getByRole("heading")).toHaveText("Previous invoice");
    await popup.close();
    expect(requests[0].body.templateId).toBe(oldId);
    await page
      .getByRole("button", { name: "Phát hành hóa đơn", exact: true })
      .click();
    await expect(
      page.getByText(/bằng mẫu Previous invoice \(V2\)/),
    ).toBeVisible();
    await page.getByRole("button", { name: "Phát hành", exact: true }).click();
    await expect.poll(() => requests.length).toBe(2);
    expect(requests[1].body).toMatchObject({
      templateId: oldId,
      templateRevision: revision,
    });
    expect(requests[1].path).toBe(
      merged
        ? `/api/students/${studentId}/receipts`
        : `/api/classes/${classId}/students/${studentId}/receipts`,
    );
    if (merged)
      expect(requests[1].body.classIds).toEqual([classId, secondClassId]);
    await expect(picker).toHaveCount(0);
  });
}

test("blocks issuance on template load errors, retries and fits mobile", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const failure = { active: true };
  await setup(page, false, failure);
  await expect(
    page.getByRole("alert").filter({ hasText: "Template list unavailable" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Phát hành hóa đơn", exact: true }),
  ).toBeDisabled();
  failure.active = false;
  await page.getByRole("button", { name: "Tải lại mẫu", exact: true }).click();
  const picker = page.getByRole("combobox", {
    name: "Mẫu hóa đơn",
    exact: true,
  });
  await expect(picker).toContainText("My invoice · V3");
  await chooseTemplate(page, picker, "Mẫu hệ thống · V2");
  await page.getByRole("button", { name: "Tải lại danh sách mẫu" }).click();
  await expect(picker).toContainText("Mẫu hệ thống · V2");
  await expect(
    page.getByRole("button", { name: "Phát hành hóa đơn", exact: true }),
  ).toBeEnabled();
  const box = await picker.boundingBox();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(390);
  await page.screenshot({ path: "test-results/receipt-template-mobile.png" });
});
