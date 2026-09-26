"use client";

import {
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  Coins,
  FileText,
  LoaderCircle,
  RefreshCw,
  Upload,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ChangeEvent, CSSProperties, ReactNode } from "react";
import { createPortal } from "react-dom";
import type { InvoiceTemplate } from "@/types/invoice-template";
import { ReceiptTemplatePicker } from "../receipt-template-picker";
import type {
  BillingCandidates,
  Classroom,
  PaymentStatus,
  ReceiptListItem,
  Student,
  StudentBillingOverview,
} from "@/types/school";
import {
  formatCurrencyInput,
  formatMoney,
  getVietnamTodayInputDate,
  toVietnamDateInputValue,
} from "../classroom-utils";
import formStyles from "../classroom-manager.module.css";
import {
  EmptyState,
  InlineLoading,
  Modal,
  PrimaryAction,
  SecondaryAction,
  TextArea,
  TextInput,
} from "../classroom-ui";
import { TuitionMetric } from "./tuition-metric";

export type BillingFilterState = {
  fromDate: string;
  toDate: string;
};

export type IssueFormState = BillingFilterState & {
  dueDate: string;
  discountAmount: string;
  adjustmentAmount: string;
  strengthsComment: string;
  improvementsComment: string;
  generalComment: string;
  paymentNote: string;
};

export type PaymentFormState = {
  paymentStatus: Exclude<PaymentStatus, "cancelled">;
  paidAmount: string;
  paidAt: string;
  paymentNote: string;
  proofFile: File | null;
};

export type PriceFormState = {
  regularPrice: string;
  makeupPrice: string;
  priceEffectiveFrom: string;
};

export type SelectOption = {
  icon?: ReactNode;
  label: string;
  value: string;
};

export type IssueMode = "class" | "multi_class";

export const initialFilters: BillingFilterState = {
  fromDate: "",
  toDate: "",
};

export const initialIssueForm: IssueFormState = {
  ...initialFilters,
  dueDate: "",
  discountAmount: "",
  adjustmentAmount: "",
  strengthsComment: "",
  improvementsComment: "",
  generalComment: "",
  paymentNote: "",
};

const paymentStatusOptions: Array<{
  label: string;
  value: Exclude<PaymentStatus, "cancelled">;
}> = [
  { label: "Chưa thanh toán", value: "unpaid" },
  { label: "Thanh toán một phần", value: "partially_paid" },
  { label: "Đã thanh toán", value: "paid" },
];

