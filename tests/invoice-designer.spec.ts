import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import {
  SYSTEM_V2_HTML,
  SYSTEM_V2_CSS,
} from "../../edutrack_be/src/modules/invoice-template/constants/system-invoice-v2";
import {
  INVOICE_REGIONS,
  INVOICE_REGION_CSS,
  invoiceRegionPlaceholder,
} from "../../edutrack_be/src/modules/invoice-template/constants/invoice-regions";

// Use the actual Phase 1 seed without importing Nest/Mongoose into the browser tests.
const source = readFileSync(
  path.resolve(
    "../edutrack_be/src/modules/invoice-template/constants/legacy-invoice-template.ts",
  ),
  "utf8",
);
const html = source.match(/SYSTEM_INVOICE_TEMPLATE_HTML = `([\s\S]*?)`;/)![1];
const css = source.match(/SYSTEM_INVOICE_TEMPLATE_CSS = `([\s\S]*?)`;/)![1];
const system = {
  id: "SYSTEM_INVOICE_V1",
  name: "SYSTEM_INVOICE_V1",
  type: "SYSTEM",
  version: 1,
  basedOnVersion: "system-v1",
  editorData: {
    assets: [],
    pages: [{ id: "invoice", component: html, styles: css }],
    styles: [],
  },
  html,
  css,
  isDefault: true,
  status: "ACTIVE",
  readonly: true,
};

type Template = Omit<typeof system, "editorData"> & {
  editorData: Record<string, unknown>;
  createdAt?: string;
};

function renderReceiptReference(template?: { html: string; css: string }) {
  const output = execFileSync(
    process.execPath,
    [
      "-r",
      "ts-node/register/transpile-only",
      "-e",
      `const { readFileSync } = require('node:fs');
       const { ReceiptTemplateService } = require('./src/modules/receipts/receipt-template.service');
       const { PREVIEW_RECEIPT } = require('./src/modules/invoice-template/constants/preview-receipt');
       const { SYSTEM_V2_HTML: html, SYSTEM_V2_CSS: css } = require('./src/modules/invoice-template/constants/system-invoice-v2');
       const renderer = new ReceiptTemplateService();
       const template = JSON.parse(readFileSync(0, 'utf8')) || { html, css };
       process.stdout.write(JSON.stringify({ original: renderer.render(PREVIEW_RECEIPT), preview: renderer.renderCustomTemplate(PREVIEW_RECEIPT, template) }));`,
    ],
    {
      cwd: path.resolve("../edutrack_be"),
      input: JSON.stringify(template ?? null),
      encoding: "utf8",
      env: {
        ...process.env,
        TS_NODE_COMPILER_OPTIONS: JSON.stringify({
          module: "commonjs",
          moduleResolution: "node",
          resolvePackageJsonExports: false,
        }),
      },
    },
  );
  return JSON.parse(output) as { original: string; preview: string };
}

const systemV2: Template = {
  ...system,
  id: "SYSTEM_INVOICE_V2",
  version: 2,
  basedOnVersion: "system-v2",
  html: SYSTEM_V2_HTML,
  css: SYSTEM_V2_CSS,
  editorData: {
    assets: [],
    pages: [
      { id: "invoice-v2", component: SYSTEM_V2_HTML, styles: SYSTEM_V2_CSS },
    ],
    styles: [],
  },
};

