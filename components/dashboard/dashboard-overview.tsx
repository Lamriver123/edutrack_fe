"use client";

import Link from "next/link";
import {
  Bell,
  BookOpenCheck,
  CalendarDays,
  ClipboardList,
  Plus,
  ShieldCheck,
  Users,
} from "lucide-react";
import { useDashboardUser } from "@/components/layout/dashboard-shell";

const overviewCards = [
  {
    label: "Tổng học sinh",
    value: "0",
    description: "Chưa có dữ liệu tổng hợp",
    icon: Users,
    tone: "brand",
  },
  {
    label: "Lớp đang quản lý",
    value: "0",
    description: "Tạo lớp mới ở mục Lớp học",
    icon: BookOpenCheck,
    tone: "accent",
  },
  {
    label: "Tiết học hôm nay",
    value: "0",
    description: "Chưa có thời khóa biểu",
    icon: CalendarDays,
    tone: "emerald",
  },
  {
    label: "Thông báo mới",
    value: "0",
    description: "Không có thông báo",
    icon: Bell,
    tone: "rose",
  },
] as const;

const todaySchedule = [
  {
    time: "07:30",
    title: "Toán học",
    className: "Lớp 6A",
    status: "Chờ cấu hình",
  },
  {
    time: "09:15",
    title: "Sinh hoạt lớp",
    className: "Lớp 7B",
    status: "Mẫu giao diện",
  },
  {
    time: "14:00",
    title: "Kiểm tra hồ sơ",
    className: "Khối 8",
    status: "Sắp có dữ liệu",
  },
] as const;

const activityItems = [
  {
    label: "Tạo lớp học đầu tiên",
    href: "/classes",
  },
  {
    label: "Thêm hoặc kiểm tra hồ sơ học sinh",
    href: "/students",
  },
  {
    label: "Thiết lập thời khóa biểu cho lớp",
    href: "/schedule",
  },
] as const;

type CardTone = (typeof overviewCards)[number]["tone"];

function getCardTone(tone: CardTone) {
  const tones: Record<
    CardTone,
    {
      border: string;
      iconWrap: string;
    }
  > = {
    brand: {
      iconWrap: "bg-[var(--brand-50)] text-[var(--brand-600)]",
      border: "hover:border-[var(--brand-200)]",
    },
    accent: {
      iconWrap: "bg-[var(--accent-100)] text-[var(--accent-600)]",
      border: "hover:border-[var(--accent-200)]",
    },
    emerald: {
      iconWrap: "bg-emerald-50 text-emerald-600",
      border: "hover:border-emerald-200",
    },
    rose: {
      iconWrap: "bg-rose-50 text-rose-600",
      border: "hover:border-rose-200",
    },
  };

  return tones[tone];
}

export function DashboardOverview() {
  const user = useDashboardUser();

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="grid gap-5">
        <WelcomePanel userName={user.fullName} />
        <OverviewCards />
        <StudentsPreview />
      </div>

      <aside className="grid content-start gap-5">
        <SchedulePanel />
        <ActivityPanel />
      </aside>
    </div>
  );
}

function WelcomePanel({ userName }: { userName: string }) {
  return (
    <section className="animate-slide-up rounded-lg border border-[var(--neutral-200)] bg-white p-5 shadow-[var(--shadow-card)] sm:p-6">
      <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-lg border border-[var(--brand-100)] bg-[var(--brand-50)] px-3 py-1.5 text-[13px] font-semibold text-[var(--brand-700)]">
            <ShieldCheck size={14} />
            Tài khoản đã xác thực
          </div>
          <h2 className="text-[28px] font-extrabold leading-tight text-[var(--brand-950)] sm:text-[32px]">
            Xin chào, {userName}
          </h2>
          <p className="mt-2 max-w-2xl text-[15px] leading-7 text-[var(--neutral-500)]">
            Đây là trung tâm tổng quan. Các nghiệp vụ chính đã được tách thành
            từng mục riêng để bạn quản lý rõ ràng hơn.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:flex">
          <Link
            className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-gradient-to-b from-[var(--brand-500)] to-[var(--brand-700)] px-5 text-[14px] font-bold text-white shadow-[var(--shadow-brand)] transition hover:from-[var(--brand-400)] hover:to-[var(--brand-600)]"
            href="/classes"
          >
            <Plus size={16} />
            Tạo lớp
          </Link>
          <Link
            className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-[var(--neutral-200)] bg-white px-5 text-[14px] font-bold text-[var(--neutral-700)] transition hover:border-[var(--brand-200)] hover:bg-[var(--brand-50)] hover:text-[var(--brand-700)]"
            href="/students"
          >
            <Users size={16} />
            Học sinh
          </Link>
        </div>
      </div>
    </section>
  );
}

