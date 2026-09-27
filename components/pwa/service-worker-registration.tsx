"use client";

import { useEffect } from "react";

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!window.isSecureContext || !("serviceWorker" in navigator)) return;
    let disposed = false;
    let updateTimer: ReturnType<typeof setInterval> | undefined;
    navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" })
      .then((registration) => {
        if (disposed) return;
        updateTimer = setInterval(() => {
          void registration.update().catch(() => { /* Retry after connectivity returns. */ });
        }, 60 * 60 * 1000);
      })
      .catch((error) => console.error("[SW] Registration failed:", error));

    // The worker activates itself. Reloading on first claim can interrupt subscription saves.
    return () => {
      disposed = true;
      clearInterval(updateTimer);
    };
  }, []);

  return null;
}
