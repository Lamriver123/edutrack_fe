"use client";

import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  Banknote,
  BookOpenCheck,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Eye,
  FileText,
  Loader2,
  ReceiptText,
  RefreshCw,
  TrendingUp,
  Users,
  WalletCards,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useDashboardUser } from "@/components/layout/dashboard-shell";
import {
  formatMoney,
  getClassColorTheme,
  getErrorMessage,
} from "@/components/classes/classroom-utils";
import { schoolApi } from "@/lib/api/school";
import { openPdfInNewTab } from "@/lib/files/open-pdf-in-new-tab";
import { useNotice } from "@/components/ui/notice-provider";
import { WelcomePanel } from "@/components/dashboard/dashboard-welcome-panel";
import { YearlyRevenueChart } from "@/components/dashboard/yearly-revenue-chart";
import type {
  DashboardOverviewData,
  DashboardPendingPayment,
  DashboardTodayLesson,
  PaymentStatus,
} from "@/types/school";

type StatTone = "brand" | "sky" | "emerald" | "amber" | "rose";

const statTones: Record<StatTone, { border: string; icon: string }> = {
  amber: {
    border: "hover:border-amber-200",
    icon: "bg-amber-50 text-amber-600",
  },
  brand: {
    border: "hover:border-[var(--brand-200)]",
    icon: "bg-[var(--brand-50)] text-[var(--brand-600)]",
  },
  emerald: {
    border: "hover:border-emerald-200",
    icon: "bg-emerald-50 text-emerald-600",
  },
  rose: {
    border: "hover:border-rose-200",
    icon: "bg-rose-50 text-rose-600",
  },
  sky: {
    border: "hover:border-sky-200",
    icon: "bg-sky-50 text-sky-600",
  },
};

export function DashboardOverview() {
  const user = useDashboardUser();
  const [overview, setOverview] = useState<DashboardOverviewData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [openingReceiptId, setOpeningReceiptId] = useState("");
  const { setNotice } = useNotice();

  const loadOverview = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const data = await schoolApi.getDashboardOverview();
      setOverview(data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadInitialOverview() {
      try {
        const data = await schoolApi.getDashboardOverview();

        if (isMounted) {
          setOverview(data);
          setError("");
        }
      } catch (err) {
        if (isMounted) {
          setError(getErrorMessage(err));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadInitialOverview();

    return () => {
      isMounted = false;
    };
  }, []);

  const pendingAmount = useMemo(
    () => overview?.revenue.overall.outstandingAmount ?? 0,
    [overview?.revenue.overall.outstandingAmount],
  );

  async function openReceiptPdf(receiptId: string) {
    setOpeningReceiptId(receiptId);
    try {
      await openPdfInNewTab(() => schoolApi.getReceiptDownload(receiptId));
    } catch (openError) {
      setNotice({ type: "error", text: getErrorMessage(openError) });
    } finally {
      setOpeningReceiptId("");
    }
  }

  if (isLoading && !overview) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="grid gap-4">
      <WelcomePanel
        error={error}
        isLoading={isLoading}
        onReload={() => void loadOverview()}
        pendingAmount={pendingAmount}
        pendingPaymentCount={overview?.stats.pendingPaymentCount ?? 0}
        unreadNotificationCount={overview?.stats.unreadNotificationCount ?? 0}
        userName={user.fullName}
      />

      {error && !overview ? (
        <ErrorPanel message={error} onRetry={() => void loadOverview()} />
      ) : null}

      {overview ? (
        <>
          <StatsGrid overview={overview} />

          <div className="grid items-stretch gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(300px,0.85fr)]">
            <div className="grid gap-4">
              <RevenuePanel revenue={overview.revenue} />
              <YearlyRevenueChart revenue={overview.revenue} />
            </div>
            <TodayLessonsPanel
              compact
              lessons={overview.todayLessons}
              today={overview.today}
            />
          </div>

          <PendingPaymentsPanel
            openingReceiptId={openingReceiptId}
            onViewPdf={(receiptId) => void openReceiptPdf(receiptId)}
            payments={overview.pendingPayments}
          />
        </>
      ) : null}
    </div>
  );
}

function StatsGrid({ overview }: { overview: DashboardOverviewData }) {
  const stats = [
    {
      description: "Lớp đang hoạt động",
      badge: ``,
      icon: BookOpenCheck,
      label: "Số lớp phụ trách",
      tone: "brand" as const,
      value: overview.stats.activeClassCount,
    },
    {
      description: "Hồ sơ học sinh đang học",
      badge: "Đang hoạt động",
      icon: Users,
      label: "Tổng học sinh",
      tone: "sky" as const,
      value: overview.stats.activeStudentCount,
    },
    {
      description: "Từ thời khóa biểu hôm nay",
      badge: ``,
      icon: CalendarDays,
      label: "Tiết học hôm nay",
      tone: "emerald" as const,
      value: overview.stats.todaySessionCount,
    },
    {
      description: "Hóa đơn đã tạo nhưng chưa thu đủ",
      badge: ``,
      icon: ReceiptText,
      label: "Chờ thanh toán",
      tone: "amber" as const,
      value: overview.stats.pendingPaymentCount,
    },
  ];

  return (
    <section className="stagger grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map(({ badge, description, icon: Icon, label, tone, value }) => {
        const styles = statTones[tone];

        return (
          <article
            className={`rounded-md border border-[#e8eaf2] bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.035)] transition hover:-translate-y-0.5 hover:border-[var(--brand-200)] hover:shadow-[var(--shadow-sm)] ${styles.border}`}
            key={label}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[13px] font-semibold text-[var(--neutral-500)]">
                    {label}
                  </p>
                  <span className="rounded-full bg-[var(--brand-50)] px-2 py-0.5 text-[12px] font-extrabold text-[var(--brand-600)]">
                    {badge}
                  </span>
                </div>
                <p className="mt-2 text-[28px] font-extrabold leading-none text-[var(--brand-950)]">
                  {value.toLocaleString("vi-VN")}
                </p>
              </div>
              <div
                className={`grid size-10 shrink-0 place-items-center rounded-lg ${styles.icon}`}
              >
                <Icon size={17} />
              </div>
            </div>
            <p
              className={`mt-3 text-[12px] font-semibold leading-5 ${tone === "amber" ? "text-amber-600" : "text-emerald-600"}`}
            >
              {tone === "amber" ? "○" : "↑"} {description}
            </p>
          </article>
        );
      })}
    </section>
  );
}

