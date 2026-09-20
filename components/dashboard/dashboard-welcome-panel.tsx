"use client";

import Link from "next/link";
import {
  ArrowRight,
  Bell,
  CalendarDays,
  Loader2,
  Plus,
  RefreshCw,
  ShieldCheck,
  WalletCards,
} from "lucide-react";
import { formatMoney } from "@/components/classes/classroom-utils";

export function WelcomePanel({
  error,
  isLoading,
  onReload,
  pendingAmount,
  pendingPaymentCount,
  unreadNotificationCount,
  userName,
}: {
  error: string;
  isLoading: boolean;
  onReload: () => void;
  pendingAmount: number;
  pendingPaymentCount: number;
  unreadNotificationCount: number;
  userName: string;
}) {
  const userInitials = userName
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((part) => part.charAt(0))
    .join("")
    .toLocaleUpperCase("vi-VN");

  return (
    <section className="animate-slide-up overflow-hidden rounded-md border border-[#e5e7f0] bg-white shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
      <div className="relative grid gap-5 bg-[#fbfbff] px-4 py-5 sm:px-5 sm:py-6 lg:px-6 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
        <span
          aria-hidden="true"
          className="absolute inset-y-5 left-0 w-1 rounded-r-full bg-[var(--brand-600)]"
        />

        <div className="flex min-w-0 items-start gap-3.5 sm:gap-4">
          <div
            aria-hidden="true"
            className="relative hidden size-12 shrink-0 place-items-center rounded-md border border-[var(--brand-100)] bg-[var(--brand-600)] text-[15px] font-extrabold text-white shadow-[0_6px_16px_rgba(79,70,229,0.16)] sm:grid"
          >
            {userInitials || "GV"}
            <span className="absolute -bottom-1 -right-1 grid size-5 place-items-center rounded-full border-2 border-white bg-emerald-500 text-white">
              <ShieldCheck size={10} strokeWidth={2.5} />
            </span>
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-[13px] font-extrabold text-emerald-700">
                <ShieldCheck size={12} />
                Tài khoản giáo viên đã xác thực
              </span>
              {unreadNotificationCount ? (
                <Link
                  className="inline-flex items-center gap-1.5 rounded-full border border-amber-100 bg-amber-50 px-2.5 py-1 text-[13px] font-bold text-amber-700 transition hover:border-amber-200 hover:bg-amber-100/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
                  href="/notifications"
                >
                  <Bell size={12} />
                  {unreadNotificationCount} thông báo mới
                </Link>
              ) : null}
            </div>

            <h2 className="mt-3 text-[24px] font-extrabold leading-tight text-[var(--brand-950)] sm:text-[27px]">
              Xin chào,{" "}
              <span className="text-[var(--brand-600)]">{userName}</span>
            </h2>
            <p className="mt-1.5 max-w-3xl text-[14px] leading-6 text-[var(--neutral-500)] sm:text-[15px]">
              Theo dõi lịch dạy trong ngày, tình hình thu học phí và quản lý hồ
              sơ học sinh hiệu quả.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap xl:min-w-[390px] xl:justify-end">
          <Link
            className="col-span-2 inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[var(--brand-600)] px-4 text-[14px] font-bold text-white shadow-[0_6px_14px_rgba(79,70,229,0.18)] transition hover:-translate-y-0.5 hover:bg-[var(--brand-700)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-300)] focus-visible:ring-offset-2 sm:col-span-1"
            href="/classes"
          >
            <Plus size={16} />
            Tạo lớp
          </Link>
          <Link
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-[var(--neutral-200)] bg-white px-4 text-[14px] font-bold text-[var(--neutral-700)] shadow-[0_1px_2px_rgba(15,23,42,0.03)] transition hover:border-[var(--brand-200)] hover:bg-[var(--brand-50)] hover:text-[var(--brand-700)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-200)]"
            href="/schedule"
          >
            <CalendarDays size={16} />
            Xem lịch
          </Link>
          <button
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-[var(--neutral-200)] bg-white px-4 text-[14px] font-bold text-[var(--neutral-700)] shadow-[0_1px_2px_rgba(15,23,42,0.03)] transition hover:border-[var(--brand-200)] hover:bg-[var(--brand-50)] hover:text-[var(--brand-700)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-200)] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isLoading}
            onClick={onReload}
            type="button"
          >
            {isLoading ? (
              <Loader2 className="animate-spin" size={16} />
            ) : (
              <RefreshCw size={16} />
            )}
            Tải lại
          </button>
        </div>
      </div>

      {pendingAmount > 0 ? (
        <div className="flex flex-col gap-3 border-t border-amber-100 bg-[#fffbeb] px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5 lg:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-md border border-amber-200 bg-white text-amber-600 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
              <WalletCards size={17} />
            </span>
            <div className="min-w-0">
              <p className="text-[12px] font-extrabold uppercase text-amber-700">
                Học phí cần theo dõi
              </p>
              <p className="mt-0.5 text-[13px] font-semibold text-amber-900 sm:text-[14px]">
                <strong className="text-[15px] font-extrabold sm:text-[16px]">
                  {formatMoney(pendingAmount)}
                </strong>{" "}
                đang chờ thanh toán
                {pendingPaymentCount > 0
                  ? ` từ ${pendingPaymentCount} hóa đơn`
                  : ""}
                .
              </p>
            </div>
          </div>
          <a
            className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 self-start rounded-md border border-amber-200 bg-white px-3 text-[13px] font-extrabold text-amber-800 transition hover:border-amber-300 hover:bg-amber-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 sm:self-auto"
            href="#pending-payments"
          >
            Xem danh sách
            <ArrowRight size={14} />
          </a>
        </div>
      ) : null}

      {error ? (
        <div className="border-t border-rose-100 bg-rose-50 px-4 py-2 text-[13px] font-semibold text-rose-700 sm:px-5">
          {error}
        </div>
      ) : null}
    </section>
  );
}