async function mockApi(
  page: Page,
  options: {
    failSave?: boolean;
    failLoad?: boolean;
    template?: Template;
    versions?: Template[];
    failUpload?: boolean;
    realPreview?: boolean;
  } = {},
) {
  let current: Template = options.template ?? structuredClone(system);
  let versions = options.versions ?? [current];
  const saves: { method: string; payload: Record<string, unknown> }[] = [];
  const uploads: string[] = [];
  const image = {
    id: "6a9c3a55b1285e2c15bbc900",
    name: "Logo hóa đơn.png",
    url: "https://res.cloudinary.com/test/image/upload/invoice-logo.png",
    size: 1024,
    width: 300,
    height: 300,
    mimeType: "image/png",
    createdAt: "2026-09-13T00:00:00Z",
  };
  let imageRows = [image];
  await page.route("https://fonts.googleapis.com/**", (route) =>
    route.fulfill({ body: "", contentType: "text/css" }),
  );
  await page.route("https://res.cloudinary.com/test/**", (route) =>
    route.fulfill({
      body: readFileSync(path.resolve("public/sticker.png")),
      contentType: "image/png",
    }),
  );
  const user = {
    id: "test-teacher",
    fullName: "Giáo viên kiểm thử",
    email: "test@example.com",
    role: "teacher",
    isEmailVerified: true,
  };
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === "/api/auth/refresh") {
      await route.fulfill({ json: { accessToken: "test-only-token", user } });
    } else if (url.pathname === "/api/auth/me") {
      await route.fulfill({ json: user });
    } else if (url.pathname === "/api/invoice-templates/regions") {
      await route.fulfill({
        json: {
          regions: INVOICE_REGIONS.map((item) => ({
            ...item,
            html: invoiceRegionPlaceholder(item.key),
          })),
          css: INVOICE_REGION_CSS,
        },
      });
    } else if (url.pathname === "/api/invoice-templates/preview") {
      await route.fulfill({
        json: {
          html: options.realPreview
            ? renderReceiptReference(route.request().postDataJSON()).preview
            : "<!doctype html><html><body><h1>Bản xem trước dữ liệu mẫu</h1></body></html>",
        },
      });
    } else if (url.pathname.startsWith("/api/invoice-images")) {
      if (route.request().method() === "GET")
        await route.fulfill({ json: { images: imageRows, nextCursor: null } });
      else if (route.request().method() === "DELETE") {
        imageRows = [];
        await route.fulfill({ json: { id: image.id, archived: true } });
      } else {
        uploads.push(route.request().postData() ?? "");
        if (options.failUpload) {
          options.failUpload = false;
          await route.fulfill({
            status: 503,
            json: { message: "Cloudinary tạm thời lỗi." },
          });
        } else await route.fulfill({ json: { ...image, name: "sticker.png" } });
      }
    } else if (
      url.pathname === "/api/invoice-templates" &&
      route.request().method() === "GET"
    ) {
      if (options.failLoad) {
        await route.fulfill({
          status: 503,
          json: { message: "Không tải được mẫu kiểm thử." },
        });
      } else await route.fulfill({ json: versions });
    } else if (url.pathname.startsWith("/api/invoice-templates")) {
      const payload = route.request().postDataJSON() as Record<string, unknown>;
      saves.push({ method: route.request().method(), payload });
      if (options.failSave) {
        options.failSave = false;
        await route.fulfill({
          status: 503,
          json: { message: "Lỗi lưu kiểm thử." },
        });
      } else {
        const create = route.request().method() === "POST";
        const selected =
          versions.find((item) => url.pathname.endsWith(item.id)) ?? current;
        current = {
          ...selected,
          ...payload,
          id: create
            ? `6a9c3a55b1285e2c15bbc${String(799 + saves.length).padStart(3, "0")}`
            : selected.id,
          type: "CUSTOM",
          readonly: false,
          version: create
            ? Math.max(
                0,
                ...versions
                  .filter((item) => item.type === "CUSTOM")
                  .map((item) => item.version),
              ) + 1
            : selected.version,
          createdAt: create ? new Date().toISOString() : selected.createdAt,
        };
        versions = [
          ...versions.filter((item) => item.id !== current.id),
          current,
        ];
        await route.fulfill({ json: current });
      }
    } else
      await route.fulfill({
        status: 404,
        json: { message: "Mock route not found" },
      });
  });
  return { saves, current: () => current, versions: () => versions, uploads };
}