function TodayLessonsPanel({
  compact = false,
  lessons,
  today,
}: {
  compact?: boolean;
  lessons: DashboardTodayLesson[];
  today: string;
}) {
  return (
    <section className="h-full rounded-md border border-[#e8eaf2] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.035)]">
      <header className="border-b border-[var(--neutral-100)] p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="flex items-center gap-2 text-[12px] font-extrabold uppercase text-[var(--brand-600)]">
              <span className="size-2 rounded-sm bg-[var(--brand-500)]" />
              Hôm nay
            </p>
            <h2 className="mt-2 text-[18px] font-extrabold text-[var(--brand-950)]">
              Tiết học trong ngày
            </h2>
            <p className="mt-1 text-[13px] text-[var(--neutral-500)]">
              {formatDate(today)}
            </p>
          </div>
          <Link
            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md border border-[var(--neutral-200)] px-2.5 text-[13px] font-bold text-[var(--neutral-600)] transition hover:border-[var(--brand-200)] hover:text-[var(--brand-700)]"
            href="/schedule"
          >
            Lịch tuần
            <ArrowRight size={11} />
          </Link>
        </div>
      </header>

      <div className="grid gap-3 p-4 sm:p-5">
        {lessons.length ? (
          lessons.map((lesson) => (
            <TodayLessonItem
              compact={compact}
              key={lesson.id}
              lesson={lesson}
            />
          ))
        ) : (
          <EmptyState
            icon={<CalendarDays size={22} />}
            text="Hôm nay chưa có tiết học nào trong thời khóa biểu."
            title="Không có lịch dạy"
          />
        )}
      </div>
    </section>
  );
}

