/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import {
  Coins,
  FileText,
  LoaderCircle,
  RefreshCw,
  UserRound,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { schoolApi } from "@/lib/api/school";
import type {
  BillingCandidates,
  ClassroomDetail,
  PaymentStatus,
  ReceiptListItem,
  Student,
} from "@/types/school";
import { formatMoney, getErrorMessage } from "./classroom-utils";
import {
  EmptyState,
  InlineLoading,
  Modal,
  PrimaryAction,
  SecondaryAction,
} from "./classroom-ui";
import {
  StudentIdentityPanel,
  StudentProfileContent,
} from "./student-profile-panel";
import styles from "./classroom-manager.module.css";

const dateFormatter = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  timeZone: "Asia/Ho_Chi_Minh",
  year: "numeric",
});

type StudentDetailTab = "profile" | "receipts";
const RECEIPT_FILTER_ALL = "all";
const RECEIPT_FILTER_MULTI = "multi_class";

export function StudentDetailModal({
  actions,
  classroom,
  onClose,
  onIssueReceipt,
  onIssueMultiClassReceipt,
  receiptActionLoading = false,
  student,
}: {
  actions?: ReactNode;
  classroom?: ClassroomDetail | null;
  onClose: () => void;
  onIssueReceipt?: (student: Student) => void;
  onIssueMultiClassReceipt?: (student: Student) => void;
  receiptActionLoading?: boolean;
  student: Student;
}) {
  const [activeTab, setActiveTab] = useState<StudentDetailTab>("profile");
  const [receipts, setReceipts] = useState<ReceiptListItem[]>([]);
  const [candidates, setCandidates] = useState<BillingCandidates | null>(null);
  const [isReceiptLoading, setIsReceiptLoading] = useState(false);
  const [receiptError, setReceiptError] = useState("");

  const loadReceiptData = useCallback(async () => {
    setIsReceiptLoading(true);
    setReceiptError("");

    try {
      const [nextReceipts, nextCandidates] = await Promise.all([
        schoolApi.listReceipts({
          studentId: student.id,
        }),
        classroom
          ? schoolApi.getBillingCandidates(classroom.id, student.id)
          : Promise.resolve(null),
      ]);

      setReceipts(nextReceipts);
      setCandidates(nextCandidates);
    } catch (error) {
      setReceiptError(getErrorMessage(error));
      setCandidates(null);
    } finally {
      setIsReceiptLoading(false);
    }
  }, [classroom, student.id]);

  useEffect(() => {
    if (activeTab !== "receipts") {
      return;
    }

    void loadReceiptData();
  }, [activeTab, loadReceiptData]);

  return (
    <Modal onClose={onClose} title="Thông tin học sinh">
      <div className="grid gap-4">
        <StudentIdentityPanel actions={actions} student={student} />

        <div className={`${styles.detailTabBar} ${styles.tabScroller}`}>
          <div
            aria-label="Nội dung hồ sơ học sinh"
            className={styles.detailTabList}
            role="tablist"
          >
            <DetailTabButton
              active={activeTab === "profile"}
              icon={<UserRound size={16} />}
              onClick={() => setActiveTab("profile")}
            >
              Thông tin
            </DetailTabButton>
            <DetailTabButton
              active={activeTab === "receipts"}
              icon={<FileText size={16} />}
              onClick={() => setActiveTab("receipts")}
            >
              Hóa đơn
            </DetailTabButton>
          </div>
        </div>

        <div className="grid min-w-0">
          <div
            aria-hidden={activeTab !== "profile"}
            className={`col-start-1 row-start-1 min-w-0 ${
              activeTab === "profile"
                ? "visible"
                : "invisible pointer-events-none select-none"
            }`}
            role="tabpanel"
          >
            <StudentProfileContent student={student} />
          </div>

          <div
            aria-hidden={activeTab !== "receipts"}
            className={`col-start-1 row-start-1 min-w-0 ${
              activeTab === "receipts"
                ? "visible"
                : "invisible pointer-events-none select-none"
            }`}
            role="tabpanel"
          >
            <StudentReceiptContent
              candidates={candidates}
              classroom={classroom}
              error={receiptError}
              isLoading={isReceiptLoading}
              onIssueReceipt={
                onIssueReceipt ? () => onIssueReceipt(student) : undefined
              }
              onIssueMultiClassReceipt={
                onIssueMultiClassReceipt
                  ? () => onIssueMultiClassReceipt(student)
                  : undefined
              }
              receiptActionLoading={receiptActionLoading}
              onReload={() => void loadReceiptData()}
              receipts={receipts}
            />
          </div>
        </div>
      </div>
    </Modal>
  );
}

