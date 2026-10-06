import { createECDH } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import type { PushDevice } from "../types/user";

const publicKey = createECDH("prime256v1").generateKeys().toString("base64url");
const oldPublicKey = createECDH("prime256v1").generateKeys().toString("base64url");
const endpoint = "https://fcm.googleapis.com/fcm/send/test-device";
const user = { id: "teacher", fullName: "Push Test Teacher", email: "push@example.test", role: "teacher", isEmailVerified: true, hasPaymentQr: false };
const currentDevice: PushDevice = {
  id: "current-device", name: "Máy tính Windows", type: "desktop", browser: "Google Chrome", os: "Windows",
  registeredAt: "2026-10-01T08:00:00.000Z", lastSeenAt: "2026-10-06T08:00:00.000Z",
};
const deviceFixtures: PushDevice[] = [
  { id: "iphone", name: "iPhone", type: "mobile", browser: "Safari", os: "iOS", registeredAt: null, lastSeenAt: "2026-10-06T07:30:00.000Z" },
  currentDevice,
  { id: "ipad", name: "iPad", type: "tablet", browser: "Safari", os: "iPadOS", registeredAt: null, lastSeenAt: "2026-10-05T02:10:00.000Z" },
  { id: "legacy", name: "Thiết bị chưa xác định", type: "unknown", browser: null, os: null, registeredAt: null, lastSeenAt: null },
];

async function setup(page: Page, options: { expanded?: boolean; subscribed?: boolean; permission?: "granted" | "denied" | "default"; unsupported?: boolean; configured?: boolean; saveFails?: boolean; testFails?: boolean; rotated?: boolean; registrationFails?: boolean; devices?: PushDevice[] } = {}) {
  const requests: { method: string; path: string; body: Record<string, unknown> | null }[] = [];
  await page.addInitScript(({ options, publicKey, oldPublicKey, endpoint }) => {
    const debug = { subscribeCalls: 0, unsubscribeCalls: 0, permissionCalls: 0 };
    Object.assign(window, { pushDebug: debug });
    const bytes = (key: string) => Uint8Array.from(atob(key.replace(/-/g, "+").replace(/_/g, "/")), (char) => char.charCodeAt(0)).buffer;
    let current: object | null;
    const makeSubscription = (key: string) => ({
      endpoint,
      options: { applicationServerKey: bytes(key) },
      toJSON: () => ({ endpoint, keys: { p256dh: publicKey, auth: "test-auth" } }),
      unsubscribe: async () => { debug.unsubscribeCalls++; current = null; return true; },
    });
    current = options.subscribed === false ? null : makeSubscription(options.rotated ? oldPublicKey : publicKey);
    const registration = {
      pushManager: {
        getSubscription: async () => current,
        subscribe: async () => { debug.subscribeCalls++; current = makeSubscription(publicKey); return current; },
      },
      update: async () => {},
    };
    Object.defineProperty(navigator, "serviceWorker", { configurable: true, value: {
      register: async () => {
        if (options.registrationFails) throw new Error("Worker registration failed");
        return registration;
      },
      ready: Promise.resolve(registration),
      getRegistration: async () => registration,
    } });
    Object.defineProperty(window, "Notification", { configurable: true, value: {
      permission: options.permission ?? "granted",
      requestPermission: async () => { debug.permissionCalls++; return options.permission === "denied" ? "denied" : "granted"; },
    } });
    if (options.unsupported) delete (window as unknown as { PushManager?: unknown }).PushManager;
    else Object.defineProperty(window, "PushManager", { configurable: true, value: function PushManager() {} });
  }, { options, publicKey, oldPublicKey, endpoint });

  let serverDevices = options.devices ?? (options.subscribed === false ? [] : [currentDevice]);
  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    const body = request.postData() ? request.postDataJSON() : null;
    requests.push({ method: request.method(), path, body });
    if (path === "/api/auth/refresh") return route.fulfill({ json: { accessToken: "push-test-token", user } });
    if (path === "/api/auth/me" || path === "/api/users/me") return route.fulfill({ json: user });
    if (path === "/api/users/banks") return route.fulfill({ json: [] });
    if (path === "/api/users/me/push-subscription/status") return route.fulfill({ json: { configured: options.configured !== false, publicKey, subscriptionCount: serverDevices.length, devices: serverDevices, configurationError: options.configured === false ? "Máy chủ chưa cấu hình VAPID." : undefined } });
    if (path === "/api/users/me/push-subscription" && request.method() === "POST") {
      if (!options.saveFails) serverDevices = [...serverDevices.filter((device) => device.id !== currentDevice.id), currentDevice];
      return route.fulfill({ status: options.saveFails ? 503 : 201, json: { success: !options.saveFails, deviceId: currentDevice.id, message: options.saveFails ? "Không lưu được thiết bị." : "Đã đăng ký" } });
    }
    if (path === "/api/users/me/push-subscription" && request.method() === "DELETE") {
      serverDevices = serverDevices.filter((device) => device.id !== currentDevice.id);
      return route.fulfill({ json: { success: true } });
    }
    if (path === "/api/users/me/push-subscription/test") {
      if (options.testFails) serverDevices = serverDevices.filter((device) => device.id !== currentDevice.id);
      return route.fulfill({ json: { attempted: 1, sent: options.testFails ? 0 : 1, failed: options.testFails ? 1 : 0, removed: options.testFails ? 1 : 0, configured: true, message: options.testFails ? "Thiết bị đã hết hạn đăng ký." : "Accepted" } });
    }
    return route.fulfill({ json: { message: "OK" } });
  });
  await page.goto("/notifications");
  await expect(page.getByRole("heading", { level: 2, name: "Thông báo trên thiết bị", exact: true })).toBeVisible();
  if (options.expanded !== false) await page.getByRole("button", { name: "Mở rộng thông báo trên thiết bị" }).click();
  return requests;
}

