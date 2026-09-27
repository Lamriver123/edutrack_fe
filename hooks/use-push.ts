"use client";

import { useState, useEffect, useCallback } from "react";
import { profileApi } from "@/lib/api/profile";
import { useNotice } from "@/components/ui/notice-provider";

export function usePushNotifications() {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { setNotice } = useNotice();

  useEffect(() => {
    const checkSubscription = async () => {
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        setIsSubscribed(!!subscription);
      } catch (error) {
        console.error("Error checking push subscription:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if ("serviceWorker" in navigator && "PushManager" in window) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsSupported(true);
      void checkSubscription();
    } else {
      setIsLoading(false);
    }
  }, []);

  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, "+")
      .replace(/_/g, "/");

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const subscribe = async () => {
    setIsLoading(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setNotice({ type: "error", text: "Bạn đã từ chối cấp quyền thông báo." });
        return false;
      }

      const registration = await navigator.serviceWorker.ready;
      
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
        throw new Error("VAPID public key is missing");
      }
      
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });

      await profileApi.subscribeToPush(subscription.toJSON());
      
      setIsSubscribed(true);
      setNotice({ type: "success", text: "Đã bật thông báo thành công!" });
      return true;
    } catch (error) {
      console.error("Error subscribing to push:", error);
      setNotice({ type: "error", text: "Không thể bật thông báo. Vui lòng thử lại sau." });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const unsubscribe = async () => {
    setIsLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        const endpoint = subscription.endpoint;
        await subscription.unsubscribe();
        await profileApi.unsubscribeFromPush(endpoint);
      }
      
      setIsSubscribed(false);
      setNotice({ type: "success", text: "Đã tắt thông báo." });
      return true;
    } catch (error) {
      console.error("Error unsubscribing from push:", error);
      setNotice({ type: "error", text: "Không thể tắt thông báo. Vui lòng thử lại sau." });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isSupported,
    isSubscribed,
    isLoading,
    subscribe,
    unsubscribe,
  };
}