function StudentReceiptContent({
  candidates,
  classroom,
  error,
  isLoading,
  onIssueReceipt,
  onIssueMultiClassReceipt,
  onReload,
  receiptActionLoading,
  receipts,
}: {
  candidates: BillingCandidates | null;
  classroom?: ClassroomDetail | null;
  error: string;
  isLoading: boolean;
  onIssueReceipt?: () => void;
  onIssueMultiClassReceipt?: () => void;
  onReload: () => void;
  receiptActionLoading: boolean;
  receipts: ReceiptListItem[];
}) {
  const receiptFilterOptions = useMemo(
    () => getStudentReceiptFilterOptions(receipts),
    [receipts],
  );
  const [receiptFilter, setReceiptFilter] = useState(RECEIPT_FILTER_ALL);
  const filteredReceipts = useMemo(
    () => filterStudentReceipts(receipts, receiptFilter),
    [receiptFilter, receipts],
  );

  useEffect(() => {
    if (
      receiptFilter !== RECEIPT_FILTER_ALL &&
      !receiptFilterOptions.some((option) => option.value === receiptFilter)
    ) {
      setReceiptFilter(RECEIPT_FILTER_ALL);
    }
  }, [receiptFilter, receiptFilterOptions]);

  if (isLoading) {
    return <InlineLoading text="Đang tải hóa đơn của học sinh..." />;
  }

  return (
    <div className="grid gap-4">
      {error ? (
        <div className="rounded-lg border border-red-100 bg-red-50 p-3 text-[14px] font-semibold text-red-700">
          {error}
        </div>
      ) : null}

      {classroom || onIssueMultiClassReceipt ? (
        <section className="rounded-lg border border-[var(--brand-100)] bg-[var(--brand-50)] p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <SectionTitle icon={<Coins size={16} />}>
                {classroom ? "Kỳ học phí hiện tại" : "Xuất hóa đơn học phí"}
              </SectionTitle>
              <p className="mt-1 text-[13px] font-semibold text-[var(--neutral-500)]">
                {classroom
                  ? candidates
                    ? `${formatDate(candidates.periodStart)} - ${formatDate(
                        candidates.periodEnd,
                      )}`
                    : "Chưa có dữ liệu kỳ hiện tại."
                  : "Gom các buổi chưa xuất hóa đơn của học sinh trong nhiều lớp."}
              </p>
            </div>
            <div className="grid gap-2 sm:flex sm:justify-end">
              <SecondaryAction
                className="w-full sm:w-auto"
                disabled={!onIssueMultiClassReceipt || receiptActionLoading}
                icon={
                  receiptActionLoading ? (
                    <LoaderCircle className="animate-spin" size={16} />
                  ) : (
                    <FileText size={16} />
                  )
                }
                onClick={onIssueMultiClassReceipt}
                type="button"
              >
                Xuất gộp nhiều lớp
              </SecondaryAction>
              {classroom ? (
                <PrimaryAction
                  className="w-full sm:w-auto"
                  disabled={
                    !onIssueReceipt || !candidates?.summary.unbilledLessonCount
                  }
                  icon={<FileText size={16} />}
                  onClick={onIssueReceipt}
                  type="button"
                >
                  Xuất hóa đơn
                </PrimaryAction>
              ) : null}
            </div>
          </div>

          {classroom ? (
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <MiniMetric
                label="Buổi chờ xuất"
                value={`${candidates?.summary.unbilledLessonCount ?? 0} buổi`}
              />
              <MiniMetric
                label="Tạm tính"
                value={formatMoney(candidates?.summary.unbilledAmount ?? 0)}
              />
              <MiniMetric
                label="Bài kiểm tra"
                value={`${candidates?.summary.examCount ?? 0} bài`}
              />
            </div>
          ) : null}
        </section>
      ) : null}

      <section className="rounded-lg border border-[var(--neutral-200)] bg-white p-4">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <SectionTitle icon={<FileText size={16} />}>
            Lịch sử hóa đơn
          </SectionTitle>
          <SecondaryAction
            className="h-10 w-full px-3 sm:w-auto"
            icon={
              isLoading ? <LoaderCircle size={15} /> : <RefreshCw size={15} />
            }
            onClick={onReload}
            type="button"
          >
            Tải lại
          </SecondaryAction>
        </div>

        {receiptFilterOptions.length > 1 ? (
          <div className="mb-3 flex flex-wrap gap-2">
            {receiptFilterOptions.map((option) => {
              const isActive = receiptFilter === option.value;

              return (
                <button
                  className={`inline-flex min-h-9 items-center rounded-full border px-3 text-[13px] font-extrabold transition ${
                    isActive
                      ? "border-[var(--brand-200)] bg-[var(--brand-50)] text-[var(--brand-700)]"
                      : "border-[var(--neutral-200)] bg-white text-[var(--neutral-500)] hover:border-[var(--brand-200)] hover:text-[var(--brand-700)]"
                  }`}
                  key={option.value}
                  onClick={() => setReceiptFilter(option.value)}
                  type="button"
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        ) : null}

        {filteredReceipts.length ? (
          <div className="grid gap-2">
            {filteredReceipts.map((receipt) => (
              <div
                className="grid gap-3 rounded-lg border border-[var(--neutral-200)] bg-[var(--neutral-50)] p-3 sm:grid-cols-[1fr_auto] sm:items-center"
                key={receipt.id}
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <strong className="text-[14px] text-[var(--brand-900)]">
                      {receipt.receiptNumber}
                    </strong>
                    <PaymentStatusPill status={receipt.paymentStatus} />
                  </div>
                  <p className="mt-1 truncate text-[13px] font-semibold text-[var(--neutral-500)]">
                    {receipt.className} | {formatDate(receipt.periodStart)} -{" "}
                    {formatDate(receipt.periodEnd)} | {receipt.lessonCount} buổi
                  </p>
                </div>
                <div className="text-left sm:text-right">
                  <strong className="text-[16px] text-[var(--brand-950)]">
                    {formatMoney(receipt.totalAmount)}
                  </strong>
                  {receipt.paidAt ? (
                    <p className="text-[12px] font-bold text-emerald-700">
                      Thanh toán: {formatDate(receipt.paidAt || undefined)}
                    </p>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<FileText size={22} />}
            text="Học sinh này chưa có hóa đơn đã phát hành."
            title="Chưa có hóa đơn"
          />
        )}
      </section>
    </div>
  );
}

function DetailTabButton({
  active,
  children,
  icon,
  onClick,
}: {
  active: boolean;
  children: ReactNode;
  icon: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      className={styles.detailTab}
      data-active={active}
      onClick={onClick}
      role="tab"
      aria-selected={active}
      type="button"
    >
      {icon}
      {children}
    </button>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/70 bg-white p-3">
      <span className="block text-[12px] font-bold text-[var(--neutral-500)]">
        {label}
      </span>
      <strong className="mt-1 block text-[17px] text-[var(--brand-950)]">
        {value}
      </strong>
    </div>
  );
}

function PaymentStatusPill({ status }: { status: PaymentStatus }) {
  const toneClass = {
    cancelled: "border-red-200 bg-red-50 text-red-700",
    paid: "border-emerald-200 bg-emerald-50 text-emerald-700",
    partially_paid: "border-amber-200 bg-amber-50 text-amber-700",
    unpaid: "border-slate-200 bg-slate-50 text-slate-600",
  }[status];

  return (
    <span
      className={`inline-flex min-h-7 items-center rounded-full border px-2.5 text-[12px] font-extrabold ${toneClass}`}
    >
      {getPaymentLabel(status)}
    </span>
  );
}

function getPaymentLabel(status: PaymentStatus) {
  const labels: Record<PaymentStatus, string> = {
    cancelled: "Đã hủy",
    paid: "Đã thanh toán",
    partially_paid: "Thanh toán một phần",
    unpaid: "Chưa thanh toán",
  };

  return labels[status] ?? "Chưa thanh toán";
}

function getStudentReceiptFilterOptions(receipts: ReceiptListItem[]) {
  const options = [{ label: "Tất cả lớp", value: RECEIPT_FILTER_ALL }];
  const classMap = new Map<string, string>();
  const hasMultiClassReceipt = receipts.some(
    (receipt) => receipt.scopeType === "multi_class",
  );

  for (const receipt of receipts) {
    const snapshots = getReceiptClassSnapshots(receipt);

    for (const snapshot of snapshots) {
      if (!snapshot.classId || classMap.has(snapshot.classId)) {
        continue;
      }

      classMap.set(snapshot.classId, snapshot.className);
    }
  }

  if (hasMultiClassReceipt) {
    options.push({ label: "Hóa đơn gộp", value: RECEIPT_FILTER_MULTI });
  }

  for (const [classId, className] of classMap) {
    options.push({ label: className, value: `class:${classId}` });
  }

  return options;
}

function filterStudentReceipts(receipts: ReceiptListItem[], filter: string) {
  if (filter === RECEIPT_FILTER_ALL) {
    return receipts;
  }

  if (filter === RECEIPT_FILTER_MULTI) {
    return receipts.filter((receipt) => receipt.scopeType === "multi_class");
  }

  if (filter.startsWith("class:")) {
    const classId = filter.replace("class:", "");

    return receipts.filter((receipt) =>
      getReceiptClassSnapshots(receipt).some(
        (snapshot) => snapshot.classId === classId,
      ),
    );
  }

  return receipts;
}

function getReceiptClassSnapshots(receipt: ReceiptListItem) {
  if (receipt.classSnapshots?.length) {
    return receipt.classSnapshots;
  }

  return [
    {
      classId: receipt.classId,
      className: receipt.className,
      makeupPrice: 0,
      regularPrice: 0,
    },
  ];
}

function SectionTitle({
  children,
  icon,
}: {
  children: ReactNode;
  icon: ReactNode;
}) {
  return (
    <h4 className="flex items-center gap-2 text-[14px] font-extrabold text-[var(--brand-700)]">
      {icon}
      {children}
    </h4>
  );
}

function formatDate(value?: string) {
  if (!value) {
    return "Chưa có";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Chưa có";
  }

  return dateFormatter.format(date);
}
