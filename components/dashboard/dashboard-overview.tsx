"use client";

import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  Banknote,
  Bell,
  BookOpenCheck,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Eye,
  FileText,
  Loader2,
  Plus,
  ReceiptText,
  RefreshCw,
  ShieldCheck,
  TrendingUp,
  Users,
  WalletCards,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDashboardUser } from "@/components/layout/dashboard-shell";
import {
  formatMoney,
  getClassColorTheme,
  getErrorMessage,
} from "@/components/classes/classroom-utils";
import { schoolApi } from "@/lib/api/school";
import { openPdfInNewTab } from "@/lib/files/open-pdf-in-new-tab";
import { useNotice } from "@/components/ui/notice-provider";
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
    <div className="grid gap-5">
      <WelcomePanel
        error={error}
        isLoading={isLoading}
        onReload={() => void loadOverview()}
        pendingAmount={pendingAmount}
        unreadNotificationCount={overview?.stats.unreadNotificationCount ?? 0}
        userName={user.fullName}
      />

      {error && !overview ? (
        <ErrorPanel message={error} onRetry={() => void loadOverview()} />
      ) : null}

      {overview ? (
        <>
          <StatsGrid overview={overview} />

          <div className="grid items-stretch gap-5 2xl:grid-cols-[minmax(0,4fr)_minmax(0,4fr)_minmax(260px,2fr)]">
            <RevenuePanel revenue={overview.revenue} />
            <YearlyRevenueChart revenue={overview.revenue} />
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

function WelcomePanel({
  error,
  isLoading,
  onReload,
  pendingAmount,
  unreadNotificationCount,
  userName,
}: {
  error: string;
  isLoading: boolean;
  onReload: () => void;
  pendingAmount: number;
  unreadNotificationCount: number;
  userName: string;
}) {
  return (
    <section className="animate-slide-up overflow-hidden rounded-lg border border-[var(--neutral-200)] bg-white shadow-[var(--shadow-card)]">
      <div className="grid gap-5 p-5 sm:p-6 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-lg border border-[var(--brand-100)] bg-[var(--brand-50)] px-3 py-1.5 text-[13px] font-bold text-[var(--brand-700)]">
              <ShieldCheck size={14} />
              Tài khoản đã xác thực
            </span>
            {unreadNotificationCount ? (
              <span className="inline-flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-[13px] font-bold text-amber-700">
                <Bell size={14} />
                {unreadNotificationCount} thông báo mới
              </span>
            ) : null}
          </div>

          <h2 className="mt-4 text-[26px] font-extrabold leading-tight text-[var(--brand-950)] sm:text-[30px]">
            Xin chào, {userName}
          </h2>
          <p className="mt-2 max-w-3xl text-[15px] leading-7 text-[var(--neutral-500)]">
            Theo dõi lịch dạy trong ngày, doanh thu học phí và các hóa đơn đang
            chờ phụ huynh thanh toán.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[520px]">
          <Link
            className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-gradient-to-b from-[var(--brand-500)] to-[var(--brand-700)] px-5 text-[14px] font-bold text-white shadow-[var(--shadow-brand)] transition hover:from-[var(--brand-400)] hover:to-[var(--brand-600)]"
            href="/classes"
          >
            <Plus size={16} />
            Tạo lớp
          </Link>
          <Link
            className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-[var(--neutral-200)] bg-[var(--neutral-50)] px-5 text-[14px] font-bold text-[var(--neutral-700)] transition hover:border-[var(--brand-200)] hover:bg-white hover:text-[var(--brand-700)]"
            href="/schedule"
          >
            <CalendarDays size={16} />
            Xem lịch
          </Link>
          <button
            className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-[var(--neutral-200)] bg-white px-5 text-[14px] font-bold text-[var(--neutral-700)] transition hover:border-[var(--brand-200)] hover:bg-[var(--brand-50)] hover:text-[var(--brand-700)] disabled:cursor-not-allowed disabled:opacity-60"
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
        <div className="border-t border-[var(--neutral-100)] bg-gradient-to-r from-amber-50 via-white to-[var(--brand-50)] px-5 py-3 text-[14px] font-semibold text-[var(--neutral-700)] sm:px-6">
          Còn {formatMoney(pendingAmount)} học phí đang chờ thanh toán.
        </div>
      ) : null}

      {error ? (
        <div className="border-t border-rose-100 bg-rose-50 px-5 py-3 text-[14px] font-semibold text-rose-700 sm:px-6">
          {error}
        </div>
      ) : null}
    </section>
  );
}

