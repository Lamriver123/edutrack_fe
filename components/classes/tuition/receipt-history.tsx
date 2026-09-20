"use client";

import {
  CheckCircle2,
  Download,
  Eye,
  FileText,
  LoaderCircle,
  RotateCcw,
  XCircle,
} from "lucide-react";
import { useMemo, useState } from "react";
import { EmptyState, SecondaryAction } from "@/components/classes/classroom-ui";
import { formatMoney } from "@/components/classes/classroom-utils";
import { SelectPicker } from "@/components/ui/select-picker";
import type { PaymentStatus, ReceiptListItem } from "@/types/school";

const ALL_RECEIPT_PERIODS = "all";
const BULK_RECEIPT_DOWNLOAD_ID = "__bulk_receipt_download__";
const VIETNAM_TIMEZONE_OFFSET_MS = 7 * 60 * 60 * 1000;

export function ReceiptHistory({
  isMutatingReceipt,
  onBulkDownload,
  onCancel,
  onDownload,
  onPayment,
  onRetryPdf,
  onView,
  receipts,
}: {
  isMutatingReceipt: string;
  onBulkDownload: (receipts: ReceiptListItem[]) => void;
  onCancel: (receipt: ReceiptListItem) => void;
  onDownload: (receipt: ReceiptListItem) => void;
  onPayment: (receipt: ReceiptListItem) => void;
  onRetryPdf: (receipt: ReceiptListItem) => void;
  onView: (receipt: ReceiptListItem) => void;
  receipts: ReceiptListItem[];
}) {
  const [periodFilter, setPeriodFilter] = useState(ALL_RECEIPT_PERIODS);
  const [selectedReceiptIds, setSelectedReceiptIds] = useState<string[]>([]);
  const periodOptions = useMemo(() => getReceiptPeriodOptions(receipts), [receipts]);
  const effectivePeriodFilter =
    periodFilter === ALL_RECEIPT_PERIODS ||
    periodOptions.some((option) => option.key === periodFilter)
      ? periodFilter
      : ALL_RECEIPT_PERIODS;
  const filteredReceipts = useMemo(
    () =>
      effectivePeriodFilter === ALL_RECEIPT_PERIODS
        ? receipts
        : receipts.filter(
            (receipt) => getReceiptPeriodKey(receipt) === effectivePeriodFilter,
          ),
    [effectivePeriodFilter, receipts],
  );
  const downloadableReceipts = useMemo(
    () => filteredReceipts.filter((receipt) => receipt.pdfStatus === "generated"),
    [filteredReceipts],
  );
  const selectedReceipts = useMemo(() => {
    const selectedIdSet = new Set(selectedReceiptIds);

    return downloadableReceipts.filter((receipt) =>
      selectedIdSet.has(receipt.id),
    );
  }, [downloadableReceipts, selectedReceiptIds]);
  const allDownloadableSelected =
    Boolean(downloadableReceipts.length) &&
    selectedReceipts.length === downloadableReceipts.length;
  const isBulkDownloading = isMutatingReceipt === BULK_RECEIPT_DOWNLOAD_ID;
  const selectedPeriodOption = periodOptions.find(
    (option) => option.key === effectivePeriodFilter,
  );
  const visibleSummary =
    selectedPeriodOption ??
    getReceiptPeriodSummary(ALL_RECEIPT_PERIODS, "Tất cả đợt", receipts);

  function toggleReceiptSelection(receiptId: string, checked: boolean) {
    setSelectedReceiptIds((current) =>
      checked
        ? [...new Set([...current, receiptId])]
        : current.filter((item) => item !== receiptId),
    );
  }

  function toggleAllDownloadable(checked: boolean) {
    setSelectedReceiptIds(
      checked ? downloadableReceipts.map((receipt) => receipt.id) : [],
    );
  }

  return (
    <section className="rounded-lg border border-[var(--neutral-200)] bg-white p-4">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h3 className="text-[18px] font-extrabold text-[var(--brand-950)]">
            Lịch sử hóa đơn
          </h3>
          <p className="text-[14px] font-semibold text-[var(--neutral-500)]">
            Theo dõi trạng thái thanh toán và tải PDF gửi phụ huynh.
          </p>
        </div>
        {receipts.length ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <SecondaryAction
              className="h-12 justify-center px-4"
              disabled={!selectedReceipts.length || isBulkDownloading}
              icon={
                isBulkDownloading ? (
                  <LoaderCircle className="animate-spin" size={16} />
                ) : (
                  <Download size={16} />
                )
              }
              onClick={() => onBulkDownload(selectedReceipts)}
              type="button"
            >
              {isBulkDownloading
                ? "Đang nén..."
                : selectedReceipts.length
                  ? `Tải ${selectedReceipts.length} hóa đơn`
                  : "Tải đã chọn"}
            </SecondaryAction>
            <div className="grid gap-1 sm:min-w-[320px]">
              <SelectField
                label=""
                onChange={(value) => {
                  setPeriodFilter(value);
                  setSelectedReceiptIds([]);
                }}
                options={[
                  { label: "Tất cả đợt", value: ALL_RECEIPT_PERIODS },
                  ...periodOptions.map((option) => ({
                    label: option.label,
                    value: option.key,
                  })),
                ]}
                value={effectivePeriodFilter}
              />
              <span className="text-[13px] font-semibold text-[var(--neutral-500)]">
                {visibleSummary.count} hóa đơn -{" "}
                {formatMoney(visibleSummary.total)}
              </span>
            </div>
          </div>
        ) : null}
      </div>

      {receipts.length ? (
        <>
          <div className="grid gap-2 lg:hidden">
            {filteredReceipts.map((receipt) => {
              const isDownloadable = receipt.pdfStatus === "generated";
              const isSelected = selectedReceiptIds.includes(receipt.id);

              return (
              <article
                className={`rounded-lg border bg-white p-3 shadow-[var(--shadow-sm)] ${
                  isSelected
                    ? "border-[var(--brand-300)] ring-2 ring-[var(--brand-100)]"
                    : "border-[var(--neutral-200)]"
                }`}
                key={receipt.id}
              >
                <div className="flex items-start gap-3">
                  <input
                    aria-label={`Chọn hóa đơn ${receipt.receiptNumber}`}
                    checked={isSelected}
                    className="mt-1 size-5 shrink-0 accent-[var(--brand-600)] disabled:cursor-not-allowed disabled:opacity-40"
                    disabled={!isDownloadable || isBulkDownloading}
                    onChange={(event) =>
                      toggleReceiptSelection(receipt.id, event.target.checked)
                    }
                    type="checkbox"
                  />
                  <div className="min-w-0 flex-1">
                    <h4 className="break-words text-[16px] font-extrabold leading-6 text-[var(--neutral-900)]">
                      {receipt.studentName}
                    </h4>
                    <p className="mt-1 break-all text-[13px] font-extrabold text-[var(--brand-700)]">
                      {receipt.receiptNumber}
                    </p>
                  </div>
                  <StatusPill tone={getPaymentTone(receipt.paymentStatus)}>
                    {getPaymentLabel(receipt.paymentStatus)}
                  </StatusPill>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 rounded-lg bg-[var(--neutral-50)] p-3 text-[13px] font-semibold text-[var(--neutral-500)]">
                  <span>Kỳ hóa đơn</span>
                  <strong className="text-right text-[var(--neutral-800)]">
                    {formatDate(receipt.periodStart)} -{" "}
                    {formatDate(receipt.periodEnd)}
                  </strong>
                  <span>Số buổi</span>
                  <strong className="text-right text-[var(--neutral-800)]">
                    {receipt.lessonCount} buổi
                  </strong>
                  <span>Tổng tiền</span>
                  <strong className="text-right text-[var(--brand-950)]">
                    {formatMoney(receipt.totalAmount)}
                  </strong>
                </div>

                {receipt.pdfStatus === "failed" ? (
                  <div className="mt-3">
                    <StatusPill tone="danger">Lỗi PDF</StatusPill>
                  </div>
                ) : null}

                <ReceiptActions
                  className="mt-3 justify-end border-t border-[var(--neutral-100)] pt-3"
                  isMutatingReceipt={isMutatingReceipt}
                  onCancel={onCancel}
                  onDownload={onDownload}
                  onPayment={onPayment}
                  onRetryPdf={onRetryPdf}
                  onView={onView}
                  receipt={receipt}
                />
              </article>
              );
            })}
          </div>

          <div className="hidden max-w-full overflow-x-auto pb-2 lg:block">
            <div className="grid min-w-[980px] gap-2">
              <div className="grid grid-cols-[44px_130px_1.1fr_120px_140px_145px_230px] gap-3 rounded-lg bg-[var(--neutral-50)] px-4 py-3 text-[13px] font-bold text-[var(--neutral-500)]">
                <span className="grid place-items-center">
                  <input
                    aria-label="Chọn tất cả hóa đơn có PDF"
                    checked={allDownloadableSelected}
                    className="size-5 accent-[var(--brand-600)] disabled:cursor-not-allowed disabled:opacity-40"
                    disabled={!downloadableReceipts.length || isBulkDownloading}
                    onChange={(event) =>
                      toggleAllDownloadable(event.target.checked)
                    }
                    type="checkbox"
                  />
                </span>
                <span>Mã hóa đơn</span>
                <span>Học sinh</span>
                <span>Số buổi</span>
                <span>Tổng tiền</span>
                <span>Trạng thái</span>
                <span>Thao tác</span>
              </div>
              {filteredReceipts.map((receipt) => {
                const isDownloadable = receipt.pdfStatus === "generated";
                const isSelected = selectedReceiptIds.includes(receipt.id);

                return (
                  <div
                    className={`grid grid-cols-[44px_130px_1.1fr_120px_140px_145px_230px] items-center gap-3 rounded-lg border px-4 py-3 ${
                      isSelected
                        ? "border-[var(--brand-300)] bg-[var(--brand-50)]"
                        : "border-[var(--neutral-200)]"
                    }`}
                    key={receipt.id}
                  >
                    <span className="grid place-items-center">
                      <input
                        aria-label={`Chọn hóa đơn ${receipt.receiptNumber}`}
                        checked={isSelected}
                        className="size-5 accent-[var(--brand-600)] disabled:cursor-not-allowed disabled:opacity-40"
                        disabled={!isDownloadable || isBulkDownloading}
                        onChange={(event) =>
                          toggleReceiptSelection(
                            receipt.id,
                            event.target.checked,
                          )
                        }
                        type="checkbox"
                      />
                    </span>
                    <span className="truncate text-[14px] font-extrabold text-[var(--brand-800)]">
                      {receipt.receiptNumber}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-[14px] font-bold text-[var(--neutral-800)]">
                        {receipt.studentName}
                      </span>
                      <span className="block truncate text-[13px] font-semibold text-[var(--neutral-500)]">
                        {formatDate(receipt.periodStart)} -{" "}
                        {formatDate(receipt.periodEnd)}
                      </span>
                    </span>
                    <span className="text-[14px] font-bold text-[var(--neutral-600)]">
                      {receipt.lessonCount} buổi
                    </span>
                    <strong className="text-[14px] text-[var(--brand-950)]">
                      {formatMoney(receipt.totalAmount)}
                    </strong>
                    <div className="grid gap-1">
                      <StatusPill tone={getPaymentTone(receipt.paymentStatus)}>
                        {getPaymentLabel(receipt.paymentStatus)}
                      </StatusPill>
                      {receipt.pdfStatus === "failed" ? (
                        <StatusPill tone="danger">Lỗi PDF</StatusPill>
                      ) : null}
                    </div>
                    <ReceiptActions
                      isMutatingReceipt={isMutatingReceipt}
                      onCancel={onCancel}
                      onDownload={onDownload}
                      onPayment={onPayment}
                      onRetryPdf={onRetryPdf}
                      onView={onView}
                      receipt={receipt}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </>
      ) : (
        <EmptyState
          icon={<FileText size={22} />}
          text="Chưa có hóa đơn nào được phát hành cho lớp này."
          title="Chưa có lịch sử hóa đơn"
        />
      )}
    </section>
  );
}

function ReceiptActions({
  className = "",
  isMutatingReceipt,
  onCancel,
  onDownload,
  onPayment,
  onRetryPdf,
  onView,
  receipt,
}: {
  className?: string;
  isMutatingReceipt: string;
  onCancel: (receipt: ReceiptListItem) => void;
  onDownload: (receipt: ReceiptListItem) => void;
  onPayment: (receipt: ReceiptListItem) => void;
  onRetryPdf: (receipt: ReceiptListItem) => void;
  onView: (receipt: ReceiptListItem) => void;
  receipt: ReceiptListItem;
}) {
  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      <IconButton
        disabled={
          isMutatingReceipt === receipt.id || receipt.pdfStatus !== "generated"
        }
        label="Xem PDF"
        onClick={() => onView(receipt)}
      >
        <Eye size={15} />
      </IconButton>
      <IconButton
        disabled={
          isMutatingReceipt === receipt.id || receipt.pdfStatus !== "generated"
        }
        label="Tải PDF"
        onClick={() => onDownload(receipt)}
      >
        <Download size={15} />
      </IconButton>
      {receipt.pdfStatus === "failed" ? (
        <IconButton
          disabled={isMutatingReceipt === receipt.id}
          label="Tạo lại PDF"
          onClick={() => onRetryPdf(receipt)}
        >
          <RotateCcw size={15} />
        </IconButton>
      ) : null}
      <IconButton
        disabled={
          isMutatingReceipt === receipt.id ||
          receipt.paymentStatus === "cancelled"
        }
        label="Thanh toán"
        onClick={() => onPayment(receipt)}
      >
        <CheckCircle2 size={15} />
      </IconButton>
      <IconButton
        danger
        disabled={
          isMutatingReceipt === receipt.id || receipt.paymentStatus !== "unpaid"
        }
        label="Hủy"
        onClick={() => onCancel(receipt)}
      >
        <XCircle size={15} />
      </IconButton>
    </div>
  );
}

type SelectOption = {
  label: string;
  value: string;
};

function SelectField({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  options: ReadonlyArray<SelectOption>;
  value: string;
}) {
  return (
    <div className="grid gap-1.5">
      {label ? (
        <span className="text-[13px] font-bold text-[var(--neutral-700)]">
          {label}
        </span>
      ) : null}
      <SelectPicker
        ariaLabel={label || "Lọc lịch sử hóa đơn"}
        onChange={onChange}
        options={[...options]}
        value={value}
      />
    </div>
  );
}

function StatusPill({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "danger" | "neutral" | "success" | "warning";
}) {
  const toneClass = {
    danger: "border-red-200 bg-red-50 text-red-700",
    neutral: "border-slate-200 bg-slate-50 text-slate-600",
    success: "border-emerald-200 bg-emerald-50 text-emerald-700",
    warning: "border-amber-200 bg-amber-50 text-amber-700",
  }[tone];

  return (
    <span
      className={`inline-flex min-h-8 w-fit items-center rounded-full border px-3 text-[13px] font-extrabold ${toneClass}`}
    >
      {children}
    </span>
  );
}

function IconButton({
  children,
  danger = false,
  disabled,
  label,
  onClick,
}: {
  children: React.ReactNode;
  danger?: boolean;
  disabled?: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-label={label}
      className={`grid size-9 place-items-center rounded-lg border text-[13px] font-bold transition disabled:pointer-events-none disabled:opacity-45 ${
        danger
          ? "border-red-100 bg-red-50 text-red-600 hover:bg-red-100"
          : "border-[var(--neutral-200)] bg-white text-[var(--neutral-600)] hover:border-[var(--brand-200)] hover:bg-[var(--brand-50)] hover:text-[var(--brand-700)]"
      }`}
      onClick={onClick}
      title={label}
      type="button"
      disabled={disabled}
    >
      {children}
    </button>
  );
}

function getReceiptPeriodOptions(receipts: ReceiptListItem[]) {
  const periodMap = new Map<
    string,
    { count: number; from: string; key: string; label: string; to: string; total: number }
  >();

  for (const receipt of receipts) {
    const key = getReceiptPeriodKey(receipt);
    const from = toDateInputValue(receipt.periodStart);
    const to = toDateInputValue(receipt.periodEnd);
    const current = periodMap.get(key);

    if (current) {
      current.count += 1;
      current.total += receipt.totalAmount;
      continue;
    }

    periodMap.set(key, {
      count: 1,
      from,
      key,
      label: `Đợt ${formatDate(receipt.periodStart)} - ${formatDate(receipt.periodEnd)}`,
      to,
      total: receipt.totalAmount,
    });
  }

  return [...periodMap.values()].sort((first, second) => {
    if (first.from !== second.from) {
      return second.from.localeCompare(first.from);
    }

    return second.to.localeCompare(first.to);
  });
}

function getReceiptPeriodSummary(
  key: string,
  label: string,
  receipts: ReceiptListItem[],
) {
  return {
    count: receipts.length,
    key,
    label,
    total: receipts.reduce((sum, receipt) => sum + receipt.totalAmount, 0),
  };
}

function getReceiptPeriodKey(receipt: ReceiptListItem) {
  return `${toDateInputValue(receipt.periodStart)}:${toDateInputValue(
    receipt.periodEnd,
  )}`;
}

function toDateInputValue(value?: string | Date | null) {
  if (!value) {
    return "";
  }

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const vietnamDate = new Date(date.getTime() + VIETNAM_TIMEZONE_OFFSET_MS);
  const year = vietnamDate.getUTCFullYear();
  const month = String(vietnamDate.getUTCMonth() + 1).padStart(2, "0");
  const day = String(vietnamDate.getUTCDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDate(value?: string) {
  if (!value) {
    return "Chưa có";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Chưa có";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
  }).format(date);
}

function getPaymentLabel(status: PaymentStatus) {
  const labels: Record<PaymentStatus, string> = {
    cancelled: "Đã hủy",
    paid: "Đã thanh toán",
    partially_paid: "Thanh toán một phần",
    unpaid: "Chưa thanh toán",
  };

  return labels[status];
}

function getPaymentTone(status: PaymentStatus) {
  if (status === "paid") {
    return "success";
  }

  if (status === "partially_paid") {
    return "warning";
  }

  if (status === "cancelled") {
    return "danger";
  }

  return "neutral";
}
