import { expect, test, type Page } from "@playwright/test";
import type {
  FlatAttendanceRecord,
  TakeAttendanceBatchPayload,
} from "../types/school";

const classId = "6a9c3a55b1285e2c15bbc741";
const studentId = "6a9c3a55b1285e2c15bbc743";
const overrideId = "6a9c3a55b1285e2c15bbc745";
const user = {
  id: "6a9c3a55b1285e2c15bbc746",
  fullName: "Giáo viên kiểm thử",
  email: "attendance@example.test",
  role: "teacher",
  isEmailVerified: true,
};
const classroom = {
  id: classId,
  teacherId: user.id,
  name: "Lớp kiểm thử điểm danh",
  imageUrl: "/logo.png",
  colorIndex: 0,
  regularPrice: 100000,
  makeupPrice: 100000,
  studentCount: 1,
  status: "active",
  latestFixedSchedule: null,
  students: [
    {
      id: studentId,
      fullName: "Học sinh kiểm thử",
      status: "active",
      gender: "male",
    },
  ],
};
const lesson = {
  id: `extra:${overrideId}:2026-10-05:09:00:10:00`,
  classId,
  className: classroom.name,
  colorIndex: 0,
  date: "2026-10-05",
  startTime: "09:00",
  endTime: "10:00",
  type: "extra",
  topic: "Buổi tạo nhầm",
};

// Exercise the real UI and request payloads with isolated API fixtures.
async function setup(page: Page, billed = false) {
  const saves: TakeAttendanceBatchPayload[] = [];
  let revoked = false;
  let records: FlatAttendanceRecord[] = billed
    ? [
        {
          id: "attendance",
          sessionId: lesson.id,
          studentId,
          status: "present",
          isBilled: true,
          note: "",
        },
      ]
    : [];
  await page.clock.setFixedTime(new Date("2026-10-05T02:00:00Z"));
  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    if (path === "/api/auth/refresh")
      return route.fulfill({ json: { accessToken: "test-token", user } });
    if (path === "/api/auth/me") return route.fulfill({ json: user });
    if (path === `/api/classes/${classId}`)
      return route.fulfill({ json: classroom });
    if (path.endsWith("/attendance-sheet"))
      return route.fulfill({
        json: { sessions: revoked ? [] : [lesson], records },
      });
    if (path.endsWith("/attendance-batch")) {
      const body = request.postDataJSON() as TakeAttendanceBatchPayload;
      saves.push(body);
      for (const session of body.sessions) {
        for (const record of session.records) {
          records = records.filter(
            (item) => item.studentId !== record.studentId,
          );
          if (record.status)
            records.push({
              id: "attendance",
              sessionId: lesson.id,
              studentId: record.studentId,
              status: record.status,
              isBilled: false,
              note: "",
            });
        }
      }
      return route.fulfill({
        json: {
          message: "Đã lưu điểm danh thành công.",
          updatedSessions: body.sessions.length,
        },
      });
    }
    if (
      path.endsWith(`/schedules/temporary/${overrideId}`) &&
      request.method() === "DELETE"
    ) {
      if (records.length)
        return route.fulfill({
          status: 409,
          json: {
            message: "Buổi học đã được điểm danh, không thể thu hồi lịch.",
          },
        });
      revoked = true;
      return route.fulfill({ json: { message: "Đã thu hồi lịch tạm thời." } });
    }
    if (path.endsWith("/schedules"))
      return route.fulfill({
        json: {
          fixedSchedules: [],
          latestFixedSchedule: null,
          temporarySchedules: revoked
            ? []
            : [
                {
                  id: overrideId,
                  classId,
                  action: "extra",
                  newDate: lesson.date,
                  startTime: lesson.startTime,
                  endTime: lesson.endTime,
                  reason: "Buổi tạo nhầm",
                },
              ],
        },
      });
    if (path === "/api/schedules/week") {
      const weekStart = url.searchParams.get("weekStart") ?? "2026-10-05";
      const days = Array.from({ length: 7 }, (_, index) => ({
        date: new Date(Date.parse(`${weekStart}T00:00:00Z`) + index * 86400000)
          .toISOString()
          .slice(0, 10),
        dayOfWeek: index + 1,
      }));
      return route.fulfill({
        json: {
          weekStart,
          weekEnd: days[6].date,
          days,
          classes: [classroom],
          events: revoked ? [] : [lesson],
        },
      });
    }
    return route.fulfill({ json: [] });
  });
  await page.goto(`/classes/${classId}`);
  await page.getByRole("button", { name: "Điểm danh", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Bảng điểm danh" }),
  ).toBeVisible();
  return { saves, isRevoked: () => revoked };
}

