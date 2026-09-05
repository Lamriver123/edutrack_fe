/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import {
  Badge,
  CalendarDays,
  Coins,
  FileText,
  LoaderCircle,
  MapPin,
  NotebookText,
  Phone,
  RefreshCw,
  ShieldCheck,
  UserRound,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { schoolApi } from "@/lib/api/school";
import type {
  BillingCandidates,
  ClassroomDetail,
  PaymentStatus,
  ReceiptListItem,
  Student,
} from "@/types/school";
import {
  formatMoney,
  getErrorMessage,
  getGenderLabel,
  getStudentAvatar,
} from "./classroom-utils";
import {
  EmptyState,
  InlineLoading,
  Modal,
  PrimaryAction,
  SecondaryAction,
  StudentAvatar,
} from "./classroom-ui";

const dateFormatter = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  timeZone: "Asia/Ho_Chi_Minh",
  year: "numeric",
});

type StudentDetailTab = "profile" | "receipts";

export function StudentDetailModal({
  actions,
  classroom,
  onClose,
  onIssueReceipt,
  student,
}: {
  actions?: ReactNode;
  classroom?: ClassroomDetail | null;
  onClose: () => void;
  onIssueReceipt?: (student: Student) => void;
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
          classId: classroom?.id,
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
      <div className="grid gap-5">
        <div className="grid gap-4 rounded-lg border border-[var(--neutral-200)] bg-[var(--neutral-50)] p-4 sm:grid-cols-[auto_1fr] sm:items-center">
          <StudentAvatar
            alt={student.fullName}
            size="lg"
            src={getStudentAvatar(student)}
          />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-[20px] font-extrabold text-[var(--brand-950)]">
                {student.fullName}
              </h3>
              <span
                className={`rounded-full border px-3 py-1 text-[13px] font-bold ${
                  student.status === "active"
                    ? "border-emerald-100 bg-emerald-50 text-emerald-700"
                    : "border-orange-100 bg-orange-50 text-orange-700"
                }`}
              >
                {student.status === "active" ? "Đang học" : "Tạm nghỉ"}
              </span>
            </div>
            <p className="mt-1 text-[14px] font-semibold text-[var(--neutral-500)]">
              {student.studentCode}
            </p>
          </div>
        </div>

        {actions ? (
          <div className="flex flex-col-reverse gap-3 rounded-lg border border-[var(--neutral-200)] bg-white p-3 sm:flex-row sm:justify-end">
            {actions}
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2 rounded-lg border border-[var(--neutral-200)] bg-white p-2">
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

        {activeTab === "profile" ? (
          <StudentProfileContent student={student} />
        ) : (
          <StudentReceiptContent
            candidates={candidates}
            classroom={classroom}
            error={receiptError}
            isLoading={isReceiptLoading}
            onIssueReceipt={
              onIssueReceipt ? () => onIssueReceipt(student) : undefined
            }
            onReload={() => void loadReceiptData()}
            receipts={receipts}
          />
        )}
      </div>
    </Modal>
  );
}

function StudentProfileContent({ student }: { student: Student }) {
  return (
    <div className="grid gap-5">
      <section className="grid gap-3">
        <SectionTitle icon={<UserRound size={16} />}>
          Thông tin cá nhân
        </SectionTitle>
        <div className="grid gap-3 sm:grid-cols-2">
          <DetailItem
            icon={<Badge size={16} />}
            label="Mã học sinh"
            value={student.studentCode}
          />
          <DetailItem
            icon={<UserRound size={16} />}
            label="Giới tính"
            value={getGenderLabel(student.gender)}
          />
          <DetailItem
            icon={<CalendarDays size={16} />}
            label="Ngày sinh"
            value={formatDate(student.dateOfBirth)}
          />
          <DetailItem
            icon={<Phone size={16} />}
            label="Số điện thoại"
            value={student.phone}
          />
        </div>
      </section>

      <section className="grid gap-3">
        <SectionTitle icon={<Users size={16} />}>
          Liên hệ phụ huynh
        </SectionTitle>
        <div className="grid gap-3 sm:grid-cols-2">
          <DetailItem
            icon={<UserRound size={16} />}
            label="Tên phụ huynh"
            value={student.parent?.fullName}
          />
          <DetailItem
            icon={<Phone size={16} />}
            label="Số điện thoại phụ huynh"
            value={student.parent?.phone}
          />
          <DetailItem
            icon={<ShieldCheck size={16} />}
            label="Quan hệ"
            value={student.parent?.relation}
          />
          <DetailItem
            icon={<NotebookText size={16} />}
            label="Ghi chú phụ huynh"
            value={student.parent?.note}
          />
        </div>
      </section>

      <section className="grid gap-3">
        <SectionTitle icon={<NotebookText size={16} />}>
          Ghi chú và địa chỉ
        </SectionTitle>
        <div className="grid gap-3">
          <DetailItem
            icon={<MapPin size={16} />}
            label="Địa chỉ"
            value={student.address}
          />
          <DetailItem
            icon={<NotebookText size={16} />}
            label="Ghi chú học sinh"
            value={student.note}
          />
        </div>
      </section>
    </div>
  );
}

function StudentReceiptContent({
  candidates,
  classroom,
  error,
  isLoading,
  onIssueReceipt,
  onReload,
  receipts,
}: {
  candidates: BillingCandidates | null;
  classroom?: ClassroomDetail | null;
  error: string;
  isLoading: boolean;
  onIssueReceipt?: () => void;
  onReload: () => void;
  receipts: ReceiptListItem[];
}) {
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

      {classroom ? (
        <section className="rounded-lg border border-[var(--brand-100)] bg-[var(--brand-50)] p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <SectionTitle icon={<Coins size={16} />}>
                Kỳ học phí hiện tại
              </SectionTitle>
              <p className="mt-1 text-[13px] font-semibold text-[var(--neutral-500)]">
                {candidates
                  ? `${formatDate(candidates.periodStart)} - ${formatDate(
                      candidates.periodEnd,
                    )}`
                  : "Chưa có dữ liệu kỳ hiện tại."}
              </p>
            </div>
            <PrimaryAction
              className="w-full sm:w-auto"
              disabled={!onIssueReceipt || !candidates?.summary.unbilledLessonCount}
              icon={<FileText size={16} />}
              onClick={onIssueReceipt}
              type="button"
            >
              Xuất hóa đơn
            </PrimaryAction>
          </div>

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
        </section>
      ) : null}

      <section className="rounded-lg border border-[var(--neutral-200)] bg-white p-4">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <SectionTitle icon={<FileText size={16} />}>
            Lịch sử hóa đơn
          </SectionTitle>
          <SecondaryAction
            className="h-10 w-full px-3 sm:w-auto"
            icon={isLoading ? <LoaderCircle size={15} /> : <RefreshCw size={15} />}
            onClick={onReload}
            type="button"
          >
            Tải lại
          </SecondaryAction>
        </div>

        {receipts.length ? (
          <div className="grid gap-2">
            {receipts.map((receipt) => (
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
      className={`inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-[14px] font-bold transition ${
        active
          ? "bg-[var(--brand-50)] text-[var(--brand-700)] ring-1 ring-[var(--brand-100)]"
          : "text-[var(--neutral-500)] hover:bg-[var(--neutral-50)] hover:text-[var(--brand-600)]"
      }`}
      onClick={onClick}
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

function DetailItem({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value?: string;
}) {
  return (
    <div className="grid gap-2 rounded-lg border border-[var(--neutral-200)] bg-white p-3">
      <span className="flex items-center gap-2 text-[13px] font-bold text-[var(--neutral-500)]">
        {icon}
        {label}
      </span>
      <span className="break-words text-[15px] font-bold leading-6 text-[var(--neutral-800)]">
        {value?.trim() || "Chưa có"}
      </span>
    </div>
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
