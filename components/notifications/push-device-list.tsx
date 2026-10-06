"use client";

import { Clock3, Globe2, Laptop, Monitor, Smartphone, Tablet } from "lucide-react";
import type { PushDevice } from "@/types/user";

const updatedAtFormatter = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit", month: "2-digit", year: "numeric",
  hour: "2-digit", minute: "2-digit", timeZone: "Asia/Ho_Chi_Minh",
});

function updatedAt(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? updatedAtFormatter.format(date) : null;
}

export function PushDeviceList({ devices, currentDeviceId }: {
  devices: PushDevice[];
  currentDeviceId: string | null;
}) {
  const ordered = [...devices].sort((a, b) =>
    Number(b.id === currentDeviceId) - Number(a.id === currentDeviceId),
  );
  return (
    <ul aria-label="Thiết bị đã đăng ký thông báo" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {ordered.map((device) => {
        const current = device.id === currentDeviceId;
        const Icon = device.type === "mobile" ? Smartphone
          : device.type === "tablet" ? Tablet
          : device.type === "desktop" ? Laptop : Monitor;
        const lastUpdated = updatedAt(device.lastSeenAt);
        const description = [device.browser, device.os].filter(Boolean).join(" · ");
        return (
          <li
            aria-label={`${device.name}${current ? " · Thiết bị này" : ""}`}
            className={`flex min-w-0 flex-col rounded-xl border p-4 transition-colors ${current
              ? "border-[var(--brand-200)] bg-[var(--brand-50)]/50"
              : "border-[var(--border)] bg-white"}`}
            key={device.id}
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <span className={`grid size-11 shrink-0 place-items-center rounded-xl ${current
                ? "bg-[var(--brand-100)] text-[var(--brand-600)]"
                : "bg-[var(--neutral-100)] text-[var(--neutral-500)]"}`}>
                <Icon aria-hidden="true" size={23} strokeWidth={1.7} />
              </span>
              {current ? (
                <span className="rounded-full bg-[var(--brand-100)] px-2.5 py-1 text-[11px] font-bold text-[var(--brand-700)]">Thiết bị này</span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--success-bg)] px-2.5 py-1 text-[11px] font-semibold text-[var(--success-text)]">
                  <span aria-hidden="true" className="size-1.5 rounded-full bg-emerald-500" />Đã đăng ký
                </span>
              )}
            </div>
            <h4 className="break-words text-[14px] font-bold text-[var(--neutral-900)]">{device.name}</h4>
            <p className="mt-1.5 flex min-w-0 items-start gap-1.5 text-[12px] leading-5 text-[var(--neutral-500)]">
              <Globe2 aria-hidden="true" className="mt-0.5 shrink-0" size={14} />
              <span className="break-words">{description || "Chưa có thông tin trình duyệt"}</span>
            </p>
            <div className="mt-auto pt-4">
              <p className="flex items-start gap-1.5 border-t border-[var(--border)] pt-3 text-[11px] leading-5 text-[var(--neutral-500)]">
                <Clock3 aria-hidden="true" className="mt-0.5 shrink-0" size={13} />
                <span>{lastUpdated ? `Cập nhật ${lastUpdated}` : "Chưa có thông tin cập nhật"}</span>
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