test("reconciles a browser subscription with the current account and tests this device", async ({ page }) => {
  const requests = await setup(page);
  await expect(page.getByRole("switch", { name: "Bật thông báo" })).toBeChecked();
  await expect(page.getByText("1 thiết bị", { exact: true })).toBeVisible();
  expect(requests.some((request) => request.path === "/api/users/me/push-subscription" && request.method === "POST")).toBe(true);
  await page.getByRole("button", { name: "Gửi thông báo thử" }).click();
  await expect(page.locator("p[role=status]").filter({ hasText: "Dịch vụ đẩy đã nhận" })).toBeVisible();
  expect(requests.find((request) => request.path.endsWith("/push-subscription/test"))?.body).toEqual({ endpoint });
});

test("asks for notification permission on the first app open and enables the device", async ({ page }) => {
  const requests = await setup(page, { permission: "default", subscribed: false });
  await expect(page.getByRole("switch", { name: "Bật thông báo" })).toBeChecked();
  await expect(page.getByText("1 thiết bị", { exact: true })).toBeVisible();
  const debug = await page.evaluate(() => (window as unknown as { pushDebug: { permissionCalls: number; subscribeCalls: number } }).pushDebug);
  expect(debug.permissionCalls).toBe(1);
  expect(debug.subscribeCalls).toBe(1);
  expect(requests.some((request) => request.path === "/api/users/me/push-subscription" && request.method === "POST")).toBe(true);
});

