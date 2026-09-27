export function supportsPush() {
  return typeof window !== "undefined" && window.isSecureContext &&
    "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

export function pushSupportMessage() {
  if (!window.isSecureContext) return "Thông báo cần kết nối HTTPS (hoặc localhost khi phát triển).";
  return "Trình duyệt này chưa hỗ trợ thông báo. Trên iPhone/iPad, hãy thêm EduTrack vào Màn hình chính rồi mở ứng dụng từ đó (iOS 16.4 trở lên).";
}

export function decodePublicKey(value: string) {
  const base64 = value.trim().replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64 + "=".repeat((4 - base64.length % 4) % 4));
  const key = Uint8Array.from(raw, (character) => character.charCodeAt(0));
  if (key.length !== 65 || key[0] !== 4) throw new Error("Khóa thông báo trên máy chủ không hợp lệ.");
  return key;
}

export function subscriptionMatchesKey(subscription: PushSubscription, key: Uint8Array) {
  const previous = subscription.options.applicationServerKey;
  if (!previous) return false;
  const bytes = new Uint8Array(previous);
  return bytes.length === key.length && bytes.every((byte, index) => byte === key[index]);
}

export async function readyPushRegistration() {
  if (!supportsPush()) throw new Error(pushSupportMessage());
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      (async () => {
        await navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" });
        return navigator.serviceWorker.ready;
      })(),
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => reject(new Error("Chưa khởi động được dịch vụ thông báo. Hãy tải lại trang và thử lại.")), 12000);
      }),
    ]);
  } finally {
    clearTimeout(timeout);
  }
}
