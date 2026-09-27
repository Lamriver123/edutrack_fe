"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { profileApi } from "@/lib/api/profile";
import { useNotice } from "@/components/ui/notice-provider";
import { decodePublicKey, pushSupportMessage, readyPushRegistration, subscriptionMatchesKey, supportsPush } from "@/lib/push/browser";

const errorMessage = (error: unknown) => error instanceof Error ? error.message : "Không thể kết nối dịch vụ thông báo. Vui lòng thử lại.";

export function usePushNotifications(userId?: string) {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState("Đang kiểm tra thông báo…");
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const { setNotice } = useNotice();
  const loggingOut = useRef(false);

  const checkSubscription = useCallback(async () => {
    if (!userId || loggingOut.current) return;
    setIsLoading(true);
    const supported = supportsPush();
    setIsSupported(supported);
    try {
      if (!supported) {
        setStatusMessage(pushSupportMessage());
        return;
      }
      setPermission(Notification.permission);
      if (Notification.permission !== "granted") {
        setIsSubscribed(false);
        setStatusMessage(Notification.permission === "denied"
          ? "Quyền thông báo đang bị chặn. Hãy cho phép thông báo trong cài đặt của trình duyệt rồi kiểm tra lại."
          : "Bật thông báo để nhận nhắc lịch dạy và điểm danh trên thiết bị này.");
        return;
      }
      const registration = await readyPushRegistration();
      const subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        setIsSubscribed(false);
        setStatusMessage("Thiết bị này chưa đăng ký nhận thông báo. Hãy bật công tắc bên trên.");
        return;
      }
      const config = await profileApi.getPushStatus();
      if (!config.configured || !config.publicKey) throw new Error(config.configurationError || "Máy chủ chưa cấu hình thông báo.");
      if (!subscriptionMatchesKey(subscription, decodePublicKey(config.publicKey))) {
        setIsSubscribed(false);
        setStatusMessage("Cấu hình thông báo đã thay đổi. Hãy bật lại thông báo để cập nhật thiết bị này.");
        return;
      }
      if (loggingOut.current) return;
      // A browser subscription alone does not prove this account is registered in the database.
      await profileApi.subscribeToPush(subscription.toJSON());
      if (loggingOut.current) return;
      setIsSubscribed(true);
      setStatusMessage("Thiết bị đã được đăng ký với máy chủ. Bạn có thể gửi thông báo thử để kiểm tra.");
    } catch (error) {
      setIsSubscribed(false);
      setStatusMessage(errorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loggingOut.current = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void checkSubscription();
  }, [checkSubscription]);

  const subscribe = async () => {
    if (!supportsPush()) return false;
    setIsLoading(true);
    try {
      // Keep permission inside the user's click, before any network request (iOS).
      const granted = await Notification.requestPermission();
      setPermission(granted);
      if (granted !== "granted") throw new Error("Chưa được cấp quyền thông báo. Hãy kiểm tra quyền của trang trong trình duyệt.");
      const config = await profileApi.getPushStatus();
      if (!config.configured || !config.publicKey) throw new Error(config.configurationError || "Máy chủ chưa cấu hình thông báo.");
      const key = decodePublicKey(config.publicKey);
      const registration = await readyPushRegistration();
      let subscription = await registration.pushManager.getSubscription();
      if (subscription && !subscriptionMatchesKey(subscription, key)) {
        await profileApi.unsubscribeFromPush(subscription.endpoint);
        await subscription.unsubscribe();
        subscription = null;
      }
      const created = !subscription;
      subscription ??= await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
      try {
        await profileApi.subscribeToPush(subscription.toJSON());
      } catch (error) {
        if (created) await subscription.unsubscribe().catch(() => false);
        throw error;
      }
      setIsSubscribed(true);
      setStatusMessage("Thiết bị đã được đăng ký với máy chủ. Hãy gửi thông báo thử để kiểm tra.");
      setNotice({ type: "success", text: "Đã bật thông báo trên thiết bị này." });
      return true;
    } catch (error) {
      setIsSubscribed(false);
      setStatusMessage(errorMessage(error));
      setNotice({ type: "error", text: errorMessage(error) });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const unsubscribe = async ({ silent = false } = {}) => {
    if (silent) loggingOut.current = true;
    // No ready wait: unsupported/unregistered browsers must still be able to log out.
    if (!supportsPush()) return true;
    setIsLoading(true);
    try {
      const registration = await navigator.serviceWorker.getRegistration("/");
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) {
        // Stop local delivery even if the backend is unavailable during logout.
        await subscription.unsubscribe();
        setIsSubscribed(false);
        await profileApi.unsubscribeFromPush(subscription.endpoint);
      }
      setIsSubscribed(false);
      setStatusMessage("Thông báo đã tắt trên thiết bị này.");
      if (!silent) setNotice({ type: "success", text: "Đã tắt thông báo." });
      return true;
    } catch (error) {
      setStatusMessage(errorMessage(error));
      if (!silent) setNotice({ type: "error", text: errorMessage(error) });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const sendTest = async () => {
    setIsLoading(true);
    try {
      const registration = await readyPushRegistration();
      const subscription = await registration.pushManager.getSubscription();
      if (!subscription) throw new Error("Hãy bật thông báo trước khi gửi thử.");
      const result = await profileApi.testPush(subscription.endpoint);
      if (result.removed > 0) setIsSubscribed(false);
      if (result.sent < 1) throw new Error(result.message || "Máy chủ chưa gửi được thông báo thử. Hãy kiểm tra lại đăng ký.");
      const message = "Dịch vụ đẩy đã nhận thông báo thử. Nếu thiết bị chưa hiển thị, hãy kiểm tra quyền thông báo và chế độ Không làm phiền.";
      setStatusMessage(message);
      setNotice({ type: "success", text: message });
    } catch (error) {
      setStatusMessage(errorMessage(error));
      setNotice({ type: "error", text: errorMessage(error) });
    } finally {
      setIsLoading(false);
    }
  };

  return { isSupported, isSubscribed, isLoading, permission, statusMessage, subscribe, unsubscribe, sendTest, checkSubscription };
}
