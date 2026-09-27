import { createECDH } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";

const publicKey = createECDH("prime256v1").generateKeys().toString("base64url");
const oldPublicKey = createECDH("prime256v1").generateKeys().toString("base64url");
const endpoint = "https://fcm.googleapis.com/fcm/send/test-device";
const user = { id: "teacher", fullName: "Push Test Teacher", email: "push@example.test", role: "teacher", isEmailVerified: true, hasPaymentQr: false };

async function setup(page: Page, options: { subscribed?: boolean; permission?: "granted" | "denied" | "default"; unsupported?: boolean; configured?: boolean; saveFails?: boolean; testFails?: boolean; rotated?: boolean; registrationFails?: boolean; serverCount?: number } = {}) {
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

  let serverSubscriptionCount = options.serverCount ?? (options.subscribed === false ? 0 : 1);
  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    const body = request.postData() ? request.postDataJSON() : null;
    requests.push({ method: request.method(), path, body });
    if (path === "/api/auth/refresh") return route.fulfill({ json: { accessToken: "push-test-token", user } });
    if (path === "/api/auth/me" || path === "/api/users/me") return route.fulfill({ json: user });
    if (path === "/api/users/banks") return route.fulfill({ json: [] });
    if (path === "/api/users/me/push-subscription/status") return route.fulfill({ json: { configured: options.configured !== false, publicKey, subscriptionCount: serverSubscriptionCount, configurationError: options.configured === false ? "Máy chủ chưa cấu hình VAPID." : undefined } });
    if (path === "/api/users/me/push-subscription" && request.method() === "POST") {
      if (!options.saveFails) serverSubscriptionCount = Math.max(1, serverSubscriptionCount);
      return route.fulfill({ status: options.saveFails ? 503 : 201, json: { message: options.saveFails ? "Không lưu được thiết bị." : "Đã đăng ký" } });
    }
    if (path === "/api/users/me/push-subscription" && request.method() === "DELETE") {
      serverSubscriptionCount = Math.max(0, serverSubscriptionCount - 1);
      return route.fulfill({ json: { success: true } });
    }
    if (path === "/api/users/me/push-subscription/test") return route.fulfill({ json: { attempted: 1, sent: options.testFails ? 0 : 1, failed: options.testFails ? 1 : 0, removed: options.testFails ? 1 : 0, configured: true, message: options.testFails ? "Thiết bị đã hết hạn đăng ký." : "Accepted" } });
    return route.fulfill({ json: { message: "OK" } });
  });
  await page.goto("/profile");
  await expect(page.getByRole("heading", { name: "Thông báo", exact: true })).toBeVisible();
  return requests;
}

test("reconciles a browser subscription with the current account and tests this device", async ({ page }) => {
  const requests = await setup(page);
  await expect(page.getByRole("switch", { name: "Bật thông báo" })).toBeChecked();
  await expect(page.getByText("Có 1 thiết bị đang nhận thông báo từ tài khoản này.")).toBeVisible();
  expect(requests.some((request) => request.path === "/api/users/me/push-subscription" && request.method === "POST")).toBe(true);
  await page.getByRole("button", { name: "Gửi thông báo thử" }).click();
  await expect(page.locator("p[role=status]").filter({ hasText: "Dịch vụ đẩy đã nhận" })).toBeVisible();
  expect(requests.find((request) => request.path.endsWith("/push-subscription/test"))?.body).toEqual({ endpoint });
});

test("asks for notification permission on the first app open and enables the device", async ({ page }) => {
  const requests = await setup(page, { permission: "default", subscribed: false });
  await expect(page.getByRole("switch", { name: "Bật thông báo" })).toBeChecked();
  await expect(page.getByText("Có 1 thiết bị đang nhận thông báo từ tài khoản này.")).toBeVisible();
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
