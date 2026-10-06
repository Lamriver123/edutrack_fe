"use client";

import { Bell, BellOff, BellRing, CheckCircle2, Info, LoaderCircle, RefreshCw, Send, ShieldAlert } from "lucide-react";
import { useDashboardSession } from "@/components/layout/dashboard-shell";
import { PushDeviceList } from "./push-device-list";

export function PushNotificationPanel() {
  const { push } = useDashboardSession();
  const {
    checkSubscription, currentDeviceId, devices, isLoading, isSubscribed,
    isSupported, permission, sendTest, statusMessage, subscribe,
    subscriptionCount, unsubscribe,
  } = push;
  const StatusIcon = isLoading ? LoaderCircle : isSubscribed ? CheckCircle2
    : permission === "denied" ? ShieldAlert : BellOff;

  return (
    <section className="overflow-hidden rounded-xl border border-[var(--border)] bg-white shadow-[var(--shadow-card)]">
      <div className="flex min-w-0 items-center justify-between gap-4 border-b border-[var(--border)] p-5 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-[var(--brand-50)] text-[var(--brand-600)]">
            <Bell aria-hidden="true" size={23} strokeWidth={1.8} />
          </span>
          <div className="min-w-0">
            <h2 className="text-[16px] font-extrabold text-[var(--brand-950)] sm:text-[17px]">Thông báo trên thiết bị</h2>
            <p className="mt-1 text-[12px] leading-5 text-[var(--neutral-500)] sm:text-[13px]">
              Nhắc lịch dạy và điểm danh trên các thiết bị của bạn
            </p>
          </div>
        </div>
        <button
          aria-checked={isSubscribed}
          className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-500)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${isSubscribed ? "bg-[var(--brand-500)]" : "bg-[var(--neutral-200)]"}`}
          disabled={isLoading || !isSupported || permission === "denied"}
          onClick={() => void (isSubscribed ? unsubscribe() : subscribe())}
          role="switch" type="button"
        >
          <span className="sr-only">Bật thông báo</span>
          <span className={`pointer-events-none block size-5 rounded-full bg-white shadow-sm transition-transform ${isSubscribed ? "translate-x-6" : "translate-x-1"}`} />
        </button>
      </div>
      <div className="space-y-5 p-5 sm:p-6">
        <div className={`flex items-start gap-3 rounded-lg border px-3.5 py-3 ${isSubscribed && !isLoading
          ? "border-[var(--success-border)] bg-[var(--success-bg)] text-[var(--success-text)]"
          : "border-[var(--border)] bg-[var(--neutral-50)] text-[var(--neutral-600)]"}`}>
          <StatusIcon aria-hidden="true" className={`mt-0.5 shrink-0 ${isLoading ? "animate-spin" : ""}`} size={17} />
          <div className="min-w-0">
            <p className="text-[12px] font-bold">
              {isLoading ? "Đang kiểm tra thiết bị" : isSubscribed ? "Thông báo đã bật trên thiết bị này" : "Thông báo chưa bật trên thiết bị này"}
            </p>
            <p className="mt-1 text-[12px] leading-5" role="status">{isLoading ? "Đang kiểm tra thông báo…" : statusMessage}</p>
          </div>
        </div>
        <div>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-[14px] font-bold text-[var(--neutral-900)]">Thiết bị nhận thông báo</h3>
              <p className="mt-1 text-[12px] leading-5 text-[var(--neutral-500)]">Mỗi trình duyệt đăng ký được hiển thị riêng.</p>
            </div>
            <span className="rounded-full border border-[var(--border)] bg-[var(--neutral-50)] px-3 py-1 text-[12px] font-semibold text-[var(--neutral-600)]">
              {subscriptionCount} thiết bị
            </span>
          </div>
          {devices.length > 0 ? (
            <PushDeviceList currentDeviceId={currentDeviceId} devices={devices} />
          ) : isLoading ? (
            <div aria-label="Đang tải thiết bị" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {[0, 1, 2].map((index) => (
                <div className="animate-pulse rounded-xl border border-[var(--border)] p-4" key={index}>
                  <div className="mb-4 size-11 rounded-xl bg-[var(--neutral-100)]" />
                  <div className="mb-2 h-3 w-2/3 rounded bg-[var(--neutral-100)]" />
                  <div className="h-3 w-1/2 rounded bg-[var(--neutral-100)]" />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center rounded-xl border border-dashed border-[var(--border-strong)] bg-[var(--neutral-50)] px-4 py-7 text-center">
              <span className="mb-3 grid size-11 place-items-center rounded-full bg-white text-[var(--neutral-400)] shadow-[var(--shadow-xs)]">
                <BellRing aria-hidden="true" size={21} />
              </span>
              <p className="text-[13px] font-semibold text-[var(--neutral-700)]">{subscriptionCount > 0 ? "Chưa tải được thông tin thiết bị" : "Chưa có thiết bị đăng ký"}</p>
              <p className="mt-1 max-w-sm text-[12px] leading-5 text-[var(--neutral-500)]">
                {subscriptionCount > 0 ? "Hãy kiểm tra lại để cập nhật danh sách." : "Bật công tắc bên trên để nhận lời nhắc trên thiết bị này."}
              </p>
            </div>
          )}
          {devices.some((device) => device.type === "unknown") ? (
            <p className="mt-3 flex items-start gap-2 text-[12px] leading-5 text-[var(--neutral-500)]">
              <Info aria-hidden="true" className="mt-0.5 shrink-0" size={14} />
              Tên thiết bị cũ sẽ được cập nhật khi bạn mở EduTrack trên thiết bị đó.
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2 border-t border-[var(--border)] pt-4">
          {isSupported ? (
            <button
              className="inline-flex items-center gap-2 rounded-lg bg-[var(--brand-600)] px-3.5 py-2.5 text-[12px] font-bold text-white transition-colors hover:bg-[var(--brand-700)] disabled:cursor-not-allowed disabled:opacity-40"
              disabled={isLoading || !isSubscribed} onClick={() => void sendTest()} type="button"
            >
              <Send aria-hidden="true" size={14} />Gửi thông báo thử
            </button>
          ) : null}
          <button
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] bg-white px-3.5 py-2.5 text-[12px] font-semibold text-[var(--neutral-600)] transition-colors hover:bg-[var(--neutral-50)] disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isLoading} onClick={() => void checkSubscription()} type="button"
          >
            <RefreshCw aria-hidden="true" className={isLoading ? "animate-spin" : ""} size={14} />Kiểm tra lại
          </button>
        </div>
      </div>
    </section>
  );
}
