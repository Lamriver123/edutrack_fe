"use client";

import { Bell } from "lucide-react";
import { useDashboardSession } from "@/components/layout/dashboard-shell";

export function PushNotificationPanel() {
  const { push } = useDashboardSession();
  const {
    checkSubscription,
    isLoading,
    isSubscribed,
    isSupported,
    permission,
    sendTest,
    statusMessage,
    subscribe,
    subscriptionCount,
    unsubscribe,
  } = push;

  return (
    <section className="flex flex-col gap-4 rounded-md border border-[var(--border)] bg-white p-4 shadow-[var(--shadow-card)]">
      <div className="flex min-w-0 items-center justify-between gap-3 border-b border-[var(--border)] pb-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-md bg-[var(--brand-50)] text-[var(--brand-600)]">
            <Bell size={20} />
          </span>
          <div className="min-w-0">
            <h2 className="text-[17px] font-extrabold text-[var(--brand-950)]">
              Thông báo trên thiết bị
            </h2>
            <p className="mt-1 text-[13px] font-semibold text-[var(--neutral-500)]">
              Nhận thông báo lịch dạy và điểm danh
            </p>
          </div>
        </div>

        <button
          aria-checked={isSubscribed}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:cursor-not-allowed disabled:opacity-50 ${isSubscribed ? "bg-[var(--brand-500)]" : "bg-gray-200"}`}
          disabled={isLoading || !isSupported || permission === "denied"}
          onClick={() =>
            void (isSubscribed ? unsubscribe() : subscribe())
          }
          role="switch"
          type="button"
        >
          <span className="sr-only">Bật thông báo</span>
          <span
            className={`pointer-events-none block size-5 rounded-full bg-white shadow-lg ring-0 transition-transform ${isSubscribed ? "translate-x-5" : "translate-x-0"}`}
          />
        </button>
      </div>

      <p
        className="text-[13px] font-medium leading-relaxed text-[var(--neutral-600)]"
        role="status"
      >
        {isLoading ? "Đang kiểm tra thông báo…" : statusMessage}
      </p>
      <div className="rounded-md border border-[var(--border)] bg-[var(--neutral-50)] px-3 py-2 text-[13px] font-semibold text-[var(--neutral-600)]">
        Có{" "}
        <span className="font-extrabold text-[var(--brand-700)]">
          {subscriptionCount}
        </span>{" "}
        thiết bị đang nhận thông báo từ tài khoản này.
      </div>
      {isSupported ? (
        <div className="flex flex-wrap gap-3">
          <button
            className="rounded-md bg-[var(--brand-50)] px-3 py-2 text-sm font-bold text-[var(--brand-700)] disabled:opacity-50"
            disabled={isLoading || !isSubscribed}
            onClick={() => void sendTest()}
            type="button"
          >
            Gửi thông báo thử
          </button>
          <button
            className="rounded-md border border-[var(--border)] px-3 py-2 text-sm font-semibold disabled:opacity-50"
            disabled={isLoading}
            onClick={() => void checkSubscription()}
            type="button"
          >
            Kiểm tra lại
          </button>
        </div>
      ) : null}
    </section>
  );
}