async function saveTemplate(page: Page, mode: "new" | "overwrite" = "new") {
  await page.getByRole("button", { name: "Lưu mẫu", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Lưu mẫu hóa đơn" });
  if (mode === "overwrite")
    await dialog.getByRole("radio", { name: /Lưu đè/ }).check();
  await dialog
    .getByRole("button", {
      name: mode === "new" ? "Lưu phiên bản mới" : "Xác nhận lưu đè",
      exact: true,
    })
    .click();
}

async function openDesigner(page: Page) {
  const response = await page.goto("/settings/invoice-template");
  expect(response?.status()).toBe(200);
  await expect(
    page.getByRole("button", { name: "Văn bản", exact: true }),
  ).toBeEnabled();
  await expect(page.getByText("Đang mở mẫu hóa đơn...")).toHaveCount(0);
  return page.frameLocator(".gjs-frame");
}

test("canvas-only scrolling, Ctrl-wheel zoom and collapsible panels keep the page fixed", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await mockApi(page);
  const frame = await openDesigner(page);
  const paper = frame.locator(".edutrack-invoice-page");
  const canvas = page.getByTestId("invoice-canvas");
  const before = (await paper.boundingBox())!;
  const toolbarBefore = await page
    .getByRole("button", { name: "Lưu mẫu", exact: true })
    .boundingBox();
  await page.mouse.move(before.x + 180, before.y + 180);
  await page.mouse.wheel(0, 250);
  await expect
    .poll(async () => (await paper.boundingBox())!.y)
    .toBeLessThan(before.y - 100);
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
  expect(
    await page
      .getByRole("button", { name: "Lưu mẫu", exact: true })
      .boundingBox(),
  ).toEqual(toolbarBefore);
  await page.getByRole("button", { name: "Vừa chiều rộng" }).click();
  const zoom = page.getByRole("combobox", { name: "Thu phóng" });
  const initialZoom = Number(await zoom.inputValue());
  const paperBox = (await paper.boundingBox())!;
  await page.mouse.move(paperBox.x + 120, paperBox.y + 180);
  await page.keyboard.down("Control");
  await page.mouse.wheel(0, -100);
  await page.keyboard.up("Control");
  await expect
    .poll(async () => Number(await zoom.inputValue()))
    .toBeGreaterThan(initialZoom);
  const enlarged = Number(await zoom.inputValue());
  await page.keyboard.down("Control");
  await page.mouse.wheel(0, 160);
  await page.keyboard.up("Control");
  await expect
    .poll(async () => Number(await zoom.inputValue()))
    .toBeLessThan(enlarged);
  expect(
    await paper.evaluate((element) => (element as HTMLElement).offsetWidth),
  ).toBe(794);
  expect(await page.evaluate(() => window.visualViewport?.scale)).toBe(1);
  const oldWidth = (await canvas.boundingBox())!.width;
  await page
    .getByRole("button", { name: "Bảng thành phần", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Bảng thuộc tính", exact: true })
    .click();
  await expect
    .poll(async () => (await canvas.boundingBox())!.width)
    .toBeGreaterThan(oldWidth + 400);
  await page.getByRole("button", { name: "Ẩn các bảng công cụ" }).click();
  await expect(
    page.getByRole("button", { name: "Lưu mẫu", exact: true }),
  ).toBeHidden();
  await page.getByRole("button", { name: "Hiện các bảng công cụ" }).click();
  await expect(
    page.getByRole("button", { name: "Lưu mẫu", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Bảng thành phần", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Bảng thuộc tính", exact: true })
    .click();
  await page.getByRole("button", { name: "Vừa chiều rộng" }).click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollHeight <= innerHeight,
    ),
  ).toBe(true);
  await page.screenshot({
    path: testInfo.outputPath("workspace.png"),
    fullPage: true,
  });
});

test("latest version opens by default; save-new preserves old versions and overwrite targets the selected version", async ({
  page,
}, testInfo) => {
  const older: Template = {
    ...structuredClone(system),
    id: "6a9c3a55b1285e2c15bbc701",
    type: "CUSTOM",
    readonly: false,
    name: "Mẫu cũ",
    version: 1,
    createdAt: "2026-09-01T00:00:00Z",
  };
  const latest: Template = {
    ...structuredClone(older),
    id: "6a9c3a55b1285e2c15bbc702",
    name: "Mẫu mới nhất",
    version: 2,
    isDefault: false,
    createdAt: "2026-09-02T00:00:00Z",
  };
  const api = await mockApi(page, { versions: [older, system, latest] });
  let nativeDialogs = 0;
  page.on("dialog", async (dialog) => {
    nativeDialogs++;
    await dialog.dismiss();
  });
  await openDesigner(page);
  const versions = page.getByRole("combobox", { name: "Phiên bản mẫu" });
  const name = page.getByRole("textbox", { name: "Tên mẫu hóa đơn" });
  await expect(versions).toContainText("V2 · Mẫu mới nhất (Mới nhất)");
  await versions.click();
  await page.getByRole("option", { name: "V1 · Mẫu cũ", exact: true }).click();
  await expect(name).toHaveValue(older.name);
  await name.fill("Bản cũ đã chỉnh");
  await versions.click();
  await page
    .getByRole("option", { name: "V2 · Mẫu mới nhất (Mới nhất)", exact: true })
    .click();
  const discard = page.getByRole("dialog", { name: "Thay đổi chưa lưu" });
  await expect(discard).toBeVisible();
  await discard.getByRole("button", { name: "Tiếp tục chỉnh sửa" }).click();
  await expect(name).toHaveValue("Bản cũ đã chỉnh");
  await saveTemplate(page);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const newVersion = api.current();
  expect(newVersion.version).toBe(3);
  expect(api.versions().find((item) => item.id === older.id)?.name).toBe(
    "Mẫu cũ",
  );
  await page.reload();
  await expect(versions).toContainText(`V${newVersion.version} · ${newVersion.name} (Mới nhất)`);
  await versions.click();
  await page.getByRole("option", { name: "V1 · Mẫu cũ", exact: true }).click();
  await name.fill("Bản cũ cập nhật");
  await page.getByRole("button", { name: "Lưu mẫu", exact: true }).click();
  const saveDialog = page.getByRole("dialog", { name: "Lưu mẫu hóa đơn" });
  await saveDialog
    .getByRole("radio", { name: "Lưu đè V1", exact: true })
    .check();
  await page.screenshot({
    path: testInfo.outputPath("save-dialog.png"),
    fullPage: true,
  });
  await saveDialog.getByRole("button", { name: "Xác nhận lưu đè" }).click();
  await expect(saveDialog).toHaveCount(0);
  expect(api.current().id).toBe(older.id);
  expect(api.current().version).toBe(1);
  expect(api.versions().filter((item) => item.type === "CUSTOM")).toHaveLength(
    3,
  );
  await page.reload();
  await expect(versions).toContainText(`V${newVersion.version} · ${newVersion.name} (Mới nhất)`);
  await versions.click();
  await page.getByRole("option", { name: "Mẫu hệ thống V2", exact: true }).click();
  await page.getByRole("button", { name: "Lưu mẫu", exact: true }).click();
  await expect(
    page.getByRole("radio", { name: /Lưu đè mẫu hệ thống/ }),
  ).toBeDisabled();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await name.fill("Bản chưa lưu");
  await page.getByRole("link", { name: "Quay lại", exact: true }).click();
  await expect(discard).toBeVisible();
  await discard
    .getByRole("button", { name: "Bỏ thay đổi", exact: true })
    .click();
  await expect(page).toHaveURL(/\/profile$/);
  expect(nativeDialogs).toBe(0);
});

test("A4 editor preserves styles, edits and project JSON through create, reload and update", async ({
  page,
}, testInfo) => {
  const api = await mockApi(page);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const frame = await openDesigner(page);
  const paper = frame.locator(".edutrack-invoice-page");
  await expect(paper).toHaveCSS("box-sizing", "border-box");
  const size = await paper.evaluate((element) => ({
    width: (element as HTMLElement).offsetWidth,
    height: (element as HTMLElement).offsetHeight,
  }));
  expect(size.width).toBe(794);
  expect(size.height).toBe(1123);
  await expect(frame.locator(".brand-line")).toHaveCSS("font-size", "18px");
  await expect(frame.locator(".info-box").first()).toHaveCSS(
    "border-top-style",
    "solid",
  );
  await page.getByRole("button", { name: "Văn bản", exact: true }).click();
  await expect(frame.getByText("Nội dung mới", { exact: true })).toHaveCount(1);
  await page
    .getByRole("spinbutton", { name: "Cỡ chữ", exact: true })
    .fill("24");
  await page.getByRole("button", { name: "In đậm", exact: true }).click();
  await expect(frame.getByText("Nội dung mới", { exact: true })).toHaveCSS(
    "font-size",
    "24px",
  );
  await page
    .getByRole("button", { name: "Nhân đôi thành phần", exact: true })
    .click();
  await expect(frame.getByText("Nội dung mới", { exact: true })).toHaveCount(2);
  await page
    .getByRole("button", { name: "Xóa thành phần", exact: true })
    .click();
  await expect(frame.getByText("Nội dung mới", { exact: true })).toHaveCount(1);
  await page.getByRole("button", { name: "Hoàn tác", exact: true }).click();
  await expect(frame.getByText("Nội dung mới", { exact: true })).toHaveCount(2);
  await page.getByRole("button", { name: "Làm lại", exact: true }).click();
  await expect(frame.getByText("Nội dung mới", { exact: true })).toHaveCount(1);
  await page.getByRole("button", { name: "Hình ảnh", exact: true }).click();
  await page
    .getByRole("button", { name: "Chèn Logo hóa đơn.png", exact: true })
    .click();
  await expect(frame.locator("img")).toHaveCount(1);
  await expect
    .poll(() =>
      frame
        .locator("img")
        .evaluate(
          (image: HTMLImageElement) => image.complete && image.naturalWidth > 0,
        ),
    )
    .toBe(true);
  await page.getByRole("button", { name: "Khung", exact: true }).click();
  await page.getByRole("button", { name: "Đường kẻ", exact: true }).click();
  await saveTemplate(page);
  await expect(
    page.getByText("Đã lưu mẫu hóa đơn.", { exact: true }),
  ).toBeVisible();
  expect(api.saves[0].method).toBe("POST");
  expect(api.saves[0].payload.editorData).toHaveProperty("pages");
  expect(api.saves[0].payload.html).toContain("data-edutrack-field");
  expect(api.saves[0].payload.html).toContain('id="');
  expect(api.saves[0].payload.css).toContain("24px");
  expect(api.saves[0].payload).not.toHaveProperty("teacherId");
  await page.reload();
  await expect(frame.getByText("Nội dung mới", { exact: true })).toHaveCSS(
    "font-size",
    "24px",
  );
  await expect(frame.locator(".brand-line")).toHaveCSS("font-size", "18px");
  await expect(frame.locator(".info-box").first()).toHaveCSS(
    "border-top-style",
    "solid",
  );
  await expect(frame.locator("h1")).toHaveText(
    "PHIẾU THEO DÕI HỌC TẬP & HỌC PHÍ",
  );
  await expect(frame.locator("img")).toHaveCount(1);
  await page
    .getByRole("textbox", { name: "Tên mẫu hóa đơn" })
    .fill("Mẫu học phí tháng 9");
  await saveTemplate(page, "overwrite");
  await expect(
    page.getByText("Đã lưu mẫu hóa đơn.", { exact: true }),
  ).toBeVisible();
  expect(api.saves[1].method).toBe("PATCH");
  await page.screenshot({
    path: testInfo.outputPath("desktop.png"),
    fullPage: true,
  });
  expect(errors).toEqual([]);
});

test("load/save failures can be retried without losing the draft", async ({
  page,
}) => {
  const options = { failLoad: true, failSave: true };
  const api = await mockApi(page, options);
  await page.goto("/settings/invoice-template");
  await expect(
    page.getByText("Không tải được mẫu kiểm thử.", { exact: true }),
  ).toBeVisible({ timeout: 15000 });
  options.failLoad = false;
  await page.getByRole("button", { name: "Thử lại", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Văn bản", exact: true }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Văn bản", exact: true }).click();
  await saveTemplate(page);
  await expect(page.getByText(/Không thể lưu mẫu/)).toBeVisible();
  await expect(
    page.frameLocator(".gjs-frame").getByText("Nội dung mới"),
  ).toBeVisible();
  await expect(
    page.getByText("Chưa lưu thay đổi", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Lưu phiên bản mới", exact: true })
    .click();
  await expect(
    page.getByText("Đã lưu mẫu hóa đơn.", { exact: true }),
  ).toBeVisible();
  expect(api.saves).toHaveLength(2);
});

test("pointer drag, resize, text editing and zoom operate on the A4 canvas", async ({
  page,
}) => {
  await mockApi(page);
  const frame = await openDesigner(page);
  const block = await page
    .getByRole("button", { name: "Văn bản", exact: true })
    .boundingBox();
  const paper = await frame.locator(".edutrack-invoice-page").boundingBox();
  await page.mouse.move(
    block!.x + block!.width / 2,
    block!.y + block!.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(paper!.x + 180, paper!.y + 140, { steps: 20 });
  await page.mouse.up();
  const text = frame.getByText("Nội dung mới", { exact: true });
  await expect(text).toHaveCount(1);
  await text.click();
  await page.getByRole("tab", { name: "Bố cục", exact: true }).click();
  await page
    .getByRole("combobox", { name: "Vị trí", exact: true })
    .selectOption("absolute");
  const before = await text.boundingBox();
  await expect
    .poll(
      async () =>
        (await page
          .getByRole("button", { name: "Di chuyển", exact: true })
          .boundingBox())!.y,
    )
    .toBeLessThan(before!.y);
  const move = await page
    .getByRole("button", { name: "Di chuyển", exact: true })
    .boundingBox();
  await page.mouse.move(move!.x + move!.width / 2, move!.y + move!.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    move!.x + move!.width / 2 + 60,
    move!.y + move!.height / 2 + 40,
    { steps: 12 },
  );
  await page.mouse.up();
  await expect
    .poll(async () => (await text.boundingBox())!.x)
    .toBeGreaterThan(before!.x + 20);
  await frame.locator(".brand-line").click();
  await text.click();
  const handle = page.locator(".gjs-resizer-h-br").last();
  await expect(handle).toBeVisible();
  const handleBox = await handle.boundingBox();
  const oldWidth = (await text.boundingBox())!.width;
  await page.mouse.move(
    handleBox!.x + handleBox!.width / 2,
    handleBox!.y + handleBox!.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(handleBox!.x + 70, handleBox!.y + 25, { steps: 12 });
  await page.mouse.up();
  await expect
    .poll(async () => (await text.boundingBox())!.width)
    .toBeGreaterThan(oldWidth + 30);
  await text.dblclick();
  await page.keyboard.press("ControlOrMeta+A");
  await page.keyboard.insertText("Nội dung đã chỉnh sửa");
  await page.getByRole("textbox", { name: "Tên mẫu hóa đơn" }).click();
  await expect(
    frame.getByText("Nội dung đã chỉnh sửa", { exact: true }),
  ).toBeVisible();
  await page.getByRole("combobox", { name: "Thu phóng" }).selectOption("50");
  await expect
    .poll(async () =>
      Math.round(
        (await frame.locator(".edutrack-invoice-page").boundingBox())!.width,
      ),
    )
    .toBe(397);
  expect(
    await frame
      .locator(".edutrack-invoice-page")
      .evaluate((element) => (element as HTMLElement).offsetWidth),
  ).toBe(794);
});

test("resizing images and frames at zoom keeps their position", async ({
  page,
}) => {
  await mockApi(page);
  const frame = await openDesigner(page);

  await page.getByRole("button", { name: "Khung", exact: true }).click();
  const addedFrame = frame.locator(".edutrack-invoice-page > div").last();
  await addedFrame.click();
  await page.getByRole("combobox", { name: "Thu phóng" }).selectOption("50");
  await addedFrame.click();
  const frameBefore = await addedFrame.boundingBox();
  const frameHandle = page.locator(".gjs-resizer-h-br").last();
  await expect(frameHandle).toBeVisible();
  const frameHandleBox = await frameHandle.boundingBox();
  await page.mouse.move(
    frameHandleBox!.x + frameHandleBox!.width / 2,
    frameHandleBox!.y + frameHandleBox!.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(frameHandleBox!.x + 70, frameHandleBox!.y + 38, {
    steps: 12,
  });
  await page.mouse.up();
  const frameAfter = await addedFrame.boundingBox();
  expect(Math.abs(frameAfter!.x - frameBefore!.x)).toBeLessThan(2);
  expect(Math.abs(frameAfter!.y - frameBefore!.y)).toBeLessThan(2);
  expect(frameAfter!.width).toBeGreaterThan(frameBefore!.width + 20);

  await page
    .getByRole("button", { name: "Thư viện ảnh hóa đơn", exact: true })
    .click();
  const dialog = page.getByRole("dialog", { name: "Thư viện ảnh hóa đơn" });
  await dialog
    .getByRole("button", { name: "Chèn Logo hóa đơn.png", exact: true })
    .click();
  const image = frame.locator("img[data-edutrack-image-id]");
  await expect(image).toHaveCount(1);
  await image.click();
  const imageBefore = await image.boundingBox();
  const imageHandle = page.locator(".gjs-resizer-h-br").last();
  await expect(imageHandle).toBeVisible();
  const imageHandleBox = await imageHandle.boundingBox();
  await page.mouse.move(
    imageHandleBox!.x + imageHandleBox!.width / 2,
    imageHandleBox!.y + imageHandleBox!.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(imageHandleBox!.x + 58, imageHandleBox!.y + 58, {
    steps: 12,
  });
  await page.mouse.up();
  const imageAfter = await image.boundingBox();
  expect(Math.abs(imageAfter!.x - imageBefore!.x)).toBeLessThan(2);
  expect(Math.abs(imageAfter!.y - imageBefore!.y)).toBeLessThan(2);
  expect(imageAfter!.width).toBeGreaterThan(imageBefore!.width + 20);
});

test("project scripts, unsafe attributes, frame heads and base64 images cannot run on load", async ({
  page,
}) => {
  const template = structuredClone(system) as Template;
  template.editorData = {
    assets: [{ src: "data:image/png;base64,AAAA" }],
    pages: [
      {
        frames: [
          {
            head: [
              {
                tag: "script",
                attributes: { src: "https://example.com/unsafe.js" },
              },
            ],
            component: {
              type: "wrapper",
              components: [
                {
                  tagName: "main",
                  classes: ["edutrack-invoice-page"],
                  components: [
                    {
                      type: "text",
                      content:
                        '<span onclick="alert(1)">Nội dung an toàn</span><script>alert(1)</script>',
                      script: "alert(1)",
                      attributes: { onmouseover: "alert(1)" },
                    },
                    { type: "image", src: "data:image/png;base64,AAAA" },
                    {
                      type: "iframe",
                      attributes: { src: "https://example.com" },
                    },
                  ],
                },
              ],
            },
          },
        ],
      },
    ],
    styles: [],
  };
  let dialogs = 0;
  page.on("dialog", async (dialog) => {
    dialogs += 1;
    await dialog.dismiss();
  });
  await mockApi(page, { template });
  const frame = await openDesigner(page);
  await expect(frame.getByText("Nội dung an toàn")).toBeVisible();
  await expect(
    frame.locator("script,iframe,[onclick],[onmouseover],img[src^='data:']"),
  ).toHaveCount(0);
  expect(dialogs).toBe(0);
});

test("mobile canvas remains visible and controls fit the viewport", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockApi(page);
  const frame = await openDesigner(page);
  await expect(frame.locator(".edutrack-invoice-page")).toBeVisible();
  const paperBox = await frame.locator(".edutrack-invoice-page").boundingBox();
  expect(paperBox!.x).toBeGreaterThanOrEqual(16);
  expect(paperBox!.x + paperBox!.width).toBeLessThanOrEqual(390);
  const undoBox = await page
    .getByRole("button", { name: "Hoàn tác", exact: true })
    .boundingBox();
  expect(undoBox!.x + undoBox!.width).toBeLessThanOrEqual(390);
  await page.getByRole("button", { name: "Văn bản", exact: true }).click();
  await page
    .getByRole("button", { name: "Bảng thuộc tính", exact: true })
    .click();
  await expect(
    page.getByRole("spinbutton", { name: "Cỡ chữ", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollHeight <= window.innerHeight,
    ),
  ).toBe(true);
  await page.screenshot({
    path: testInfo.outputPath("mobile.png"),
    fullPage: true,
  });
});

test("receipt V2 layout uses locked dynamic regions and survives save/reload", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 1100 });
  const api = await mockApi(page, { template: systemV2 });
  const frame = await openDesigner(page);
  await expect(frame.locator("[data-edutrack-region]")).toHaveCount(12);
  await expect(frame.locator(".sticker")).toHaveCount(2);
  await expect
    .poll(() =>
      frame
        .locator(".sticker")
        .first()
        .evaluate(
          (element: HTMLImageElement) =>
            element.complete && element.naturalWidth > 0,
        ),
    )
    .toBe(true);
  await expect(frame.locator(".brand-line")).toHaveCSS("font-size", "19px");
  await expect(frame.locator(".comment-grid")).toHaveCSS("display", "grid");
  await expect(frame.locator('[data-edutrack-region="sessions"]')).toHaveCSS(
    "outline-style",
    "dashed",
  );
  await expect(frame.getByText("Nguyễn Minh Anh", { exact: true })).toHaveCount(
    0,
  );
  const region = frame.locator('[data-edutrack-region="sessions"]');
  await region.locator(".region-symbol").first().dblclick();
  await expect(frame.locator('[contenteditable="true"]')).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Xóa thành phần", exact: true }),
  ).toBeEnabled();
  await page.getByRole("tab", { name: "Bố cục", exact: true }).click();
  await page
    .getByRole("spinbutton", { name: "Chiều cao", exact: true })
    .fill("150");
  await saveTemplate(page);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(api.saves[0].payload.html).toContain(
    'data-edutrack-region="sessions"',
  );
  expect(api.saves[0].payload.editorData).toBeTruthy();
  await page.reload();
  await expect(frame.locator("[data-edutrack-region]")).toHaveCount(12);
  await expect(frame.locator('[data-edutrack-region="sessions"]')).toHaveCSS(
    "height",
    "150px",
  );
  await expect(frame.locator('[data-edutrack-region="sessions"]')).toHaveCSS(
    "outline-style",
    "dashed",
  );
  await expect(frame.locator(".section-label").first()).toHaveCSS(
    "background-image",
    /linear-gradient/,
  );
  await expect(frame.locator(".price-note")).toHaveCSS("grid-column-end", "-1");
  const gridWidth = await frame
    .locator(".payment-grid")
    .evaluate((element) => (element as HTMLElement).offsetWidth);
  expect(
    await frame
      .locator(".price-note")
      .evaluate((element) => (element as HTMLElement).offsetWidth),
  ).toBe(gridWidth);
  const dismiss = page.getByRole("button", { name: "Đóng thông báo" });
  if (await dismiss.isVisible()) await dismiss.click();
  await page
    .getByRole("combobox", { name: "Thu phóng", exact: true })
    .selectOption("75");
  await page.screenshot({
    path: testInfo.outputPath("regions-desktop.png"),
    fullPage: true,
  });
  await page
    .getByRole("tab", { name: "Vùng dữ liệu động", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Vùng Nhận xét chung", exact: true })
    .click();
  await expect(frame.locator('[data-edutrack-region="comment"]')).toHaveCount(
    2,
  );
  await page
    .getByRole("button", { name: "Xem trước hóa đơn", exact: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Xem trước · Dữ liệu mẫu" }),
  ).toBeVisible();
  await expect(
    page
      .frameLocator('iframe[title="Bản xem trước hóa đơn"]')
      .getByRole("heading"),
  ).toHaveText("Bản xem trước dữ liệu mẫu");
});

test("designer preview preserves the hardcoded receipt layout after serialization", async ({
  page,
  context,
}, testInfo) => {
  await page.setViewportSize({ width: 1600, height: 1200 });
  await mockApi(page, { template: systemV2, realPreview: true });
  const frame = await openDesigner(page);
  await expect(frame.locator('[data-edutrack-region="sessions"] th')).toHaveCount(6);
  await expect(frame.locator(".lesson-index")).toHaveCount(4);
  await expect(frame.locator(".payment-line")).toHaveCount(4);
  await expect(frame.locator(".info-icon img")).toHaveCount(2);
  await saveTemplate(page);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.reload();
  await expect(frame.locator(".payment-line")).toHaveCount(4);
  await page.getByRole("combobox", { name: "Thu phóng", exact: true }).selectOption("75");
  await page.screenshot({ path: testInfo.outputPath("layout-editor.png"), fullPage: true });
  await page.getByRole("button", { name: "Xem trước hóa đơn", exact: true }).click();
  const preview = page.frameLocator('iframe[title="Bản xem trước hóa đơn"]');
  await expect(preview.locator(".page")).toBeVisible();
  await expect(preview.locator("[data-edutrack-region], .region-symbol")).toHaveCount(0);

  const reference = await context.newPage();
  await reference.route("https://fonts.googleapis.com/**", (route) =>
    route.fulfill({ body: "", contentType: "text/css" }),
  );
  await reference.setViewportSize({ width: 1000, height: 1250 });
  await reference.setContent(renderReceiptReference().original);
  const measure = (element: Element) => {
    const paper = element.closest(".page")!.getBoundingClientRect();
    const box = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    return {
      x: box.x - paper.x,
      y: box.y - paper.y,
      width: box.width,
      height: box.height,
      font: style.fontFamily,
      fontSize: style.fontSize,
      lineHeight: style.lineHeight,
      color: style.color,
      background: style.backgroundImage,
      border: style.borderTopWidth,
      radius: style.borderTopLeftRadius,
    };
  };
  const differences: string[] = [];
  for (const selector of [
    ".top", ".brand-line", "h1", ".info-strip", ".meta-line",
    ".section", ".section-label", "th", ".comment-grid", ".comment-body",
    ".payment-grid", ".payment-card", ".amount", ".payment-line", ".qr",
    ".price-note", ".footer", ".motto",
  ]) {
    const expected = reference.locator(selector);
    const actual = preview.locator(selector);
    await expect(actual).toHaveCount(await expected.count());
    for (let index = 0; index < await expected.count(); index += 1) {
      const before = await expected.nth(index).evaluate(measure);
      const after = await actual.nth(index).evaluate(measure);
      for (const key of ["x", "y", "width", "height"] as const)
        if (Math.abs(before[key] - after[key]) >= 1)
          differences.push(`${selector}[${index}].${key}: ${before[key]} != ${after[key]}`);
      for (const key of ["font", "fontSize", "lineHeight", "color", "background", "border", "radius"] as const)
        if (after[key] !== before[key])
          differences.push(`${selector}[${index}].${key}: ${before[key]} != ${after[key]}`);
    }
  }
  await reference.screenshot({ path: testInfo.outputPath("layout-hardcoded.png"), fullPage: true });
  await page.bringToFront();
  const renderedPage = await context.newPage();
  await renderedPage.route("https://fonts.googleapis.com/**", (route) =>
    route.fulfill({ body: "", contentType: "text/css" }),
  );
  await renderedPage.setViewportSize({ width: 1000, height: 1250 });
  await renderedPage.route("**/__invoice-reference", (route) =>
    route.fulfill({ body: "<!doctype html><html><body></body></html>", contentType: "text/html" }),
  );
  await renderedPage.goto("/__invoice-reference");
  await renderedPage.setContent(await preview.locator("html").evaluate((element) => element.outerHTML));
  await renderedPage.screenshot({ path: testInfo.outputPath("layout-preview.png"), fullPage: true });
  await renderedPage.close();
  await reference.close();
  expect(differences).toEqual([]);
});

test("image import previews locally, retries upload, stores image reference and can archive without removing canvas image", async ({
  page,
}, testInfo) => {
  const api = await mockApi(page, { template: systemV2, failUpload: true });
  const frame = await openDesigner(page);
  await page
    .getByRole("button", { name: "Thư viện ảnh hóa đơn", exact: true })
    .click();
  const dialog = page.getByRole("dialog", { name: "Thư viện ảnh hóa đơn" });
  await dialog.getByLabel("Chọn ảnh hóa đơn").setInputFiles({
    name: "bad.svg",
    mimeType: "image/svg+xml",
    buffer: Buffer.from("<svg/>"),
  });
  await expect(dialog.getByRole("alert")).toContainText("Chỉ nhận ảnh PNG");
  await dialog
    .getByLabel("Chọn ảnh hóa đơn")
    .setInputFiles(path.resolve("public/sticker.png"));
  await expect(dialog.getByAltText("Ảnh sắp tải lên")).toBeVisible();
  expect(api.uploads).toHaveLength(0);
  await page.screenshot({
    path: testInfo.outputPath("image-library.png"),
    fullPage: true,
  });
  await dialog
    .getByRole("button", { name: "Tải lên và chèn", exact: true })
    .click();
  await expect(dialog.getByRole("alert")).toHaveText(
    "Cloudinary tạm thời lỗi.",
  );
  await dialog
    .getByRole("button", { name: "Tải lên và chèn", exact: true })
    .click();
  await expect(dialog).toHaveCount(0);
  const imported = frame.locator("img[data-edutrack-image-id]");
  await expect(imported).toHaveCount(1);
  await expect(imported).toHaveAttribute("src", /res\.cloudinary\.com/);
  expect(api.uploads).toHaveLength(2);
  expect(api.uploads[1]).toContain('name="file"');
  await saveTemplate(page);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(api.saves[0].payload.html).toContain(
    'data-edutrack-image-id="6a9c3a55b1285e2c15bbc900"',
  );
  expect(JSON.stringify(api.saves[0].payload.editorData)).not.toContain(
    "blob:",
  );
  await page.reload();
  await expect(imported).toHaveCount(1);
  await page
    .getByRole("button", { name: "Thư viện ảnh hóa đơn", exact: true })
    .click();
  await dialog
    .getByRole("button", { name: "Ẩn Logo hóa đơn.png", exact: true })
    .click();
  await page
    .getByRole("dialog", { name: "Ẩn ảnh khỏi thư viện" })
    .getByRole("button", { name: "Ẩn ảnh", exact: true })
    .click();
  await expect(dialog.getByText("Chưa có ảnh hóa đơn")).toBeVisible();
  await dialog.getByRole("button", { name: "Đóng", exact: true }).click();
  await expect(imported).toHaveCount(1);
});

test("mobile region palette and image upload dialog fit without scrolling the page", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockApi(page, { template: systemV2 });
  const frame = await openDesigner(page);
  await expect(frame.locator("[data-edutrack-region]")).toHaveCount(12);
  await page
    .getByRole("tab", { name: "Vùng dữ liệu động", exact: true })
    .click();
  expect(
    (await page.getByTestId("invoice-canvas").boundingBox())!.height,
  ).toBeGreaterThan(250);
  await page.screenshot({
    path: testInfo.outputPath("regions-mobile.png"),
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Thư viện ảnh hóa đơn", exact: true })
    .click();
  const dialog = page.getByRole("dialog", { name: "Thư viện ảnh hóa đơn" });
  await dialog
    .getByLabel("Chọn ảnh hóa đơn")
    .setInputFiles(path.resolve("public/sticker.png"));
  const upload = await dialog
    .getByRole("button", { name: "Tải lên và chèn" })
    .boundingBox();
  expect(upload!.x).toBeGreaterThanOrEqual(0);
  expect(upload!.x + upload!.width).toBeLessThanOrEqual(390);
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <= innerWidth &&
        document.documentElement.scrollHeight <= innerHeight,
    ),
  ).toBe(true);
  await page.screenshot({
    path: testInfo.outputPath("images-mobile.png"),
    fullPage: true,
  });
});
