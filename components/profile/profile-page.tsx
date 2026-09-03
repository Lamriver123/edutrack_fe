"use client";

import { Mail, ShieldCheck, UserCircle } from "lucide-react";
import type { ReactNode } from "react";
import { useDashboardUser } from "@/components/layout/dashboard-shell";

export function ProfilePage() {
  const user = useDashboardUser();
  const userInitial = user.fullName?.charAt(0)?.toUpperCase() ?? "G";

  return (
    <section className="grid gap-5">

      <section className="rounded-lg border border-[var(--neutral-200)] bg-white p-5 shadow-[var(--shadow-card)]">
        <div className="grid gap-5 md:grid-cols-[220px_1fr]">
          <div className="grid place-items-center rounded-lg border border-[var(--neutral-200)] bg-[var(--neutral-50)] p-6 text-center">
            <div className="grid size-20 place-items-center rounded-lg bg-gradient-to-br from-[var(--brand-500)] to-[var(--brand-700)] text-[26px] font-extrabold text-white shadow-[var(--shadow-brand)]">
              {userInitial}
            </div>
            <h3 className="mt-4 text-[18px] font-extrabold text-[var(--brand-950)]">
              {user.fullName}
            </h3>
            <p className="mt-1 text-[14px] font-semibold text-[var(--neutral-500)]">
              Giáo viên
            </p>
          </div>

          <div className="grid content-start gap-3">
            <InfoRow
              icon={<UserCircle size={18} />}
              label="Họ tên"
              value={user.fullName}
            />
            <InfoRow icon={<Mail size={18} />} label="Email" value={user.email} />
            <InfoRow
              icon={<ShieldCheck size={18} />}
              label="Trạng thái"
              value={user.isEmailVerified ? "Đã xác thực email" : "Chưa xác thực"}
            />
          </div>
        </div>
      </section>
    </section>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="grid gap-2 rounded-lg border border-[var(--neutral-200)] bg-[var(--neutral-50)] p-4 sm:grid-cols-[180px_1fr] sm:items-center">
      <div className="flex items-center gap-2 text-[14px] font-bold text-[var(--neutral-500)]">
        {icon}
        {label}
      </div>
      <p className="truncate text-[15px] font-extrabold text-[var(--brand-950)]">
        {value}
      </p>
    </div>
  );
}