for (const width of [1440, 390]) {
  test(`save, clear, reload and revoke a mistaken lesson at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    const { saves, isRevoked } = await setup(page);
    const cell = page.locator('td[title="Bấm để đổi trạng thái"]');
    await cell.click();
    await page.getByRole("button", { name: "Lưu", exact: true }).click();
    await page
      .getByRole("button", { name: "Lưu thay đổi", exact: true })
      .click();
    await expect(
      page.getByTitle("Sửa điểm danh", { exact: true }),
    ).toBeVisible();
    expect(saves[0].sessions[0].records).toEqual([
      { studentId, status: "present" },
    ]);

    await page.reload();
    await page.getByRole("button", { name: "Điểm danh", exact: true }).click();
    await page.getByTitle("Sửa điểm danh", { exact: true }).click();
    await page.getByRole("button", { name: "CM", exact: true }).click();
    await page.getByRole("button", { name: "KP", exact: true }).click();
    await page.getByRole("button", { name: "CP", exact: true }).click();
    await expect(cell).toHaveText("--");
    await page.getByRole("button", { name: "Lưu", exact: true }).click();
    await page
      .getByRole("button", { name: "Lưu thay đổi", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Lưu", exact: true }),
    ).toHaveCount(0);
    expect(saves[1].sessions[0]).toEqual({
      date: lesson.date,
      startTime: lesson.startTime,
      endTime: lesson.endTime,
      scheduleEventType: "extra",
      records: [{ studentId, status: null }],
    });

    await page.reload();
    await page.getByRole("button", { name: "Điểm danh", exact: true }).click();
    await expect(cell).toHaveText("--");
    await expect(page.getByTitle("Sửa điểm danh", { exact: true })).toHaveCount(
      0,
    );
    await page
      .getByRole("button", { name: "Thời khóa biểu", exact: true })
      .click();
    await expect(
      page.getByText(lesson.topic, { exact: true }).filter({ visible: true }).first(),
    ).toBeVisible();
    await page.getByRole("button", { name: "Thu hồi", exact: true }).click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Thu hồi", exact: true })
      .click();
    await expect(
      page.getByText("Tuần này chưa có lịch tạm thời."),
    ).toBeVisible();
    expect(isRevoked()).toBe(true);
    await expect(page.getByText(lesson.topic, { exact: true })).toHaveCount(0);
    await page.reload();
    await page
      .getByRole("button", { name: "Thời khóa biểu", exact: true })
      .click();
    await expect(page.getByText("Tuần này chưa có lịch tạm thời.")).toBeVisible();
    await expect(page.getByText(lesson.topic, { exact: true })).toHaveCount(0);
    await page.getByRole("button", { name: "Điểm danh", exact: true }).click();
    await expect(page.locator('td[title="Bấm để đổi trạng thái"]')).toHaveCount(0);
  });
}

test("billed attendance remains locked", async ({ page }) => {
  const { saves } = await setup(page, true);
  await expect(
    page.getByRole("button", {
      name: "CM, đã khóa do đã xuất hóa đơn",
      exact: true,
    }),
  ).toBeDisabled();
  await expect(page.getByTitle("Sửa điểm danh", { exact: true })).toHaveCount(
    0,
  );
  expect(saves).toEqual([]);
});