function OverviewCards() {
  return (
    <section className="stagger grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {overviewCards.map(({ label, value, description, icon: Icon, tone }) => {
        const styles = getCardTone(tone);

        return (
          <article
            className={`rounded-lg border border-[var(--neutral-200)] bg-white p-5 shadow-[var(--shadow-card)] transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-lg)] ${styles.border}`}
            key={label}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[14px] font-semibold text-[var(--neutral-500)]">
                  {label}
                </p>
                <p className="mt-2 text-[30px] font-extrabold leading-none text-[var(--brand-950)]">
                  {value}
                </p>
              </div>
              <div
                className={`grid size-11 place-items-center rounded-lg ${styles.iconWrap}`}
              >
                <Icon size={19} />
              </div>
            </div>
            <p className="mt-4 text-[13px] font-medium text-[var(--neutral-500)]">
              {description}
            </p>
          </article>
        );
      })}
    </section>
  );
}

function StudentsPreview() {
  return (
    <section className="animate-slide-up rounded-lg border border-[var(--neutral-200)] bg-white shadow-[var(--shadow-card)]">
      <div className="flex flex-col gap-3 border-b border-[var(--neutral-100)] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <h2 className="text-[18px] font-bold text-[var(--brand-950)]">
            Dữ liệu gần đây
          </h2>
          <p className="mt-1 text-[14px] text-[var(--neutral-500)]">
            Khu vực này sẽ nối số liệu thật sau khi hoàn thiện module báo cáo.
          </p>
        </div>
        <Link
          className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-[var(--neutral-200)] bg-[var(--neutral-50)] px-4 text-[14px] font-semibold text-[var(--neutral-600)] transition hover:border-[var(--brand-200)] hover:bg-white hover:text-[var(--brand-700)]"
          href="/classes"
        >
          <ClipboardList size={15} />
          Xem lớp học
        </Link>
      </div>

      <div className="p-5 sm:p-6">
        <div className="grid gap-2">
          <div className="hidden grid-cols-[1.2fr_0.8fr_1fr_0.8fr] gap-3 rounded-lg bg-[var(--neutral-50)] px-4 py-3 text-[13px] font-bold text-[var(--neutral-500)] md:grid">
            <span>Họ tên</span>
            <span>Lớp</span>
            <span>Phụ huynh</span>
            <span>Trạng thái</span>
          </div>
          <div className="grid min-h-[190px] place-items-center rounded-lg border border-dashed border-[var(--neutral-300)] bg-[var(--neutral-50)]/60 px-4 text-center">
            <div>
              <div className="mx-auto grid size-12 place-items-center rounded-lg bg-[var(--brand-50)] text-[var(--brand-500)]">
                <Users size={21} />
              </div>
              <p className="mt-3 text-[15px] font-bold text-[var(--neutral-700)]">
                Chưa có dữ liệu tổng hợp
              </p>
              <p className="mt-1 text-[14px] text-[var(--neutral-500)]">
                Hãy bắt đầu từ mục Lớp học hoặc Học sinh.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function SchedulePanel() {
  return (
    <section className="rounded-lg border border-[var(--neutral-200)] bg-white p-5 shadow-[var(--shadow-card)]">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-[17px] font-bold text-[var(--brand-950)]">
            Thời khóa biểu hôm nay
          </h2>
          <p className="mt-1 text-[13px] text-[var(--neutral-500)]">
            Lịch mẫu cho giao diện MVP
          </p>
        </div>
        <div className="grid size-10 place-items-center rounded-lg bg-[var(--brand-50)] text-[var(--brand-600)]">
          <CalendarDays size={18} />
        </div>
      </div>

      <div className="grid gap-3">
        {todaySchedule.map(({ time, title, className, status }) => (
          <div
            className="grid grid-cols-[62px_1fr] gap-3 rounded-lg border border-[var(--neutral-200)] bg-[var(--neutral-50)] p-3.5"
            key={`${time}-${title}`}
          >
            <div className="rounded-lg bg-white px-2 py-2 text-center text-[13px] font-bold text-[var(--brand-700)]">
              {time}
            </div>
            <div className="min-w-0">
              <p className="truncate text-[14px] font-bold text-[var(--neutral-800)]">
                {title}
              </p>
              <p className="mt-1 truncate text-[13px] text-[var(--neutral-500)]">
                {className} | {status}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function ActivityPanel() {
  return (
    <section className="rounded-lg border border-[var(--neutral-200)] bg-white p-5 shadow-[var(--shadow-card)]">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-[17px] font-bold text-[var(--brand-950)]">
            Lối tắt công việc
          </h2>
          <p className="mt-1 text-[13px] text-[var(--neutral-500)]">
            Chuyển nhanh sang từng feature riêng
          </p>
        </div>
        <div className="grid size-10 place-items-center rounded-lg bg-[var(--accent-100)] text-[var(--accent-600)]">
          <ClipboardList size={18} />
        </div>
      </div>

      <div className="grid gap-3">
        {activityItems.map((item, index) => (
          <Link
            className="grid grid-cols-[36px_1fr] items-start gap-3 rounded-lg border border-[var(--neutral-200)] px-3.5 py-3.5 transition hover:border-[var(--brand-200)] hover:bg-[var(--brand-50)]"
            href={item.href}
            key={item.href}
          >
            <div className="grid size-9 place-items-center rounded-lg bg-[var(--brand-50)] text-[13px] font-bold text-[var(--brand-600)]">
              {index + 1}
            </div>
            <p className="text-[14px] font-medium leading-6 text-[var(--neutral-600)]">
              {item.label}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