function TodayLessonItem({
  compact = false,
  lesson,
}: {
  compact?: boolean;
  lesson: DashboardTodayLesson;
}) {
  const theme = getClassColorTheme(lesson.colorHex);
  const timeText =
    lesson.startTime && lesson.endTime
      ? `${lesson.startTime} - ${lesson.endTime}`
      : "Chưa rõ giờ";

  if (compact) {
    return (
      <Link
        className="group grid gap-3 rounded-md border border-[var(--brand-100)] bg-[#fbfbff] p-3 transition hover:border-[var(--brand-300)] hover:shadow-[var(--shadow-sm)]"
        href={`/classes/${lesson.classId}`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-[12px] font-extrabold text-amber-700">
            <Clock3 size={11} />
            {timeText}
          </span>
          <StatusBadge
            label={lesson.statusLabel}
            tone={getLessonStatusTone(lesson.statusLabel)}
          />
        </div>

        <div className="flex items-center gap-2">
          <span
            className="size-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: theme.accent }}
          />
          <div className="min-w-0">
            <p className="truncate text-[14px] font-extrabold text-[var(--neutral-900)]">
              {lesson.className}
            </p>
            <p className="truncate text-[12px] font-medium text-[var(--neutral-500)]">
              {lesson.typeLabel}
            </p>
          </div>
        </div>

        <div className="rounded-md border border-[var(--neutral-100)] bg-white p-2.5">
          <p className="line-clamp-3 text-[13px] font-medium leading-5 text-[var(--neutral-600)]">
            <span className="font-extrabold text-[var(--neutral-800)]">
              Nội dung đã dạy:{" "}
            </span>
            {lesson.displayTitle}
          </p>
        </div>

        <div className="flex items-center justify-between gap-2 text-[12px] font-bold">
          <span className="text-[var(--brand-600)]">Chi tiết buổi học</span>
          <span className="inline-flex items-center gap-1 text-emerald-600">
            <CheckCircle2 size={11} />
            Xem lớp học
          </span>
        </div>
      </Link>
    );
  }

  return (
    <Link
      className={`group grid gap-3 rounded-md border border-[var(--neutral-200)] bg-[var(--neutral-50)] p-3.5 transition hover:border-[var(--brand-200)] hover:bg-white hover:shadow-[var(--shadow-sm)] ${"sm:grid-cols-[96px_1fr_auto] sm:items-center"}`}
      href={`/classes/${lesson.classId}`}
    >
      <div
        className="flex items-center gap-2 rounded-lg px-3 py-2 text-[14px] font-extrabold"
        style={{
          background: theme.background,
          color: theme.accent,
        }}
      >
        <Clock3 size={16} />
        {timeText}
      </div>

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className="inline-block size-2.5 rounded-full"
            style={{ backgroundColor: theme.accent }}
          />
          <p className="truncate text-[15px] font-extrabold text-[var(--neutral-900)]">
            {lesson.className}
          </p>
          <StatusBadge label={lesson.typeLabel} tone="brand" />
          <StatusBadge
            label={lesson.statusLabel}
            tone={getLessonStatusTone(lesson.statusLabel)}
          />
        </div>
        <p className="mt-1 line-clamp-2 text-[14px] font-medium leading-6 text-[var(--neutral-500)]">
          {lesson.displayTitle}
        </p>
      </div>

      <div
        className={`size-10 place-items-center rounded-lg border border-[var(--neutral-200)] text-[var(--neutral-500)] transition group-hover:border-[var(--brand-200)] group-hover:text-[var(--brand-600)] ${"hidden sm:grid"}`}
      >
        <ArrowRight size={16} />
      </div>
    </Link>
  );
}

function RevenuePanel({
  revenue,
}: {
  revenue: DashboardOverviewData["revenue"];
}) {
  const paidRatio =
    revenue.overall.issuedAmount > 0
      ? Math.min(
          100,
          Math.round(
            (revenue.overall.paidAmount / revenue.overall.issuedAmount) * 100,
          ),
        )
      : 0;

  return (
    <section className="rounded-md border border-[#e8eaf2] bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.035)] sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-[18px] font-extrabold text-[var(--brand-950)]">
              Thống kê doanh thu học phí
            </h2>
            <span className="rounded-full bg-[var(--brand-50)] px-2.5 py-1 text-[12px] font-extrabold text-[var(--brand-600)]">
              {formatCurrentMonthLabel()}
            </span>
          </div>
          <p className="mt-1 text-[13px] font-medium text-[var(--neutral-500)]">
            Tổng hợp từ các hóa đơn và phiếu thu phát hành
          </p>
        </div>
        <Link
          className="inline-flex h-10 items-center justify-center gap-2 self-start rounded-md border border-[var(--neutral-200)] bg-white px-3 text-[13px] font-bold text-[var(--neutral-600)] transition hover:border-[var(--brand-200)] hover:text-[var(--brand-700)]"
          href="/classes"
        >
          Chi tiết học phí
          <ArrowRight size={13} />
        </Link>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <RevenueMetric
          description="Theo ngày thanh toán"
          icon={<WalletCards size={16} />}
          label="Đã thu tháng này"
          tone="emerald"
          value={formatMoney(revenue.collectedThisMonth)}
        />
        <RevenueMetric
          description={`${revenue.currentMonth.receiptCount} hóa đơn trong tháng`}
          icon={<FileText size={16} />}
          label="Đã xuất tháng này"
          tone="brand"
          value={formatMoney(revenue.currentMonth.issuedAmount)}
        />
        <RevenueMetric
          description={`${revenue.overall.pendingReceiptCount} hóa đơn đang chờ phụ huynh`}
          icon={<AlertCircle size={16} />}
          label="Còn phải thu"
          tone="amber"
          value={formatMoney(revenue.overall.outstandingAmount)}
        />
        <RevenueMetric
          description={`${paidRatio}% hóa đơn đã hoàn tất`}
          icon={<TrendingUp size={16} />}
          label="Tổng đã thu lũy kế"
          tone="violet"
          value={formatMoney(revenue.overall.paidAmount)}
        />
      </div>
    </section>
  );
}

function RevenueMetric({
  description,
  icon,
  label,
  tone,
  value,
}: {
  description: string;
  icon: React.ReactNode;
  label: string;
  tone: "amber" | "brand" | "emerald" | "violet";
  value: string;
}) {
  const toneClass = {
    amber: "border-amber-100 bg-amber-50/40",
    brand: "border-[var(--brand-100)] bg-[var(--brand-50)]/35",
    emerald: "border-emerald-100 bg-emerald-50/40",
    violet: "border-violet-100 bg-violet-50/40",
  }[tone];
  const iconClass = {
    amber: "bg-amber-100 text-amber-600",
    brand: "bg-[var(--brand-100)] text-[var(--brand-600)]",
    emerald: "bg-emerald-100 text-emerald-600",
    violet: "bg-violet-100 text-violet-600",
  }[tone];

  return (
    <article className={`rounded-md border p-4 ${toneClass}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[13px] font-bold text-[var(--neutral-500)]">
            {label}
          </p>
          <p
            className={`mt-2 break-words text-[22px] font-extrabold leading-tight ${
              tone === "emerald"
                ? "text-emerald-700"
                : tone === "amber"
                  ? "text-amber-700"
                  : "text-[var(--brand-950)]"
            }`}
          >
            {value}
          </p>
        </div>
        <div
          className={`grid size-9 shrink-0 place-items-center rounded-lg ${iconClass}`}
        >
          {icon}
        </div>
      </div>
      <p
        className={`mt-2 text-[12px] font-semibold leading-5 ${
          tone === "amber" ? "text-amber-600" : "text-emerald-600"
        }`}
      >
        {description}
      </p>
    </article>
  );
}

function PendingPaymentsPanel({
  openingReceiptId,
  onViewPdf,
  payments,
}: {
  openingReceiptId: string;
  onViewPdf: (receiptId: string) => void;
  payments: DashboardPendingPayment[];
}) {
  const totalRemaining = payments.reduce(
    (sum, payment) => sum + payment.remainingAmount,
    0,
  );

  return (
    <section
      className="scroll-mt-24 rounded-md border border-[#e8eaf2] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.035)]"
      id="pending-payments"
    >
      <PanelHeader
        actionHref="/classes"
        actionLabel="Xem học phí"
        description={
          payments.length
            ? `${payments.length} hóa đơn gần nhất còn ${formatMoney(totalRemaining)}`
            : "Không có hóa đơn đang chờ thanh toán"
        }
        icon={<Banknote size={18} />}
        title="Phụ huynh chưa nộp tiền học thêm"
      />

      <div className="grid gap-2.5 p-4 sm:p-5">
        {payments.length ? (
          payments.map((payment) => (
            <PendingPaymentItem
              isOpeningPdf={openingReceiptId === payment.id}
              key={payment.id}
              onViewPdf={onViewPdf}
              payment={payment}
            />
          ))
        ) : (
          <EmptyState
            icon={<CheckCircle2 size={22} />}
            text="Các hóa đơn đã phát hành đều không còn khoản phải thu."
            title="Không có công nợ"
          />
        )}
      </div>
    </section>
  );
}

function PendingPaymentItem({
  isOpeningPdf,
  onViewPdf,
  payment,
}: {
  isOpeningPdf: boolean;
  onViewPdf: (receiptId: string) => void;
  payment: DashboardPendingPayment;
}) {
  const theme = getClassColorTheme(payment.colorHex);
  const href = payment.classId ? `/classes/${payment.classId}` : "/classes";

  return (
    <article className="grid gap-3 rounded-md border border-[#e8eaf2] bg-[var(--neutral-50)] p-3 md:grid-cols-[1.1fr_1fr_0.9fr_0.8fr_auto] md:items-center">
      <div className="min-w-0">
        <div className="flex items-center gap-3">
          <div
            className="grid size-9 shrink-0 place-items-center rounded-lg text-[12px] font-extrabold"
            style={{
              background: theme.background,
              color: theme.accent,
            }}
          >
            {getInitial(payment.parentName || payment.studentName)}
          </div>
          <div className="min-w-0">
            <p className="truncate text-[14px] font-extrabold text-[var(--neutral-900)]">
              {payment.parentName}
            </p>
            <p className="truncate text-[13px] font-semibold text-[var(--neutral-500)]">
              {payment.parentPhone}
            </p>
          </div>
        </div>
      </div>

      <div className="min-w-0">
        <p className="truncate text-[14px] font-extrabold text-[var(--neutral-800)]">
          {payment.studentName}
        </p>
        <p className="truncate text-[13px] font-semibold text-[var(--neutral-500)]">
          {payment.className}
        </p>
      </div>

      <div className="min-w-0">
        <p className="truncate text-[13px] font-bold text-[var(--neutral-500)]">
          {payment.receiptNumber}
        </p>
        <p className="mt-1 truncate text-[13px] font-semibold text-[var(--neutral-600)]">
          {formatDate(payment.periodStart)} - {formatDate(payment.periodEnd)}
        </p>
      </div>

      <div>
        <p className="text-[14px] font-extrabold text-[var(--brand-950)]">
          {formatMoney(payment.remainingAmount)}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <StatusBadge
            label={getPaymentLabel(payment.paymentStatus)}
            tone={getPaymentTone(payment.paymentStatus)}
          />
          <span className="text-[12px] font-semibold text-[var(--neutral-500)]">
            {payment.lessonCount} buổi
          </span>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2">
        <button
          aria-label={`Xem PDF hóa đơn ${payment.receiptNumber}`}
          className="grid size-10 shrink-0 place-items-center rounded-md border border-[var(--neutral-200)] bg-white text-[var(--brand-700)] transition hover:border-[var(--brand-200)] hover:bg-[var(--brand-50)] disabled:cursor-not-allowed disabled:bg-[var(--neutral-100)] disabled:text-[var(--neutral-400)]"
          disabled={payment.pdfStatus !== "generated" || isOpeningPdf}
          onClick={() => onViewPdf(payment.id)}
          title={
            payment.pdfStatus === "generated"
              ? "Xem PDF hóa đơn"
              : "PDF hóa đơn chưa sẵn sàng"
          }
          type="button"
        >
          {isOpeningPdf ? (
            <Loader2 className="animate-spin" size={16} />
          ) : (
            <Eye size={17} />
          )}
        </button>
        <Link
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[var(--neutral-200)] bg-white px-3 text-[13px] font-bold text-[var(--neutral-700)] transition hover:border-[var(--brand-200)] hover:bg-[var(--brand-50)] hover:text-[var(--brand-700)]"
          href={href}
        >
          Mở lớp
          <ArrowRight size={14} />
        </Link>
      </div>
    </article>
  );
}

function PanelHeader({
  actionHref,
  actionLabel,
  compact = false,
  description,
  icon,
  title,
}: {
  actionHref: string;
  actionLabel: string;
  compact?: boolean;
  description: string;
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <header
      className={`flex flex-col gap-3 border-b border-[var(--neutral-100)] p-4 sm:p-5 ${
        compact ? "" : "sm:flex-row sm:items-center sm:justify-between"
      }`}
    >
      <div className="min-w-0">
        <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-[var(--brand-50)] px-2.5 py-1 text-[12px] font-bold text-[var(--brand-700)]">
          {icon}
          Không gian giáo viên
        </div>
        <h2 className="text-[18px] font-extrabold text-[var(--brand-950)]">
          {title}
        </h2>
        <p className="mt-1 text-[13px] leading-5 text-[var(--neutral-500)]">
          {description}
        </p>
      </div>

      <Link
        className={`inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[var(--neutral-200)] bg-white px-3 text-[13px] font-bold text-[var(--neutral-700)] transition hover:border-[var(--brand-200)] hover:text-[var(--brand-700)] ${compact ? "w-full" : ""}`}
        href={actionHref}
      >
        {actionLabel}
        <ArrowRight size={15} />
      </Link>
    </header>
  );
}

function StatusBadge({ label, tone }: { label: string; tone: StatTone }) {
  const classes: Record<StatTone, string> = {
    amber: "border-amber-200 bg-amber-50 text-amber-700",
    brand:
      "border-[var(--brand-100)] bg-[var(--brand-50)] text-[var(--brand-700)]",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
    rose: "border-rose-200 bg-rose-50 text-rose-700",
    sky: "border-sky-200 bg-sky-50 text-sky-700",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-1 text-[12px] font-extrabold ${classes[tone]}`}
    >
      {label}
    </span>
  );
}

function EmptyState({
  icon,
  text,
  title,
}: {
  icon: React.ReactNode;
  text: string;
  title: string;
}) {
  return (
    <div className="grid min-h-[190px] place-items-center rounded-lg border border-dashed border-[var(--neutral-300)] bg-[var(--neutral-50)]/70 px-4 text-center">
      <div>
        <div className="mx-auto grid size-12 place-items-center rounded-lg bg-white text-[var(--brand-500)] shadow-[var(--shadow-sm)]">
          {icon}
        </div>
        <p className="mt-3 text-[15px] font-extrabold text-[var(--neutral-800)]">
          {title}
        </p>
        <p className="mt-1 text-[14px] leading-6 text-[var(--neutral-500)]">
          {text}
        </p>
      </div>
    </div>
  );
}

function ErrorPanel({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <section className="rounded-lg border border-rose-200 bg-rose-50 p-5 text-rose-700">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 shrink-0" size={20} />
          <div>
            <p className="font-extrabold">Không tải được dữ liệu tổng quan</p>
            <p className="mt-1 text-[14px] font-medium">{message}</p>
          </div>
        </div>
        <button
          className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-white px-4 text-[14px] font-bold text-rose-700 shadow-[var(--shadow-sm)]"
          onClick={onRetry}
          type="button"
        >
          <RefreshCw size={15} />
          Thử lại
        </button>
      </div>
    </section>
  );
}

function DashboardSkeleton() {
  return (
    <div className="grid gap-5">
      <div className="h-[188px] animate-pulse rounded-lg bg-white shadow-[var(--shadow-card)]" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            className="h-[154px] animate-pulse rounded-lg bg-white shadow-[var(--shadow-card)]"
            key={index}
          />
        ))}
      </div>
      <div className="grid gap-5 2xl:grid-cols-2">
        <div className="h-[360px] animate-pulse rounded-lg bg-white shadow-[var(--shadow-card)]" />
        <div className="h-[360px] animate-pulse rounded-lg bg-white shadow-[var(--shadow-card)]" />
      </div>
    </div>
  );
}