function StatsGrid({ overview }: { overview: DashboardOverviewData }) {
  const stats = [
    {
      description: "Lớp đang hoạt động",
      icon: BookOpenCheck,
      label: "Số lớp",
      tone: "brand" as const,
      value: overview.stats.activeClassCount,
    },
    {
      description: "Hồ sơ học sinh đang học",
      icon: Users,
      label: "Số học sinh",
      tone: "sky" as const,
      value: overview.stats.activeStudentCount,
    },
    {
      description: "Từ thời khóa biểu hôm nay",
      icon: CalendarDays,
      label: "Tiết học hôm nay",
      tone: "emerald" as const,
      value: overview.stats.todaySessionCount,
    },
    {
      description: "Hóa đơn đã tạo nhưng chưa thu đủ",
      icon: ReceiptText,
      label: "Chờ thanh toán",
      tone: "amber" as const,
      value: overview.stats.pendingPaymentCount,
    },
  ];

  return (
    <section className="stagger grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map(({ description, icon: Icon, label, tone, value }) => {
        const styles = statTones[tone];

        return (
          <article
            className={`rounded-lg border border-[var(--neutral-200)] bg-white p-5 shadow-[var(--shadow-card)] transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-lg)] ${styles.border}`}
            key={label}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[14px] font-semibold text-[var(--neutral-500)]">
                  {label}
                </p>
                <p className="mt-2 text-[30px] font-extrabold leading-none text-[var(--brand-950)]">
                  {value.toLocaleString("vi-VN")}
                </p>
              </div>
              <div
                className={`grid size-11 shrink-0 place-items-center rounded-lg ${styles.icon}`}
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
    <section className="rounded-lg border border-[var(--neutral-200)] bg-white shadow-[var(--shadow-card)]">
      <PanelHeader
        actionHref="/schedule"
        actionLabel="Mở lịch"
        compact={compact}
        description={`Hôm nay, ${formatDate(today)}`}
        icon={<CalendarDays size={18} />}
        title="Tiết học trong ngày"
      />

      <div className="grid gap-3 p-5 sm:p-6">
        {lessons.length ? (
          lessons.map((lesson) => (
            <TodayLessonItem compact={compact} key={lesson.id} lesson={lesson} />
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

  return (
    <Link
      className={`group grid gap-3 rounded-lg border border-[var(--neutral-200)] bg-[var(--neutral-50)] p-3.5 transition hover:border-[var(--brand-200)] hover:bg-white hover:shadow-[var(--shadow-md)] ${
        compact ? "" : "sm:grid-cols-[96px_1fr_auto] sm:items-center"
      }`}
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
        className={`size-10 place-items-center rounded-lg border border-[var(--neutral-200)] text-[var(--neutral-500)] transition group-hover:border-[var(--brand-200)] group-hover:text-[var(--brand-600)] ${
          compact ? "hidden" : "hidden sm:grid"
        }`}
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
    <section className="rounded-lg border border-[var(--neutral-200)] bg-white shadow-[var(--shadow-card)]">
      <PanelHeader
        actionHref="/classes"
        actionLabel="Học phí"
        description="Tổng hợp từ các hóa đơn đã phát hành"
        icon={<TrendingUp size={18} />}
        title="Thống kê doanh thu"
      />

      <div className="grid gap-4 p-5 sm:p-6">
        <div className="grid gap-3 sm:grid-cols-2">
          <RevenueMetric
            description="Theo ngày thanh toán"
            icon={<WalletCards size={17} />}
            label="Đã thu tháng này"
            value={formatMoney(revenue.collectedThisMonth)}
          />
          <RevenueMetric
            description={`${revenue.currentMonth.receiptCount} hóa đơn trong tháng`}
            icon={<FileText size={17} />}
            label="Đã xuất tháng này"
            value={formatMoney(revenue.currentMonth.issuedAmount)}
          />
          <RevenueMetric
            description={`${revenue.overall.pendingReceiptCount} hóa đơn chờ thu`}
            icon={<AlertCircle size={17} />}
            label="Còn phải thu"
            value={formatMoney(revenue.overall.outstandingAmount)}
          />
          <RevenueMetric
            description={`${revenue.overall.paidReceiptCount}/${revenue.overall.receiptCount} hóa đơn đã thanh toán`}
            icon={<CheckCircle2 size={17} />}
            label="Tổng đã thu"
            value={formatMoney(revenue.overall.paidAmount)}
          />
        </div>

        <div className="rounded-lg border border-[var(--neutral-200)] bg-[var(--neutral-50)] p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[14px] font-bold text-[var(--neutral-800)]">
                Tỷ lệ đã thu
              </p>
              <p className="mt-1 text-[13px] text-[var(--neutral-500)]">
                So với tổng giá trị hóa đơn chưa hủy
              </p>
            </div>
            <p className="text-[24px] font-extrabold text-[var(--brand-700)]">
              {paidRatio}%
            </p>
          </div>
          <div className="mt-4 h-3 overflow-hidden rounded-full bg-white">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[var(--brand-500)] to-emerald-500"
              style={{ width: `${paidRatio}%` }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function RevenueMetric({
  description,
  icon,
  label,
  value,
}: {
  description: string;
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <article className="rounded-lg border border-[var(--neutral-200)] bg-[var(--neutral-50)] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[13px] font-bold text-[var(--neutral-500)]">
            {label}
          </p>
          <p className="mt-2 break-words text-[20px] font-extrabold leading-tight text-[var(--brand-950)]">
            {value}
          </p>
        </div>
        <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-white text-[var(--brand-600)]">
          {icon}
        </div>
      </div>
      <p className="mt-3 text-[13px] font-medium leading-5 text-[var(--neutral-500)]">
        {description}
      </p>
    </article>
  );
}

function YearlyRevenueChart({
  revenue,
}: {
  revenue: DashboardOverviewData["revenue"];
}) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [chartWidth, setChartWidth] = useState(640);
  const chartHeight = 300;
  const plotTop = 24;
  const plotBottom = 244;
  const plotHeight = plotBottom - plotTop;
  const left = chartWidth < 480 ? 48 : 64;
  const right = chartWidth < 480 ? 10 : 20;
  const plotWidth = chartWidth - left - right;
  const slotWidth = plotWidth / 12;
  const barWidth = Math.min(34, slotWidth * 0.52);
  const maxValue = Math.max(
    1,
    ...revenue.monthly.flatMap((item) => [
      item.collectedAmount,
      item.issuedAmount,
    ]),
  );
  const axisMax = getChartAxisMax(maxValue);
  const points = revenue.monthly
    .map((item, index) => {
      const x = left + slotWidth * index + slotWidth / 2;
      const y = plotBottom - (item.issuedAmount / axisMax) * plotHeight;
      return `${x},${y}`;
    })
    .join(" ");
  const collectedTotal = revenue.monthly.reduce(
    (sum, item) => sum + item.collectedAmount,
    0,
  );
  const issuedTotal = revenue.monthly.reduce(
    (sum, item) => sum + item.issuedAmount,
    0,
  );

  useEffect(() => {
    const container = chartContainerRef.current;
    if (!container) return;

    const updateWidth = (width: number) => {
      setChartWidth(Math.max(300, Math.floor(width)));
    };
    updateWidth(container.getBoundingClientRect().width);

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) updateWidth(entry.contentRect.width);
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  return (
    <section className="rounded-lg border border-[var(--neutral-200)] bg-white shadow-[var(--shadow-card)]">
      <div className="flex flex-col gap-4 border-b border-[var(--neutral-100)] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-1.5 text-[13px] font-bold text-emerald-700">
            <TrendingUp size={18} />
            Năm {revenue.year}
          </div>
          <h2 className="text-[19px] font-extrabold text-[var(--brand-950)]">
            Doanh thu theo 12 tháng
          </h2>
          <p className="mt-1 text-[14px] leading-6 text-[var(--neutral-500)]">
            So sánh tiền đã thu và giá trị hóa đơn đã phát hành trong năm.
          </p>
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-2 text-[13px] font-bold text-[var(--neutral-600)]">
          <span className="inline-flex items-center gap-2">
            <span className="size-3 rounded-sm bg-emerald-500" />
            Đã thu {formatCompactMoney(collectedTotal)}
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-0.5 w-4 bg-[var(--brand-500)]" />
            Đã xuất {formatCompactMoney(issuedTotal)}
          </span>
        </div>
      </div>

      <div
        className="min-w-0 overflow-hidden px-3 pb-4 pt-5 sm:px-5 sm:pb-6"
        ref={chartContainerRef}
      >
        <svg
          aria-label={`Biểu đồ doanh thu năm ${revenue.year}`}
          className="block h-[300px] w-full"
          preserveAspectRatio="none"
          role="img"
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
        >
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const y = plotBottom - ratio * plotHeight;
            return (
              <g key={ratio}>
                <line
                  stroke="#e5e7eb"
                  strokeDasharray={ratio === 0 ? undefined : "4 5"}
                  x1={left}
                  x2={chartWidth - right}
                  y1={y}
                  y2={y}
                />
                <text
                  fill="#737373"
                  fontSize="11"
                  fontWeight="600"
                  textAnchor="end"
                  x={left - 10}
                  y={y + 4}
                >
                  {formatAxisMoney(axisMax * ratio)}
                </text>
              </g>
            );
          })}

          {revenue.monthly.map((item, index) => {
            const x = left + slotWidth * index + slotWidth / 2;
            const barHeight = (item.collectedAmount / axisMax) * plotHeight;
            return (
              <g key={item.month}>
                <rect
                  fill="#10b981"
                  height={barHeight}
                  rx="4"
                  width={barWidth}
                  x={x - barWidth / 2}
                  y={plotBottom - barHeight}
                >
                  <title>{`Tháng ${item.month}: Đã thu ${formatMoney(item.collectedAmount)}`}</title>
                </rect>
                <text
                  fill="#525252"
                  fontSize="12"
                  fontWeight="700"
                  textAnchor="middle"
                  x={x}
                  y={plotBottom + 26}
                >
                  T{item.month}
                </text>
              </g>
            );
          })}

          <polyline
            fill="none"
            points={points}
            stroke="var(--brand-500)"
            strokeLinejoin="round"
            strokeWidth="3"
          />
          {revenue.monthly.map((item, index) => {
            const x = left + slotWidth * index + slotWidth / 2;
            const y = plotBottom - (item.issuedAmount / axisMax) * plotHeight;
            return (
              <circle
                cx={x}
                cy={y}
                fill="white"
                key={item.month}
                r="4"
                stroke="var(--brand-600)"
                strokeWidth="3"
              >
                <title>{`Tháng ${item.month}: Đã xuất ${formatMoney(item.issuedAmount)}`}</title>
              </circle>
            );
          })}
        </svg>
      </div>
    </section>
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
    <section className="rounded-lg border border-[var(--neutral-200)] bg-white shadow-[var(--shadow-card)]">
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

      <div className="grid gap-3 p-5 sm:p-6">
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
    <article className="grid gap-3 rounded-lg border border-[var(--neutral-200)] bg-[var(--neutral-50)] p-4 md:grid-cols-[1.1fr_1fr_0.9fr_0.8fr_auto] md:items-center">
      <div className="min-w-0">
        <div className="flex items-center gap-3">
          <div
            className="grid size-11 shrink-0 place-items-center rounded-lg text-[14px] font-extrabold"
            style={{
              background: theme.background,
              color: theme.accent,
            }}
          >
            {getInitial(payment.parentName || payment.studentName)}
          </div>
          <div className="min-w-0">
            <p className="truncate text-[15px] font-extrabold text-[var(--neutral-900)]">
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
        <p className="text-[16px] font-extrabold text-[var(--brand-950)]">
          {formatMoney(payment.remainingAmount)}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <StatusBadge
            label={getPaymentLabel(payment.paymentStatus)}
            tone={getPaymentTone(payment.paymentStatus)}
          />
          <span className="text-[12px] font-semibold text-[var(--neutral-400)]">
            {payment.lessonCount} buổi
          </span>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2">
        <button
          aria-label={`Xem PDF hóa đơn ${payment.receiptNumber}`}
          className="grid size-10 shrink-0 place-items-center rounded-lg border border-[var(--neutral-200)] bg-white text-[var(--brand-700)] transition hover:border-[var(--brand-200)] hover:bg-[var(--brand-50)] disabled:cursor-not-allowed disabled:bg-[var(--neutral-100)] disabled:text-[var(--neutral-400)]"
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
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[var(--neutral-200)] bg-white px-3 text-[13px] font-bold text-[var(--neutral-700)] transition hover:border-[var(--brand-200)] hover:bg-[var(--brand-50)] hover:text-[var(--brand-700)]"
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
      className={`flex flex-col gap-3 border-b border-[var(--neutral-100)] p-5 sm:p-6 ${
        compact ? "" : "sm:flex-row sm:items-center sm:justify-between"
      }`}
    >
      <div className="min-w-0">
        <div className="mb-2 inline-flex items-center gap-2 rounded-lg bg-[var(--brand-50)] px-3 py-1.5 text-[13px] font-bold text-[var(--brand-700)]">
          {icon}
          Không gian giáo viên
        </div>
        <h2 className="text-[19px] font-extrabold text-[var(--brand-950)]">
          {title}
        </h2>
        <p className="mt-1 text-[14px] leading-6 text-[var(--neutral-500)]">
          {description}
        </p>
      </div>

      <Link
        className={`inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-[var(--neutral-200)] bg-[var(--neutral-50)] px-4 text-[14px] font-bold text-[var(--neutral-700)] transition hover:border-[var(--brand-200)] hover:bg-white hover:text-[var(--brand-700)] ${compact ? "w-full" : ""}`}
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
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[12px] font-extrabold ${classes[tone]}`}
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

function getChartAxisMax(value: number) {
  if (value <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const normalized = value / magnitude;
  const rounded =
    normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return rounded * magnitude;
}

function formatAxisMoney(value: number) {
  if (value === 0) return "0";
  if (value >= 1_000_000_000) {
    return `${trimDecimal(value / 1_000_000_000)} tỷ`;
  }
  if (value >= 1_000_000) {
    return `${trimDecimal(value / 1_000_000)} tr`;
  }
  if (value >= 1_000) {
    return `${trimDecimal(value / 1_000)} k`;
  }
  return Math.round(value).toLocaleString("vi-VN");
}

function formatCompactMoney(value: number) {
  return `${formatAxisMoney(value)} VNĐ`;
}

function trimDecimal(value: number) {
  return value.toLocaleString("vi-VN", {
    maximumFractionDigits: 1,
  });
}

function getInitial(value: string) {
  return value.trim().charAt(0).toUpperCase() || "P";
}