const VIETNAM_TIMEZONE_OFFSET_MS = 7 * 60 * 60 * 1000;
export const BULK_RECEIPT_DOWNLOAD_ID = "__bulk_receipt_download__";
const SELECT_MENU_GAP = 8;
const SELECT_MENU_MAX_HEIGHT = 252;
export function IssueReceiptModal({
  selectedTemplate,
  onTemplateChange,
  candidates,
  discountAmount,
  form,
  issueMode,
  isCandidateLoading,
  isIssuing,
  isPreviewing,
  onClose,
  onFormChange,
  onLoadCandidates,
  onPreview,
  onRequestIssue,
  onSelectAll,
  onToggleClass,
  onToggleEntry,
  selectedPeriod,
  selectedClassIds,
  selectedSubtotal,
  selectedTotal,
  selectedTuitionIds,
  student,
  studentBillingOverview,
}: {
  selectedTemplate: InvoiceTemplate | null;
  onTemplateChange: (template: InvoiceTemplate | null) => void;
  candidates: BillingCandidates | null;
  discountAmount: number;
  form: IssueFormState;
  issueMode: IssueMode;
  isCandidateLoading: boolean;
  isIssuing: boolean;
  isPreviewing: boolean;
  onClose: () => void;
  onFormChange: (form: IssueFormState) => void;
  onLoadCandidates: () => void;
  onPreview: () => void;
  onRequestIssue: () => void;
  onSelectAll: (checked: boolean) => void;
  onToggleClass: (classId: string) => void;
  onToggleEntry: (tuitionEntryId: string) => void;
  selectedPeriod: { from: string; to: string } | null;
  selectedClassIds: string[];
  selectedSubtotal: number;
  selectedTotal: number;
  selectedTuitionIds: string[];
  student: Student;
  studentBillingOverview: StudentBillingOverview | null;
}) {
  const allSelected =
    Boolean(candidates?.tuitionEntries.length) &&
    selectedTuitionIds.length === candidates?.tuitionEntries.length;

  return (
    <Modal
      onClose={onClose}
      title={`${
        issueMode === "multi_class" ? "Xuất hóa đơn gộp" : "Xuất hóa đơn"
      } - ${student.fullName}`}
    >
      <div className="grid min-w-0 gap-5">
        <ReceiptTemplatePicker
          value={selectedTemplate}
          onChange={onTemplateChange}
          disabled={isIssuing || isPreviewing}
        />
        <div className="grid min-w-0 gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
          <TextInput
            icon={<CalendarDays size={16} />}
            label="Lọc từ ngày"
            onChange={(event) =>
              onFormChange({ ...form, fromDate: event.target.value })
            }
            type="date"
            value={form.fromDate}
          />
          <TextInput
            icon={<CalendarDays size={16} />}
            label="Lọc đến ngày"
            onChange={(event) =>
              onFormChange({ ...form, toDate: event.target.value })
            }
            type="date"
            value={form.toDate}
          />
          <SecondaryAction
            className="w-full md:w-auto"
            icon={<RefreshCw size={15} />}
            onClick={onLoadCandidates}
            type="button"
          >
            Tải kỳ
          </SecondaryAction>
        </div>

        {issueMode === "multi_class" ? (
          <section className="rounded-lg border border-[var(--brand-100)] bg-[var(--brand-50)] p-4">
            <div className="mb-3">
              <h4 className="text-[15px] font-extrabold text-[var(--brand-950)]">
                Chọn lớp cần gộp
              </h4>
              <p className="text-[13px] font-semibold text-[var(--neutral-500)]">
                Mặc định chọn các lớp có buổi học chưa xuất hóa đơn.
              </p>
            </div>
            {studentBillingOverview?.classes.length ? (
              <div className="grid gap-2 sm:grid-cols-2">
                {studentBillingOverview.classes.map((item) => {
                  const isChecked = selectedClassIds.includes(item.class.id);

                  return (
                    <label
                      className={`grid cursor-pointer grid-cols-[22px_1fr] gap-3 rounded-lg border bg-white p-3 transition ${
                        isChecked
                          ? "border-[var(--brand-300)] ring-2 ring-[var(--brand-100)]"
                          : "border-[var(--neutral-200)] hover:border-[var(--brand-200)]"
                      }`}
                      key={item.class.id}
                    >
                      <input
                        checked={isChecked}
                        className="mt-1 size-4 accent-[var(--brand-600)]"
                        onChange={() => onToggleClass(item.class.id)}
                        type="checkbox"
                      />
                      <span className="min-w-0">
                        <span className="flex items-center gap-2">
                          <span
                            className="size-3 rounded-full"
                            style={{
                              backgroundColor:
                                item.class.colorHex || "var(--brand-500)",
                            }}
                          />
                          <strong className="truncate text-[14px] text-[var(--neutral-800)]">
                            {item.class.name}
                          </strong>
                        </span>
                        <span className="mt-1 block text-[13px] font-semibold text-[var(--neutral-500)]">
                          {item.unbilledLessonCount} buổi chờ xuất -{" "}
                          {formatMoney(item.unbilledAmount)}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
            ) : (
              <p className="text-[14px] font-semibold text-[var(--neutral-500)]">
                Chưa tìm thấy lớp đang học của học sinh này.
              </p>
            )}
          </section>
        ) : null}

        {isCandidateLoading ? (
          <InlineLoading text="Đang gom buổi học và bài kiểm tra..." />
        ) : candidates ? (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              <TuitionMetric
                icon={<Coins size={17} />}
                label="Buổi đã chọn"
                tone="primary"
                value={`${selectedTuitionIds.length} buổi`}
              />
              <TuitionMetric
                icon={<FileText size={17} />}
                label="Bài kiểm tra"
                tone="info"
                value={`${candidates.exams.length} bài`}
              />
              <TuitionMetric
                icon={<Coins size={17} />}
                label="Tổng dự kiến"
                tone="warning"
                value={formatMoney(selectedTotal)}
              />
            </div>

            <div className="grid gap-2 rounded-lg border border-[var(--brand-100)] bg-[var(--brand-50)] p-4 sm:grid-cols-[auto_1fr] sm:items-center">
              <span className="grid size-11 place-items-center rounded-lg bg-white text-[var(--brand-600)] shadow-[var(--shadow-sm)]">
                <CalendarDays size={17} />
              </span>
              <span className="min-w-0">
                <span className="block text-[13px] font-bold text-[var(--neutral-500)]">
                  Kỳ hóa đơn theo buổi đã chọn
                </span>
                <strong className="block text-[16px] font-extrabold text-[var(--brand-950)]">
                  {selectedPeriod
                    ? `${formatDate(selectedPeriod.from)} - ${formatDate(
                        selectedPeriod.to,
                      )}`
                    : "Chưa có buổi học được chọn"}
                </strong>
              </span>
            </div>

            <section className="rounded-lg border border-[var(--neutral-200)]">
              <div className="flex items-center justify-between gap-3 border-b border-[var(--neutral-100)] px-4 py-3">
                <div>
                  <h4 className="text-[15px] font-extrabold text-[var(--brand-950)]">
                    Buổi học cần tính tiền
                  </h4>
                  <p className="text-[13px] font-semibold text-[var(--neutral-500)]">
                    Mặc định chọn 10 buổi đầu tiên chưa xuất hóa đơn.
                  </p>
                </div>
                <label className="inline-flex items-center gap-2 text-[13px] font-bold text-[var(--neutral-600)]">
                  <input
                    checked={allSelected}
                    className="size-4 accent-[var(--brand-600)]"
                    onChange={(event) => onSelectAll(event.target.checked)}
                    type="checkbox"
                  />
                  Tất cả
                </label>
              </div>

              <div className="max-h-[270px] overflow-auto p-3">
                {candidates.tuitionEntries.length ? (
                  <div className="grid gap-2">
                    {candidates.tuitionEntries.map((entry) => {
                      const lesson = getTuitionEntryLessonText(entry);

                      return (
                        <label
                          className="grid cursor-pointer grid-cols-[22px_1fr_auto] items-center gap-3 rounded-lg border border-[var(--neutral-200)] p-3 transition hover:border-[var(--brand-200)] hover:bg-[var(--brand-50)]"
                          key={entry.tuitionEntryId}
                        >
                          <input
                            checked={selectedTuitionIds.includes(
                              entry.tuitionEntryId,
                            )}
                            className="size-4 accent-[var(--brand-600)]"
                            onChange={() => onToggleEntry(entry.tuitionEntryId)}
                            type="checkbox"
                          />
                          <span className="min-w-0">
                            {issueMode === "multi_class" ? (
                              <span className="mb-1 inline-flex max-w-full items-center gap-1.5 rounded-full border border-[var(--brand-100)] bg-[var(--brand-50)] px-2 py-1 text-[12px] font-extrabold text-[var(--brand-700)]">
                                <span
                                  className="size-2 rounded-full"
                                  style={{
                                    backgroundColor:
                                      entry.classColorHex ||
                                      "var(--brand-500)",
                                  }}
                                />
                                <span className="truncate">
                                  {entry.className}
                                </span>
                              </span>
                            ) : null}
                            <span className="block truncate text-[14px] font-extrabold text-[var(--neutral-800)]">
                              {formatDate(entry.date)} | {entry.startTime} -{" "}
                              {entry.endTime}
                            </span>
                            {entry.scheduleType === "one_on_one" ? (
                              <span className="mt-1 inline-flex w-fit items-center rounded-md border border-pink-200 bg-pink-50 px-2 py-0.5 text-[11px] font-extrabold text-pink-700">
                                Kèm 1:1
                              </span>
                            ) : null}
                            <span className="block truncate text-[13px] font-bold text-[var(--neutral-600)]">
                              {lesson.title}
                            </span>
                            {lesson.detail ? (
                              <span className="block truncate text-[12px] font-semibold text-[var(--neutral-500)]">
                                {lesson.detail}
                              </span>
                            ) : null}
                            {entry.makeupForClassName ? (
                              <span className="mt-1 block truncate text-[12px] font-extrabold text-amber-700">
                                Học tại {entry.attendedClassName || entry.className} - bù cho{" "}
                                {entry.makeupForClassName}
                              </span>
                            ) : null}
                          </span>
                          <strong className="text-[14px] text-[var(--brand-800)]">
                            {formatMoney(entry.amount)}
                          </strong>
                        </label>
                      );
                    })}
                  </div>
                ) : (
                  <EmptyState
                    icon={<Coins size={22} />}
                    text="Không có buổi học nào chưa xuất hóa đơn trong kỳ này."
                    title="Không có buổi học"
                  />
                )}
              </div>
            </section>

            <section className="rounded-lg border border-[var(--neutral-200)] p-4">
              <h4 className="text-[15px] font-extrabold text-[var(--brand-950)]">
                Bài kiểm tra trong kỳ
              </h4>
              {candidates.exams.length ? (
                <div className="mt-3 grid gap-2">
                  {candidates.exams.map((exam) => (
                    <div
                      className="rounded-lg border border-[var(--neutral-200)] bg-[var(--neutral-50)] p-3"
                      key={exam.examScoreId || exam.examId}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <strong className="text-[14px] text-[var(--neutral-800)]">
                          {exam.title}
                        </strong>
                        <span className="text-[13px] font-extrabold text-[var(--brand-700)]">
                          {exam.score}/{exam.maxScore}
                        </span>
                      </div>
                      <p className="mt-1 text-[13px] font-semibold text-[var(--neutral-500)]">
                        {formatDate(exam.date)} |{" "}
                        {exam.note || exam.description || "Chưa có ghi chú"}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-[14px] font-semibold text-[var(--neutral-500)]">
                  Chưa có bài kiểm tra nào trong kỳ hóa đơn.
                </p>
              )}
            </section>

            <div className="grid min-w-0 gap-3 md:grid-cols-3">
              <TextInput
                label="Hạn thanh toán"
                onChange={(event) =>
                  onFormChange({ ...form, dueDate: event.target.value })
                }
                type="date"
                value={form.dueDate}
              />
              <CurrencyField
                label="Giảm giá"
                onChange={(value) =>
                  onFormChange({ ...form, discountAmount: value })
                }
                value={form.discountAmount}
              />
              <CurrencyField
                label="Phụ thu"
                onChange={(value) =>
                  onFormChange({ ...form, adjustmentAmount: value })
                }
                value={form.adjustmentAmount}
              />
            </div>

            <section className="rounded-lg border border-[var(--neutral-200)] bg-[var(--neutral-50)] p-4">
              <h4 className="text-[15px] font-extrabold text-[var(--brand-950)]">
                Nhận xét của giáo viên
              </h4>
              <p className="mt-1 text-[13px] font-semibold text-[var(--neutral-500)]">
                Nội dung này sẽ được tách thành 3 ô trong phiếu gửi phụ huynh.
              </p>
              <div className="mt-3 grid min-w-0 gap-3 lg:grid-cols-3">
                <TextArea
                  label="Điểm mạnh"
                  onChange={(event) =>
                    onFormChange({
                      ...form,
                      strengthsComment: event.target.value,
                    })
                  }
                  placeholder="Ví dụ: phát âm tốt, làm bài đều, tự tin hơn..."
                  value={form.strengthsComment}
                />
                <TextArea
                  label="Cần cải thiện"
                  onChange={(event) =>
                    onFormChange({
                      ...form,
                      improvementsComment: event.target.value,
                    })
                  }
                  placeholder="Ví dụ: luyện nghe thêm, ôn lại từ vựng..."
                  value={form.improvementsComment}
                />
                <TextArea
                  label="Nhận xét chung"
                  onChange={(event) =>
                    onFormChange({
                      ...form,
                      generalComment: event.target.value,
                    })
                  }
                  placeholder="Nhận xét tình hình học tập, thái độ học..."
                  value={form.generalComment}
                />
              </div>
            </section>
            <TextArea
              label="Ghi chú thanh toán"
              onChange={(event) =>
                onFormChange({ ...form, paymentNote: event.target.value })
              }
              placeholder="Ví dụ: Phụ huynh vui lòng chuyển khoản trước ngày..."
              value={form.paymentNote}
            />

            <div className="rounded-lg border border-[var(--brand-100)] bg-[var(--brand-50)] p-4">
              <div className="grid gap-2 text-[14px] font-bold text-[var(--neutral-600)]">
                <SummaryLine label="Tạm tính" value={formatMoney(selectedSubtotal)} />
                <SummaryLine label="Giảm giá" value={formatMoney(discountAmount)} />
                <SummaryLine
                  label="Tổng thanh toán"
                  strong
                  value={formatMoney(selectedTotal)}
                />
              </div>
            </div>
          </>
        ) : null}

        <div className="flex flex-col-reverse gap-2 border-t border-[var(--neutral-100)] pt-4 sm:flex-row sm:justify-end">
          <SecondaryAction disabled={isIssuing} onClick={onClose} type="button">
            Hủy
          </SecondaryAction>
          <SecondaryAction
            disabled={
              isPreviewing || isIssuing || !selectedTuitionIds.length || !selectedTemplate
            }
            icon={
              isPreviewing ? (
                <LoaderCircle className="animate-spin" size={16} />
              ) : (
                <FileText size={16} />
              )
            }
            onClick={onPreview}
            type="button"
          >
            Xem trước
          </SecondaryAction>
          <PrimaryAction
            disabled={
              isIssuing || isPreviewing || !selectedTuitionIds.length || !selectedTemplate
            }
            icon={
              isIssuing ? (
                <LoaderCircle className="animate-spin" size={16} />
              ) : (
                <CheckCircle2 size={16} />
              )
            }
            onClick={onRequestIssue}
            type="button"
          >
            Phát hành hóa đơn
          </PrimaryAction>
        </div>
      </div>
    </Modal>
  );
}

export function getReceiptPreviewLoadingHtml() {
  return `<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Đang tạo bản xem trước hóa đơn</title>
  <style>
    body {
      display: grid;
      min-height: 100vh;
      margin: 0;
      place-items: center;
      background: #eef2ff;
      color: #1e1b4b;
      font-family: Arial, "DejaVu Sans", "Liberation Sans", Tahoma, sans-serif;
    }
    .box {
      width: min(420px, calc(100vw - 32px));
      border: 1px solid #c7d2fe;
      border-radius: 8px;
      background: #ffffff;
      padding: 28px;
      text-align: center;
      box-shadow: 0 24px 60px rgba(30, 27, 75, 0.14);
    }
    .spinner {
      width: 38px;
      height: 38px;
      margin: 0 auto 14px;
      border: 4px solid #e0e7ff;
      border-top-color: #4f46e5;
      border-radius: 999px;
      animation: spin 0.8s linear infinite;
    }
    h1 { margin: 0; font-size: 22px; }
    p { margin: 8px 0 0; color: #64748b; font-weight: 700; }
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <main class="box">
    <div class="spinner"></div>
    <h1>Đang tạo bản xem trước</h1>
    <p>EduTrack đang gom dữ liệu hóa đơn...</p>
  </main>
</body>
</html>`;
}

export function getReceiptPreviewErrorHtml() {
  return `<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Không tạo được bản xem trước</title>
  <style>
    body {
      display: grid;
      min-height: 100vh;
      margin: 0;
      place-items: center;
      background: #fef2f2;
      color: #7f1d1d;
      font-family: Arial, "DejaVu Sans", "Liberation Sans", Tahoma, sans-serif;
    }
    .box {
      width: min(440px, calc(100vw - 32px));
      border: 1px solid #fecaca;
      border-radius: 8px;
      background: #ffffff;
      padding: 28px;
      text-align: center;
      box-shadow: 0 24px 60px rgba(127, 29, 29, 0.12);
    }
    h1 { margin: 0; font-size: 22px; }
    p { margin: 8px 0 0; color: #991b1b; font-weight: 700; }
  </style>
</head>
<body>
  <main class="box">
    <h1>Không tạo được bản xem trước</h1>
    <p>Vui lòng quay lại EduTrack, kiểm tra dữ liệu và thử lại.</p>
  </main>
</body>
</html>`;
}

export function PaymentModal({
  form,
  isLoading,
  onChange,
  onClose,
  onSubmit,
  receipt,
}: {
  form: PaymentFormState;
  isLoading: boolean;
  onChange: (form: PaymentFormState) => void;
  onClose: () => void;
  onSubmit: () => void;
  receipt: ReceiptListItem;
}) {
  return (
    <Modal onClose={onClose} size="sm" title="Cập nhật thanh toán">
      <div className="grid gap-4">
        <div className="rounded-lg border border-[var(--neutral-200)] bg-[var(--neutral-50)] p-3">
          <p className="text-[13px] font-bold text-[var(--neutral-500)]">
            {receipt.receiptNumber}
          </p>
          <p className="mt-1 text-[18px] font-extrabold text-[var(--brand-950)]">
            {formatMoney(receipt.totalAmount)}
          </p>
        </div>

        <SelectField
          label="Trạng thái"
          onChange={(value) =>
            onChange({
              ...form,
              paymentStatus: value as Exclude<PaymentStatus, "cancelled">,
            })
          }
          options={paymentStatusOptions}
          value={form.paymentStatus}
        />

        {form.paymentStatus === "partially_paid" ? (
          <CurrencyField
            label="Số tiền đã thanh toán"
            onChange={(value) => onChange({ ...form, paidAmount: value })}
            value={form.paidAmount}
          />
        ) : null}

        {form.paymentStatus !== "unpaid" ? (
          <TextInput
            label="Ngày thanh toán"
            onChange={(event) =>
              onChange({ ...form, paidAt: event.target.value })
            }
            type="date"
            value={form.paidAt}
          />
        ) : null}

        <TextArea
          label="Ghi chú thanh toán"
          onChange={(event) =>
            onChange({ ...form, paymentNote: event.target.value })
          }
          placeholder="Ghi chú chuyển khoản, số giao dịch..."
          value={form.paymentNote}
        />

        <label className="grid gap-2">
          <span className="text-[14px] font-bold text-[var(--neutral-600)]">
            Ảnh minh chứng nếu có
          </span>
          <span className="inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-[var(--brand-200)] bg-[var(--brand-50)] px-4 text-[14px] font-bold text-[var(--brand-700)]">
            <Upload size={16} />
            {form.proofFile?.name ?? "Chọn ảnh chuyển khoản"}
            <input
              accept="image/*"
              className="sr-only"
              onChange={(event) => handleProofFile(event, form, onChange)}
              type="file"
            />
          </span>
        </label>

        <div className="grid grid-cols-2 gap-2 pt-2">
          <SecondaryAction disabled={isLoading} onClick={onClose} type="button">
            Hủy
          </SecondaryAction>
          <PrimaryAction
            disabled={isLoading}
            icon={
              isLoading ? (
                <LoaderCircle className="animate-spin" size={16} />
              ) : (
                <CheckCircle2 size={16} />
              )
            }
            onClick={onSubmit}
            type="button"
          >
            Lưu
          </PrimaryAction>
        </div>
      </div>
    </Modal>
  );
}


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
  const [isOpen, setIsOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({});
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const selectedOption = options.find((option) => option.value === value);
  const updateMenuPosition = useCallback(() => {
    const rect = buttonRef.current?.getBoundingClientRect();

    if (!rect) {
      return;
    }

    const spaceBelow =
      window.innerHeight - rect.bottom - SELECT_MENU_GAP - 12;
    const availableHeight = Math.max(
      132,
      Math.min(SELECT_MENU_MAX_HEIGHT, spaceBelow),
    );

    const menuWidth = Math.min(
      Math.max(rect.width, 280),
      Math.max(180, window.innerWidth - 24),
    );
    const menuLeft = Math.min(
      Math.max(12, rect.right - menuWidth),
      window.innerWidth - menuWidth - 12,
    );

    setMenuStyle({
      left: menuLeft,
      maxHeight: availableHeight,
      top: rect.bottom + SELECT_MENU_GAP,
      width: menuWidth,
    });
  }, []);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node;

      if (
        !rootRef.current?.contains(target) &&
        !menuRef.current?.contains(target)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);

    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    updateMenuPosition();
    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);

    return () => {
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
    };
  }, [isOpen, updateMenuPosition]);

  return (
    <div className="grid gap-2" ref={rootRef}>
      <span className="text-[14px] font-bold text-[var(--neutral-600)]">
        {label}
      </span>
      <div className={formStyles.scheduleSelect}>
        <button
          aria-expanded={isOpen}
          className={formStyles.scheduleSelectButton}
          data-open={isOpen}
          onClick={() => {
            if (!isOpen) {
              updateMenuPosition();
            }

            setIsOpen((current) => !current);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setIsOpen(false);
            }
          }}
          ref={buttonRef}
          type="button"
        >
          <span className={formStyles.scheduleSelectValue}>
            {selectedOption?.icon}
            <span>{selectedOption?.label ?? "Chọn giá trị"}</span>
          </span>
          <ChevronDown
            className={formStyles.scheduleSelectChevron}
            data-open={isOpen}
            size={17}
          />
        </button>

        {isOpen && typeof document !== "undefined"
          ? createPortal(
              <div
                className={formStyles.scheduleSelectMenu}
                ref={menuRef}
                role="listbox"
                style={menuStyle}
              >
                {options.map((option) => {
                  const isSelected = option.value === value;

                  return (
                    <button
                      aria-selected={isSelected}
                      className={formStyles.scheduleSelectOption}
                      data-selected={isSelected}
                      key={option.value}
                      onClick={() => {
                        onChange(option.value);
                        setIsOpen(false);
                      }}
                      role="option"
                      type="button"
                    >
                      <span className={formStyles.scheduleSelectValue}>
                        {option.icon}
                        <span>{option.label}</span>
                      </span>
                      {isSelected ? <Check size={16} /> : null}
                    </button>
                  );
                })}
              </div>,
              document.body,
            )
          : null}
      </div>
    </div>
  );
}

export function CurrencyField({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="grid min-w-0 gap-2">
      <span className="text-[14px] font-bold text-[var(--neutral-600)] truncate">
        {label}
      </span>
      <span className="relative min-w-0">
        <input
          className="h-12 w-full rounded-lg border border-[var(--neutral-200)] bg-white px-4 pr-14 text-[15px] font-medium text-[var(--neutral-800)] outline-none transition placeholder:text-[var(--neutral-400)] focus:border-[var(--brand-400)] focus:shadow-[0_0_0_3px_rgba(99,102,241,0.12)]"
          inputMode="numeric"
          onChange={(event) =>
            onChange(formatCurrencyInput(event.target.value))
          }
          placeholder="0"
          value={value}
        />
        <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-[13px] font-extrabold text-[var(--brand-600)]">
          VND
        </span>
      </span>
    </label>
  );
}

function SummaryLine({
  label,
  strong = false,
  value,
}: {
  label: string;
  strong?: boolean;
  value: string;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-4 ${
        strong ? "border-t border-[var(--brand-200)] pt-2 text-[18px]" : ""
      }`}
    >
      <span>{label}</span>
      <strong className="text-[var(--brand-900)]">{value}</strong>
    </div>
  );
}

export function StatusPill({
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


export function getTuitionEntriesPeriod(
  entries: BillingCandidates["tuitionEntries"],
) {
  const dateKeys = entries
    .map((entry) => toDateInputValue(entry.date))
    .filter(Boolean)
    .sort();

  if (!dateKeys.length) {
    return null;
  }

  return {
    from: dateKeys[0],
    to: dateKeys[dateKeys.length - 1],
  };
}

function getTuitionEntryLessonText(
  entry: BillingCandidates["tuitionEntries"][number],
) {
  const parts = uniqueNonEmpty([entry.topic, entry.content, entry.note]);
  const [title = "Nội dung buổi học", ...details] = parts;

  return {
    detail: details.join(" - "),
    title,
  };
}


function uniqueNonEmpty(values: unknown[]) {
  const seen = new Set<string>();

  return values
    .map((value) => String(value || "").trim())
    .filter((value) => {
      if (!value || seen.has(value)) {
        return false;
      }

      seen.add(value);
      return true;
    });
}

export function toDateInputValue(value?: string | Date | null) {
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

export function buildPriceForm(classroom: Classroom): PriceFormState {
  return {
    regularPrice: formatCurrencyInput(String(classroom.regularPrice)),
    makeupPrice: formatCurrencyInput(String(classroom.makeupPrice)),
    priceEffectiveFrom:
      toVietnamDateInputValue(classroom.priceEffectiveFrom) ||
      getVietnamTodayInputDate(),
  };
}

export function formatDateInput(value?: string) {
  return formatDate(value);
}

function handleProofFile(
  event: ChangeEvent<HTMLInputElement>,
  form: PaymentFormState,
  onChange: (form: PaymentFormState) => void,
) {
  const file = event.target.files?.[0] ?? null;

  onChange({
    ...form,
    proofFile: file,
  });
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