function getLessonStatusTone(label: string): StatTone {
  if (label === "Đang diễn ra") {
    return "emerald";
  }

  if (label === "Đã qua") {
    return "sky";
  }

  if (label === "Chưa rõ giờ") {
    return "rose";
  }

  return "amber";
}

function getPaymentLabel(status: PaymentStatus) {
  if (status === "paid") {
    return "Đã thanh toán";
  }

  if (status === "partially_paid") {
    return "Thanh toán một phần";
  }

  if (status === "cancelled") {
    return "Đã hủy";
  }

  return "Chưa thanh toán";
}

function getPaymentTone(status: PaymentStatus): StatTone {
  if (status === "paid") {
    return "emerald";
  }

  if (status === "partially_paid") {
    return "amber";
  }

  if (status === "cancelled") {
    return "rose";
  }

  return "brand";
}

function formatDate(value?: string | null) {
  if (!value) {
    return "Chưa cập nhật";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Chưa cập nhật";
  }

  return date.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
  });
}

function formatCurrentMonthLabel() {
  const now = new Date();
  const month = new Intl.DateTimeFormat("vi-VN", {
    month: "2-digit",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(now);
  const year = new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
  }).format(now);

  return `Tháng ${month}/${year}`;
}

function getInitial(value: string) {
  return value.trim().charAt(0).toUpperCase() || "P";
}