test("failed provider delivery never reports success and disables expired subscription", async ({ page }) => {
  await setup(page, { testFails: true });
  await page.getByRole("button", { name: "Gửi thông báo thử" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Thiết bị đã hết hạn" })).toBeVisible();
  await expect(page.getByRole("switch", { name: "Bật thông báo" })).not.toBeChecked();
});

test("server configuration failure is visible instead of claiming push is enabled", async ({ page }) => {
  await setup(page, { configured: false });
  await expect(page.getByRole("status").filter({ hasText: "Máy chủ chưa cấu hình VAPID" })).toBeVisible();
  await expect(page.getByRole("switch", { name: "Bật thông báo" })).not.toBeChecked();
});

test("new subscription is rolled back if saving to the backend fails", async ({ page }) => {
  await setup(page, { subscribed: false, saveFails: true });
  await page.getByRole("switch", { name: "Bật thông báo" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Không lưu được thiết bị" })).toBeVisible();
  const debug = await page.evaluate(() => (window as unknown as { pushDebug: { subscribeCalls: number; unsubscribeCalls: number } }).pushDebug);
  expect(debug.subscribeCalls).toBe(1);
  expect(debug.unsubscribeCalls).toBe(1);
  await expect(page.getByRole("switch", { name: "Bật thông báo" })).not.toBeChecked();
});

test("VAPID rotation requires re-enabling and replaces the old browser subscription", async ({ page }) => {
  await setup(page, { rotated: true });
  await expect(page.getByRole("status").filter({ hasText: "Cấu hình thông báo đã thay đổi" })).toBeVisible();
  await page.getByRole("switch", { name: "Bật thông báo" }).click();
  await expect(page.getByRole("switch", { name: "Bật thông báo" })).toBeChecked();
  const debug = await page.evaluate(() => (window as unknown as { pushDebug: { subscribeCalls: number; unsubscribeCalls: number } }).pushDebug);
  expect(debug.subscribeCalls).toBe(1);
  expect(debug.unsubscribeCalls).toBe(1);
});

test("denied permission gives actionable guidance without requesting repeatedly", async ({ page }) => {
  await setup(page, { permission: "denied" });
  await expect(page.getByRole("status").filter({ hasText: "Quyền thông báo đang bị chặn" })).toBeVisible();
  await expect(page.getByRole("switch", { name: "Bật thông báo" })).toBeDisabled();
});

test("unsupported browser still shows guidance and can log out", async ({ page }) => {
  const requests = await setup(page, { unsupported: true });
  await expect(page.getByRole("status").filter({ hasText: "Trình duyệt này chưa hỗ trợ" })).toBeVisible();
  await page.goto("/profile");
  await page.getByRole("button", { name: "Đăng xuất", exact: true }).last().click();
  await expect(page).toHaveURL(/\/login$/);
  expect(requests.some((request) => request.path === "/api/auth/logout")).toBe(true);
});

test("service worker registration failure is reported without leaving an endless spinner", async ({ page }) => {
  await setup(page, { registrationFails: true });
  await expect(page.getByRole("status").filter({ hasText: "Worker registration failed" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Kiểm tra lại" })).toBeEnabled();
});

test("attendance notification deep link selects the attendance tab", async ({ page }) => {
  await setup(page);
  const classId = "6a9c3a55b1285e2c15bbc741";
  const classroom = { id: classId, teacherId: user.id, name: "Push Test Class", colorIndex: 0, regularPrice: 150000, makeupPrice: 100000, studentCount: 0, status: "active", latestFixedSchedule: null, students: [] };
  await page.route(`**/api/classes/${classId}`, (route) => route.fulfill({ json: classroom }));
  await page.route(`**/api/classes/${classId}/attendance-sheet`, (route) => route.fulfill({ json: { sessions: [], records: [] } }));
  await page.goto(`/classes/${classId}?tab=attendance`);
  await expect(page.getByRole("heading", { name: "Bảng điểm danh" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Điểm danh", exact: true })).toHaveAttribute("aria-pressed", "true");
});

test("shows device cards with this browser first and safe legacy fallback", async ({ page }, testInfo) => {
  await setup(page, { devices: deviceFixtures, expanded: false });
  await expect(page.getByRole("switch", { name: "Bật thông báo" })).toBeChecked();
  const expand = page.getByRole("button", { name: /^(Mở rộng|Thu gọn) thông báo trên thiết bị$/ });
  await expect(expand).toHaveAttribute("aria-expanded", "false");
  await expect(page.getByRole("heading", { name: "Thiết bị nhận thông báo" })).toBeHidden();
  await expect(page.getByRole("button", { name: "Gửi thông báo thử" })).toBeHidden();
  await page.screenshot({ path: testInfo.outputPath("push-collapsed-desktop.png"), fullPage: true });
  await expand.focus();
  await page.keyboard.press("Enter");
  await expect(expand).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByRole("heading", { name: "Thiết bị nhận thông báo" })).toBeVisible();
  const list = page.getByRole("list", { name: "Thiết bị đã đăng ký thông báo" });
  await expect(list.getByRole("listitem")).toHaveCount(4);
  await expect(list.getByRole("listitem").first()).toHaveAccessibleName("Máy tính Windows · Thiết bị này");
  await expect(list.getByText("Thiết bị này", { exact: true })).toHaveCount(1);
  await expect(list.getByText("Google Chrome · Windows")).toBeVisible();
  await expect(list.getByText("Safari · iOS", { exact: true })).toBeVisible();
  await expect(page.getByText("4 thiết bị", { exact: true })).toBeVisible();
  await expect(page.getByText("Tên thiết bị cũ sẽ được cập nhật", { exact: false })).toBeVisible();
  expect(await page.locator("body").innerText()).not.toContain(endpoint);
  await page.screenshot({ path: testInfo.outputPath("push-devices-desktop.png"), fullPage: true });
  const collapse = page.getByRole("button", { name: /^(Mở rộng|Thu gọn) thông báo trên thiết bị$/ });
  await collapse.focus();
  await page.keyboard.press("Space");
  await expect(collapse).toHaveAttribute("aria-expanded", "false");
  await expect(list).toBeHidden();
  await expect(collapse).toBeFocused();
  const detailsId = await collapse.getAttribute("aria-controls");
  expect(await page.evaluate((id) => document.getElementById(id!)?.inert, detailsId)).toBe(true);
  await page.reload();
  await expect(page.getByRole("button", { name: "Mở rộng thông báo trên thiết bị" })).toHaveAttribute("aria-expanded", "false");
});

test("device cards fit a phone and remain visible when this device is not subscribed", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await setup(page, { subscribed: false, devices: deviceFixtures, expanded: false });
  const expand = page.getByRole("button", { name: /^(Mở rộng|Thu gọn) thông báo trên thiết bị$/ });
  await expect(expand).toHaveAttribute("aria-expanded", "false");
  await expect(page.getByRole("button", { name: "Kiểm tra lại" })).toBeHidden();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("push-collapsed-mobile.png"), fullPage: true });
  await expand.click();
  await expect(page.getByRole("button", { name: "Kiểm tra lại" })).toBeEnabled();
  const list = page.getByRole("list", { name: "Thiết bị đã đăng ký thông báo" });
  await expect(list.getByRole("listitem")).toHaveCount(4);
  await expect(list.getByText("Thiết bị này", { exact: true })).toHaveCount(0);
  const cards = await list.getByRole("listitem").all();
  const [first, second] = await Promise.all([cards[0].boundingBox(), cards[1].boundingBox()]);
  expect(first?.x).toBe(second?.x);
  expect(second!.y).toBeGreaterThan(first!.y);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("push-devices-mobile.png"), fullPage: true });
  await page.getByRole("button", { name: "Thu gọn thông báo trên thiết bị" }).click();
  await expect(list).toBeHidden();
});

test("enabling and disabling this device updates the cards and empty state", async ({ page }) => {
  await setup(page, { subscribed: false, expanded: false });
  const expand = page.getByRole("button", { name: /^(Mở rộng|Thu gọn) thông báo trên thiết bị$/ });
  const toggle = page.getByRole("switch", { name: "Bật thông báo" });
  await expect(toggle).toBeEnabled();
  await toggle.click();
  await expect(toggle).toBeChecked();
  await expect(expand).toHaveAttribute("aria-expanded", "false");
  await expand.click();
  await expect(page.getByRole("list", { name: "Thiết bị đã đăng ký thông báo" }).getByRole("listitem")).toHaveCount(1);
  await expect(toggle).toBeEnabled();
  await page.getByRole("button", { name: "Thu gọn thông báo trên thiết bị" }).click();
  await toggle.click();
  await expect(toggle).not.toBeChecked();
  await expect(expand).toHaveAttribute("aria-expanded", "false");
  await expand.click();
  await expect(page.getByText("0 thiết bị", { exact: true })).toBeVisible();
  await expect(page.getByText("Chưa có thiết bị đăng ký", { exact: true })).toBeVisible();
});

test("unsupported browsers can still inspect and refresh account devices", async ({ page }) => {
  const requests = await setup(page, { unsupported: true, devices: deviceFixtures });
  await expect(page.getByRole("switch", { name: "Bật thông báo" })).toBeDisabled();
  await expect(page.getByRole("list", { name: "Thiết bị đã đăng ký thông báo" }).getByRole("listitem")).toHaveCount(4);
  const before = requests.filter((request) => request.path.endsWith("/push-subscription/status")).length;
  await page.getByRole("button", { name: "Kiểm tra lại" }).click();
  await expect.poll(() => requests.filter((request) => request.path.endsWith("/push-subscription/status")).length).toBeGreaterThan(before);
});
