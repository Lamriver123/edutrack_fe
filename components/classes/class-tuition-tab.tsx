/* eslint-disable react-hooks/set-state-in-effect */

"use client";

import {
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  Coins,
  Download,
  FileText,
  LoaderCircle,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  Upload,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, CSSProperties, ReactNode } from "react";
import { createPortal } from "react-dom";
import { schoolApi } from "@/lib/api/school";
import type {
  BillingCandidates,
  BillingOverview,
  BillingOverviewStudent,
  Classroom,
  ClassroomDetail,
  IssueReceiptPayload,
  PaymentStatus,
  ReceiptListItem,
  Student,
  StudentBillingOverview,
} from "@/types/school";
import {
  formatCurrencyInput,
  formatMoney,
  getErrorMessage,
  getStudentAvatar,
  getVietnamTodayInputDate,
  parseCurrencyInput,
  toVietnamDateInputValue,
} from "./classroom-utils";
import formStyles from "./classroom-manager.module.css";
import {
  ConfirmDialog,
  EmptyState,
  InlineLoading,
  Modal,
  NoticeBanner,
  PrimaryAction,
  SecondaryAction,
  StudentAvatar,
  TextArea,
  TextInput,
} from "./classroom-ui";
import type { Notice } from "./classroom-types";

type BillingFilterState = {
  fromDate: string;
  toDate: string;
};

type IssueFormState = BillingFilterState & {
  dueDate: string;
  discountAmount: string;
  adjustmentAmount: string;
  strengthsComment: string;
  improvementsComment: string;
  generalComment: string;
  paymentNote: string;
};

type PaymentFormState = {
  paymentStatus: Exclude<PaymentStatus, "cancelled">;
  paidAmount: string;
  paidAt: string;
  paymentNote: string;
  proofFile: File | null;
};

type PriceFormState = {
  regularPrice: string;
  makeupPrice: string;
  priceEffectiveFrom: string;
};

type SelectOption = {
  icon?: ReactNode;
  label: string;
  value: string;
};

type IssueMode = "class" | "multi_class";

const initialFilters: BillingFilterState = {
  fromDate: "",
  toDate: "",
};

const initialIssueForm: IssueFormState = {
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
const ALL_RECEIPT_PERIODS = "all";
const SELECT_MENU_GAP = 8;
const SELECT_MENU_MAX_HEIGHT = 252;

async function downloadPdfFromUrl(url: string, fileName: string) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Không thể tải file PDF.");
  }

  const blob = await response.blob();
  const pdfBlob =
    blob.type === "application/pdf" ? blob : new Blob([blob], { type: "application/pdf" });
  const objectUrl = URL.createObjectURL(pdfBlob);
  const link = document.createElement("a");

  link.href = objectUrl;
  link.download = fileName.toLowerCase().endsWith(".pdf") ? fileName : `${fileName}.pdf`;
  link.rel = "noopener noreferrer";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}

export function ClassTuitionTab({
  classroom,
  initialIssueMode = "class",
  initialIssueStudent,
  onClassUpdated,
  onInitialIssueHandled,
}: {
  classroom: ClassroomDetail;
  initialIssueMode?: IssueMode;
  initialIssueStudent?: Student | null;
  onClassUpdated?: (classroom: Classroom) => void;
  onInitialIssueHandled?: () => void;
}) {
  const [filters, setFilters] = useState<BillingFilterState>(initialFilters);
  const [overview, setOverview] = useState<BillingOverview | null>(null);
  const [receipts, setReceipts] = useState<ReceiptListItem[]>([]);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [issueMode, setIssueMode] = useState<IssueMode>("class");
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([
    classroom.id,
  ]);
  const [studentBillingOverview, setStudentBillingOverview] =
    useState<StudentBillingOverview | null>(null);
  const [candidates, setCandidates] = useState<BillingCandidates | null>(null);
  const [selectedTuitionIds, setSelectedTuitionIds] = useState<string[]>([]);
  const [issueForm, setIssueForm] =
    useState<IssueFormState>(initialIssueForm);
  const [isCandidateLoading, setIsCandidateLoading] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isIssueConfirmOpen, setIsIssueConfirmOpen] = useState(false);
  const [isIssuing, setIsIssuing] = useState(false);
  const [receiptToCancel, setReceiptToCancel] =
    useState<ReceiptListItem | null>(null);
  const [paymentReceipt, setPaymentReceipt] =
    useState<ReceiptListItem | null>(null);
  const [paymentForm, setPaymentForm] = useState<PaymentFormState>({
    paymentStatus: "paid",
    paidAmount: "",
    paidAt: "",
    paymentNote: "",
    proofFile: null,
  });
  const [isPaymentConfirmOpen, setIsPaymentConfirmOpen] = useState(false);
  const [isMutatingReceipt, setIsMutatingReceipt] = useState("");
  const [priceForm, setPriceForm] = useState<PriceFormState>(() =>
    buildPriceForm(classroom),
  );
  const [isPriceConfirmOpen, setIsPriceConfirmOpen] = useState(false);
  const [isUpdatingPrice, setIsUpdatingPrice] = useState(false);

  const loadBillingData = useCallback(async () => {
    setIsLoading(true);

    try {
      const [nextOverview, nextReceipts] = await Promise.all([
        schoolApi.getBillingOverview(classroom.id, filters),
        schoolApi.listReceipts({
          classId: classroom.id,
          fromDate: filters.fromDate || undefined,
          toDate: filters.toDate || undefined,
        }),
      ]);

      setOverview(nextOverview);
      setReceipts(nextReceipts);
    } catch (error) {
      setNotice({ type: "error", text: getErrorMessage(error) });
    } finally {
      setIsLoading(false);
    }
  }, [classroom.id, filters]);

  useEffect(() => {
    void loadBillingData();
  }, [loadBillingData]);

  useEffect(() => {
    setPriceForm(buildPriceForm(classroom));
  }, [classroom]);

  useEffect(() => {
    if (!initialIssueStudent) {
      return;
    }

    const nextForm = {
      ...initialIssueForm,
      fromDate: filters.fromDate,
      toDate: filters.toDate,
    };

    setIssueMode(initialIssueMode);
    setSelectedStudent(initialIssueStudent);
    setIssueForm(nextForm);
    setSelectedClassIds([classroom.id]);
    void loadCandidates(
      initialIssueStudent,
      nextForm,
      initialIssueMode,
      initialIssueMode === "multi_class" ? [] : [classroom.id],
    );
    onInitialIssueHandled?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialIssueStudent]);

  const selectedTuitionEntries = useMemo(() => {
    const selectedSet = new Set(selectedTuitionIds);

    return (candidates?.tuitionEntries ?? []).filter((entry) =>
      selectedSet.has(entry.tuitionEntryId),
    );
  }, [candidates?.tuitionEntries, selectedTuitionIds]);

  const selectedSubtotal = useMemo(
    () => selectedTuitionEntries.reduce((sum, entry) => sum + entry.amount, 0),
    [selectedTuitionEntries],
  );
  const discountAmount = parseCurrencyInput(issueForm.discountAmount) ?? 0;
  const adjustmentAmount = parseCurrencyInput(issueForm.adjustmentAmount) ?? 0;
  const selectedTotal = Math.max(
    0,
    selectedSubtotal - discountAmount + adjustmentAmount,
  );
  const selectedPeriod = useMemo(
    () => getTuitionEntriesPeriod(selectedTuitionEntries),
    [selectedTuitionEntries],
  );

  async function openIssueModal(
    row: BillingOverviewStudent,
    mode: IssueMode = "class",
  ) {
    const nextForm = {
      ...initialIssueForm,
      fromDate: filters.fromDate,
      toDate: filters.toDate,
    };

    setIssueMode(mode);
    setSelectedStudent(row.student);
    setIssueForm(nextForm);
    setSelectedClassIds([classroom.id]);
    await loadCandidates(
      row.student,
      nextForm,
      mode,
      mode === "multi_class" ? [] : [classroom.id],
    );
  }

  async function loadCandidates(
    student: Student,
    form: IssueFormState = issueForm,
    mode: IssueMode = issueMode,
    classIds: string[] = selectedClassIds,
  ) {
    setIsCandidateLoading(true);
    setCandidates(null);
    setSelectedTuitionIds([]);

    try {
      const candidateFilters = {
        fromDate: form.fromDate || undefined,
        toDate: form.toDate || undefined,
      };
      let nextCandidates: BillingCandidates;

      if (mode === "multi_class") {
        const nextOverview = await schoolApi.getStudentBillingOverview(
          student.id,
          candidateFilters,
        );
        const defaultClassIds = nextOverview.classes
          .filter((item) => item.unbilledLessonCount > 0)
          .map((item) => item.class.id);
        const effectiveClassIds = classIds.length
          ? classIds
          : defaultClassIds.length
            ? defaultClassIds
            : [classroom.id];

        setStudentBillingOverview(nextOverview);
        setSelectedClassIds(effectiveClassIds);
        nextCandidates = await schoolApi.getStudentBillingCandidates(
          student.id,
          {
            ...candidateFilters,
            classIds: effectiveClassIds,
          },
        );
      } else {
        setStudentBillingOverview(null);
        setSelectedClassIds([classroom.id]);
        nextCandidates = await schoolApi.getBillingCandidates(
          classroom.id,
          student.id,
          candidateFilters,
        );
      }

      const defaultSelectedIds = nextCandidates.suggestedTuitionEntryIds.length
        ? nextCandidates.suggestedTuitionEntryIds
        : nextCandidates.tuitionEntries
            .slice(0, 10)
            .map((entry) => entry.tuitionEntryId);
      const defaultPeriod = getTuitionEntriesPeriod(
        nextCandidates.tuitionEntries.filter((entry) =>
          defaultSelectedIds.includes(entry.tuitionEntryId),
        ),
      );

      setCandidates(nextCandidates);
      setSelectedTuitionIds(defaultSelectedIds);
      setIssueForm((current) => ({
        ...current,
        fromDate:
          current.fromDate ||
          defaultPeriod?.from ||
          toDateInputValue(nextCandidates.periodStart),
        toDate:
          current.toDate ||
          defaultPeriod?.to ||
          toDateInputValue(nextCandidates.periodEnd),
      }));
    } catch (error) {
      setNotice({ type: "error", text: getErrorMessage(error) });
    } finally {
      setIsCandidateLoading(false);
    }
  }

  function closeIssueModal() {
    if (isIssuing) {
      return;
    }

    setSelectedStudent(null);
    setCandidates(null);
    setSelectedTuitionIds([]);
    setSelectedClassIds([classroom.id]);
    setStudentBillingOverview(null);
    setIssueMode("class");
    setIssueForm(initialIssueForm);
    setIsIssueConfirmOpen(false);
  }

  async function previewReceipt() {
    if (!selectedStudent) {
      return;
    }

    const payload = buildIssuePayload();

    if (!payload) {
      return;
    }

    setIsPreviewing(true);
    const previewWindow = window.open("", "_blank");

    if (!previewWindow) {
      setNotice({
        type: "error",
        text: "Trình duyệt đang chặn tab xem trước. Vui lòng cho phép popup rồi thử lại.",
      });
      setIsPreviewing(false);
      return;
    }

    previewWindow.document.open();
    previewWindow.document.write(getReceiptPreviewLoadingHtml());
    previewWindow.document.close();

    try {
      const response =
        issueMode === "multi_class"
          ? await schoolApi.previewStudentReceipt(selectedStudent.id, payload)
          : await schoolApi.previewReceipt(
              classroom.id,
              selectedStudent.id,
              payload,
            );
      previewWindow.document.open();
      previewWindow.document.write(response.html);
      previewWindow.document.close();
      previewWindow.focus();
    } catch (error) {
      previewWindow.document.open();
      previewWindow.document.write(getReceiptPreviewErrorHtml());
      previewWindow.document.close();
      setNotice({ type: "error", text: getErrorMessage(error) });
    } finally {
      setIsPreviewing(false);
    }
  }

  async function issueReceipt() {
    if (!selectedStudent) {
      return;
    }

    const payload = buildIssuePayload();

    if (!payload) {
      setIsIssueConfirmOpen(false);
      return;
    }

    setIsIssuing(true);
    setNotice(null);

    try {
      const receipt =
        issueMode === "multi_class"
          ? await schoolApi.issueStudentReceipt(selectedStudent.id, payload)
          : await schoolApi.issueReceipt(
              classroom.id,
              selectedStudent.id,
              payload,
            );
      closeIssueModal();
      await loadBillingData();
      setNotice({
        type: receipt.pdfStatus === "generated" ? "success" : "error",
        text:
          receipt.pdfStatus === "generated"
            ? `Đã phát hành hóa đơn ${receipt.receiptNumber}.`
            : `Đã lưu hóa đơn ${receipt.receiptNumber}, nhưng PDF chưa tạo được. Bạn có thể bấm tạo lại PDF.`,
      });
    } catch (error) {
      setNotice({ type: "error", text: getErrorMessage(error) });
      setIsIssueConfirmOpen(false);
    } finally {
      setIsIssuing(false);
    }
  }

  function buildIssuePayload(): IssueReceiptPayload | null {
    if (issueMode === "multi_class" && !selectedClassIds.length) {
      setNotice({
        type: "error",
        text: "Vui lòng chọn ít nhất một lớp để xuất hóa đơn gộp.",
      });
      return null;
    }

    if (!selectedTuitionIds.length) {
      setNotice({
        type: "error",
        text: "Vui lòng chọn ít nhất một buổi học để xuất hóa đơn.",
      });
      return null;
    }

    return {
      scopeType: issueMode,
      classIds: issueMode === "multi_class" ? selectedClassIds : undefined,
      fromDate: issueForm.fromDate || undefined,
      toDate: issueForm.toDate || undefined,
      dueDate: issueForm.dueDate || undefined,
      tuitionEntryIds: selectedTuitionIds,
      discountAmount,
      adjustmentAmount,
      strengthsComment: issueForm.strengthsComment.trim() || undefined,
      improvementsComment: issueForm.improvementsComment.trim() || undefined,
      generalComment: issueForm.generalComment.trim() || undefined,
      paymentNote: issueForm.paymentNote.trim() || undefined,
    };
  }

  async function downloadReceipt(receipt: ReceiptListItem) {
    setIsMutatingReceipt(receipt.id);

    try {
      const download = await schoolApi.getReceiptDownload(receipt.id);
      try {
        await downloadPdfFromUrl(download.url, download.fileName);
      } catch {
        window.open(download.url, "_blank", "noopener,noreferrer");
      }
    } catch (error) {
      setNotice({ type: "error", text: getErrorMessage(error) });
    } finally {
      setIsMutatingReceipt("");
    }
  }

  async function retryPdf(receipt: ReceiptListItem) {
    setIsMutatingReceipt(receipt.id);

    try {
      await schoolApi.retryReceiptPdf(receipt.id);
      await loadBillingData();
      setNotice({ type: "success", text: "Đã tạo lại PDF hóa đơn." });
    } catch (error) {
      setNotice({ type: "error", text: getErrorMessage(error) });
    } finally {
      setIsMutatingReceipt("");
    }
  }

  async function cancelReceipt() {
    if (!receiptToCancel) {
      return;
    }

    setIsMutatingReceipt(receiptToCancel.id);

    try {
      await schoolApi.cancelReceipt(receiptToCancel.id);
      await loadBillingData();
      setReceiptToCancel(null);
      setNotice({ type: "success", text: "Đã hủy hóa đơn và mở lại buổi học." });
    } catch (error) {
      setNotice({ type: "error", text: getErrorMessage(error) });
      setReceiptToCancel(null);
    } finally {
      setIsMutatingReceipt("");
    }
  }

  function openPaymentModal(receipt: ReceiptListItem) {
    setPaymentReceipt(receipt);
    setPaymentForm({
      paymentStatus:
        receipt.paymentStatus === "cancelled" ? "unpaid" : receipt.paymentStatus,
      paidAmount:
        receipt.paymentStatus === "partially_paid"
          ? formatCurrencyInput(String(receipt.paidAmount ?? 0))
          : "",
      paidAt:
        receipt.paidAt?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
      paymentNote: receipt.paymentNote ?? "",
      proofFile: null,
    });
  }

  async function updatePayment() {
    if (!paymentReceipt) {
      return;
    }

    const parsedPaidAmount = parseCurrencyInput(paymentForm.paidAmount) ?? 0;

    if (
      paymentForm.paymentStatus === "partially_paid" &&
      (parsedPaidAmount <= 0 || parsedPaidAmount >= paymentReceipt.totalAmount)
    ) {
      setNotice({
        type: "error",
        text: "Số tiền thanh toán một phần phải lớn hơn 0 và nhỏ hơn tổng tiền.",
      });
      setIsPaymentConfirmOpen(false);
      return;
    }

    setIsMutatingReceipt(paymentReceipt.id);

    try {
      let paymentProof:
        | {
            url: string;
            publicId: string;
          }
        | undefined;

      if (paymentForm.proofFile) {
        paymentProof = await schoolApi.uploadReceiptPaymentProof(
          paymentReceipt.id,
          paymentForm.proofFile,
        );
      }

      await schoolApi.updateReceiptPayment(paymentReceipt.id, {
        paymentStatus: paymentForm.paymentStatus,
        paidAmount:
          paymentForm.paymentStatus === "partially_paid"
            ? parsedPaidAmount
            : undefined,
        paidAt:
          paymentForm.paymentStatus === "unpaid"
            ? undefined
            : paymentForm.paidAt || undefined,
        paymentNote: paymentForm.paymentNote.trim() || undefined,
        paymentProofUrl: paymentProof?.url,
        paymentProofPublicId: paymentProof?.publicId,
      });
      await loadBillingData();
      setPaymentReceipt(null);
      setIsPaymentConfirmOpen(false);
      setNotice({ type: "success", text: "Đã cập nhật thanh toán hóa đơn." });
    } catch (error) {
      setNotice({ type: "error", text: getErrorMessage(error) });
      setIsPaymentConfirmOpen(false);
    } finally {
      setIsMutatingReceipt("");
    }
  }

  function handleSelectAllTuition(checked: boolean) {
    setSelectedTuitionIds(
      checked
        ? candidates?.tuitionEntries.map((entry) => entry.tuitionEntryId) ?? []
        : [],
    );
  }

  function toggleTuitionEntry(tuitionEntryId: string) {
    setSelectedTuitionIds((current) =>
      current.includes(tuitionEntryId)
        ? current.filter((id) => id !== tuitionEntryId)
        : [...current, tuitionEntryId],
    );
  }

  function toggleIssueClass(classId: string) {
    if (!selectedStudent || issueMode !== "multi_class") {
      return;
    }

    const nextClassIds = selectedClassIds.includes(classId)
      ? selectedClassIds.filter((id) => id !== classId)
      : [...selectedClassIds, classId];

    setSelectedClassIds(nextClassIds);

    if (!nextClassIds.length) {
      setCandidates(null);
      setSelectedTuitionIds([]);
      return;
    }

    void loadCandidates(selectedStudent, issueForm, "multi_class", nextClassIds);
  }

  function requestUpdatePrice() {
    const regularPrice = parseCurrencyInput(priceForm.regularPrice);
    const makeupPrice = parseCurrencyInput(priceForm.makeupPrice);

    if (
      !priceForm.regularPrice ||
      !priceForm.makeupPrice ||
      !priceForm.priceEffectiveFrom ||
      regularPrice === null ||
      makeupPrice === null ||
      regularPrice < 0 ||
      makeupPrice < 0
    ) {
      setNotice({
        type: "error",
        text: "Vui lòng nhập đủ giá buổi thường, giá học bù và ngày áp dụng.",
      });
      return;
    }

    setIsPriceConfirmOpen(true);
  }

  async function updateClassPrice() {
    const regularPrice = parseCurrencyInput(priceForm.regularPrice);
    const makeupPrice = parseCurrencyInput(priceForm.makeupPrice);

    if (regularPrice === null || makeupPrice === null) {
      setIsPriceConfirmOpen(false);
      setNotice({ type: "error", text: "Giá tiền không hợp lệ." });
      return;
    }

    setIsUpdatingPrice(true);
    setNotice(null);

    try {
      const updatedClass = await schoolApi.updateClass(classroom.id, {
        regularPrice,
        makeupPrice,
        priceEffectiveFrom: priceForm.priceEffectiveFrom,
      });

      onClassUpdated?.(updatedClass);
      setIsPriceConfirmOpen(false);
      await loadBillingData();
      setNotice({
        type: "success",
        text: `Đã cập nhật giá học phí áp dụng từ ${formatDateInput(priceForm.priceEffectiveFrom)}.`,
      });
    } catch (error) {
      setNotice({ type: "error", text: getErrorMessage(error) });
      setIsPriceConfirmOpen(false);
    } finally {
      setIsUpdatingPrice(false);
    }
  }

  return (
    <div className="grid gap-5">
      {notice ? (
        <NoticeBanner notice={notice} onClose={() => setNotice(null)} />
      ) : null}

      <div className="grid gap-3 md:grid-cols-4">
        <TuitionMetric
          icon={<Coins size={18} />}
          label="Buổi thường"
          value={formatMoney(classroom.regularPrice)}
        />
        <TuitionMetric
          icon={<Coins size={18} />}
          label="Học bù / học thêm"
          value={formatMoney(classroom.makeupPrice)}
        />
        <TuitionMetric
          icon={<FileText size={18} />}
          label="Buổi chờ xuất"
          value={`${overview?.totals.unbilledLessonCount ?? 0} buổi`}
        />
        <TuitionMetric
          icon={<CheckCircle2 size={18} />}
          label="Sẵn sàng xuất"
          value={`${overview?.totals.readyToIssueCount ?? 0} học sinh`}
        />
      </div>

      <PriceSettingsPanel
        form={priceForm}
        isLoading={isUpdatingPrice}
        makeupPrice={classroom.makeupPrice}
        onChange={setPriceForm}
        onSubmit={requestUpdatePrice}
        priceEffectiveFrom={classroom.priceEffectiveFrom}
        regularPrice={classroom.regularPrice}
      />

      <div className="grid gap-3 rounded-lg border border-[var(--neutral-200)] bg-[var(--neutral-50)] p-4 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
        <TextInput
          icon={<CalendarDays size={16} />}
          label="Từ ngày"
          onChange={(event) =>
            setFilters((current) => ({ ...current, fromDate: event.target.value }))
          }
          type="date"
          value={filters.fromDate}
        />
        <TextInput
          icon={<CalendarDays size={16} />}
          label="Đến ngày"
          onChange={(event) =>
            setFilters((current) => ({ ...current, toDate: event.target.value }))
          }
          type="date"
          value={filters.toDate}
        />
        <SecondaryAction
          className="w-full lg:w-auto"
          icon={<RefreshCw size={16} />}
          onClick={() => void loadBillingData()}
          type="button"
        >
          Tải lại
        </SecondaryAction>
      </div>

      {isLoading ? (
        <InlineLoading text="Đang tải dữ liệu học phí..." />
      ) : (
        <div className="grid gap-4">
          <section className="rounded-lg border border-[var(--neutral-200)] bg-white p-4">
            <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h3 className="text-[18px] font-extrabold text-[var(--brand-950)]">
                  Học sinh cần xuất hóa đơn
                </h3>
                <p className="text-[14px] font-semibold text-[var(--neutral-500)]">
                  Gợi ý xuất sau 10 buổi hoặc chọn thủ công từng buổi.
                </p>
              </div>
            </div>

            {overview?.students.length ? (
              <div className="max-w-full overflow-x-auto pb-2">
                <div className="grid min-w-[860px] gap-2">
                  <div className="grid grid-cols-[minmax(280px,1.45fr)_130px_150px_150px_140px] gap-3 rounded-lg bg-[var(--neutral-50)] px-4 py-3 text-[13px] font-bold text-[var(--neutral-500)]">
                    <span>Học sinh</span>
                    <span>Chờ xuất</span>
                    <span>Tạm tính</span>
                    <span>Hóa đơn gần nhất</span>
                    <span>Thao tác</span>
                  </div>
                  {overview.students.map((row) => (
                    <div
                      className="grid grid-cols-[minmax(280px,1.45fr)_130px_150px_150px_140px] items-center gap-3 rounded-lg border border-[var(--neutral-200)] px-4 py-3"
                      key={row.student.id}
                    >
                      <div className="grid min-w-0 grid-cols-[48px_1fr] items-center gap-3 max-sm:grid-cols-1">
                        <span className="hidden sm:block">
                          <StudentAvatar
                            alt={row.student.fullName}
                            src={getStudentAvatar(row.student)}
                          />
                        </span>
                        <span className="min-w-0">
                          <p className="truncate text-[15px] font-extrabold text-[var(--neutral-800)]">
                            {row.student.fullName}
                          </p>
                          <p className="truncate text-[13px] font-semibold text-[var(--neutral-500)]">
                            {row.student.studentCode}
                          </p>
                        </span>
                      </div>
                      <StatusPill
                        tone={row.reachedSuggestedCycle ? "success" : "neutral"}
                      >
                        {row.unbilledLessonCount} buổi
                      </StatusPill>
                      <strong className="text-[15px] text-[var(--brand-950)]">
                        {formatMoney(row.unbilledAmount)}
                      </strong>
                      <span className="truncate text-[13px] font-semibold text-[var(--neutral-500)]">
                        {row.latestReceipt?.receiptNumber ?? "Chưa có"}
                      </span>
                      <PrimaryAction
                        className="h-10 px-3"
                        disabled={row.unbilledLessonCount === 0}
                        icon={<FileText size={15} />}
                        onClick={() => void openIssueModal(row)}
                        type="button"
                      >
                        Xuất
                      </PrimaryAction>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <EmptyState
                icon={<Search size={22} />}
                text="Chưa có học sinh hoặc buổi học nào cần xuất hóa đơn trong kỳ đang chọn."
                title="Chưa có dữ liệu học phí"
              />
            )}
          </section>

          <ReceiptHistory
            isMutatingReceipt={isMutatingReceipt}
            onCancel={setReceiptToCancel}
            onDownload={(receipt) => void downloadReceipt(receipt)}
            onPayment={openPaymentModal}
            onRetryPdf={(receipt) => void retryPdf(receipt)}
            receipts={receipts}
          />
        </div>
      )}

      {selectedStudent ? (
        <IssueReceiptModal
          candidates={candidates}
          discountAmount={discountAmount}
          form={issueForm}
          issueMode={issueMode}
          isCandidateLoading={isCandidateLoading}
          isIssuing={isIssuing}
          isPreviewing={isPreviewing}
          onClose={closeIssueModal}
          onFormChange={setIssueForm}
          onLoadCandidates={() =>
            void loadCandidates(
              selectedStudent,
              issueForm,
              issueMode,
              selectedClassIds,
            )
          }
          onPreview={() => void previewReceipt()}
          onRequestIssue={() => setIsIssueConfirmOpen(true)}
          onSelectAll={handleSelectAllTuition}
          onToggleClass={toggleIssueClass}
          onToggleEntry={toggleTuitionEntry}
          selectedPeriod={selectedPeriod}
          selectedClassIds={selectedClassIds}
          selectedSubtotal={selectedSubtotal}
          selectedTotal={selectedTotal}
          selectedTuitionIds={selectedTuitionIds}
          student={selectedStudent}
          studentBillingOverview={studentBillingOverview}
        />
      ) : null}

      {isIssueConfirmOpen && selectedStudent ? (
        <ConfirmDialog
          confirmText="Phát hành"
          description={`Bạn sắp phát hành hóa đơn cho ${selectedStudent.fullName}. Các buổi đã chọn sẽ bị khóa để tránh xuất trùng.`}
          isLoading={isIssuing}
          onCancel={() => setIsIssueConfirmOpen(false)}
          onConfirm={() => void issueReceipt()}
          title="Xác nhận phát hành hóa đơn"
        />
      ) : null}

      {receiptToCancel ? (
        <ConfirmDialog
          confirmText="Hủy hóa đơn"
          description={`Bạn sắp hủy hóa đơn ${receiptToCancel.receiptNumber}. Các buổi học trong hóa đơn sẽ được mở lại để xuất bill sau.`}
          isLoading={isMutatingReceipt === receiptToCancel.id}
          onCancel={() => setReceiptToCancel(null)}
          onConfirm={() => void cancelReceipt()}
          title="Xác nhận hủy hóa đơn"
          tone="danger"
        />
      ) : null}

      {paymentReceipt ? (
        <PaymentModal
          form={paymentForm}
          isLoading={isMutatingReceipt === paymentReceipt.id}
          onChange={setPaymentForm}
          onClose={() => {
            if (!isMutatingReceipt) {
              setPaymentReceipt(null);
              setIsPaymentConfirmOpen(false);
            }
          }}
          onSubmit={() => setIsPaymentConfirmOpen(true)}
          receipt={paymentReceipt}
        />
      ) : null}

      {isPaymentConfirmOpen && paymentReceipt ? (
        <ConfirmDialog
          confirmText="Lưu thanh toán"
          description={`Cập nhật trạng thái thanh toán cho hóa đơn ${paymentReceipt.receiptNumber}.`}
          isLoading={isMutatingReceipt === paymentReceipt.id}
          onCancel={() => setIsPaymentConfirmOpen(false)}
          onConfirm={() => void updatePayment()}
          title="Xác nhận thanh toán"
        />
      ) : null}

      {isPriceConfirmOpen ? (
        <ConfirmDialog
          confirmText="Cập nhật giá"
          description={`Giá mới sẽ áp dụng cho các buổi học từ ${formatDateInput(priceForm.priceEffectiveFrom)}. Những buổi đã điểm danh trước mốc này vẫn dùng phiên bản giá cũ.`}
          isLoading={isUpdatingPrice}
          onCancel={() => setIsPriceConfirmOpen(false)}
          onConfirm={() => void updateClassPrice()}
          title="Xác nhận cập nhật giá"
        />
      ) : null}
    </div>
  );
}

function TuitionMetric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="grid grid-cols-[44px_1fr] items-center gap-3 rounded-lg border border-[var(--neutral-200)] bg-white p-3">
      <span className="grid size-11 place-items-center rounded-lg bg-[var(--brand-50)] text-[var(--brand-600)]">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[13px] font-bold text-[var(--neutral-500)]">
          {label}
        </span>
        <strong className="block truncate text-[18px] font-extrabold text-[var(--brand-950)]">
          {value}
        </strong>
      </span>
    </div>
  );
}

function PriceSettingsPanel({
  form,
  isLoading,
  makeupPrice,
  onChange,
  onSubmit,
  priceEffectiveFrom,
  regularPrice,
}: {
  form: PriceFormState;
  isLoading: boolean;
  makeupPrice: number;
  onChange: (form: PriceFormState) => void;
  onSubmit: () => void;
  priceEffectiveFrom?: string | null;
  regularPrice: number;
}) {
  return (
    <section className="rounded-lg border border-[var(--neutral-200)] bg-white p-4 shadow-[var(--shadow-sm)]">
      <div className="grid gap-4 xl:grid-cols-[minmax(220px,0.72fr)_1fr_auto] xl:items-end">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-2 rounded-lg border border-[var(--brand-100)] bg-[var(--brand-50)] px-3 py-1.5 text-[13px] font-extrabold text-[var(--brand-700)]">
            <Coins size={14} />
            Cấu hình giá
          </div>
          <h3 className="mt-3 text-[18px] font-extrabold text-[var(--brand-950)]">
            Cập nhật giá buổi học
          </h3>
          <p className="mt-1 text-[14px] font-semibold leading-6 text-[var(--neutral-500)]">
            Giá được lưu theo ngày áp dụng để khi nhập lại dữ liệu giấy, học phí
            sẽ tính theo đúng ngày học.
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-[12px] font-extrabold text-[var(--neutral-600)]">
            <span className="rounded-full border border-[var(--neutral-200)] bg-[var(--neutral-50)] px-3 py-1.5">
              Thường: {formatMoney(regularPrice)}
            </span>
            <span className="rounded-full border border-[var(--neutral-200)] bg-[var(--neutral-50)] px-3 py-1.5">
              Học bù: {formatMoney(makeupPrice)}
            </span>
            <span className="rounded-full border border-[var(--neutral-200)] bg-[var(--neutral-50)] px-3 py-1.5">
              Từ: {formatDateInput(toVietnamDateInputValue(priceEffectiveFrom))}
            </span>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <CurrencyField
            label="Giá buổi thường"
            onChange={(value) => onChange({ ...form, regularPrice: value })}
            value={form.regularPrice}
          />
          <CurrencyField
            label="Giá học bù / thêm"
            onChange={(value) => onChange({ ...form, makeupPrice: value })}
            value={form.makeupPrice}
          />
          <TextInput
            icon={<CalendarDays size={16} />}
            label="Ngày áp dụng"
            onChange={(event) =>
              onChange({ ...form, priceEffectiveFrom: event.target.value })
            }
            type="date"
            value={form.priceEffectiveFrom}
          />
        </div>

        <PrimaryAction
          className="w-full xl:w-auto"
          disabled={isLoading}
          icon={
            isLoading ? (
              <LoaderCircle className="animate-spin" size={16} />
            ) : (
              <Save size={16} />
            )
          }
          onClick={onSubmit}
          type="button"
        >
          Cập nhật giá
        </PrimaryAction>
      </div>
    </section>
  );
}

function IssueReceiptModal({
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
      <div className="grid gap-5">
        <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
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
                value={`${selectedTuitionIds.length} buổi`}
              />
              <TuitionMetric
                icon={<FileText size={17} />}
                label="Bài kiểm tra"
                value={`${candidates.exams.length} bài`}
              />
              <TuitionMetric
                icon={<Coins size={17} />}
                label="Tổng dự kiến"
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

            <div className="grid gap-3 md:grid-cols-3">
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
              <div className="mt-3 grid gap-3 lg:grid-cols-3">
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
            disabled={isPreviewing || isIssuing || !selectedTuitionIds.length}
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
            disabled={isIssuing || !selectedTuitionIds.length}
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

function getReceiptPreviewLoadingHtml() {
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
      border-radius: 14px;
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

function getReceiptPreviewErrorHtml() {
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
      border-radius: 14px;
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

function PaymentModal({
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

function ReceiptHistory({
  isMutatingReceipt,
  onCancel,
  onDownload,
  onPayment,
  onRetryPdf,
  receipts,
}: {
  isMutatingReceipt: string;
  onCancel: (receipt: ReceiptListItem) => void;
  onDownload: (receipt: ReceiptListItem) => void;
  onPayment: (receipt: ReceiptListItem) => void;
  onRetryPdf: (receipt: ReceiptListItem) => void;
  receipts: ReceiptListItem[];
}) {
  const [periodFilter, setPeriodFilter] = useState(ALL_RECEIPT_PERIODS);
  const periodOptions = useMemo(() => getReceiptPeriodOptions(receipts), [receipts]);
  const filteredReceipts = useMemo(
    () =>
      periodFilter === ALL_RECEIPT_PERIODS
        ? receipts
        : receipts.filter((receipt) => getReceiptPeriodKey(receipt) === periodFilter),
    [periodFilter, receipts],
  );
  const selectedPeriodOption = periodOptions.find(
    (option) => option.key === periodFilter,
  );
  const visibleSummary =
    selectedPeriodOption ??
    getReceiptPeriodSummary(ALL_RECEIPT_PERIODS, "Tất cả đợt", receipts);

  useEffect(() => {
    if (
      periodFilter !== ALL_RECEIPT_PERIODS &&
      !periodOptions.some((option) => option.key === periodFilter)
    ) {
      setPeriodFilter(ALL_RECEIPT_PERIODS);
    }
  }, [periodFilter, periodOptions]);

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
          <div className="grid gap-1 sm:min-w-[320px]">
            <SelectField
              label="Lọc theo đợt"
              onChange={setPeriodFilter}
              options={[
                { label: "Tất cả đợt", value: ALL_RECEIPT_PERIODS },
                ...periodOptions.map((option) => ({
                  label: option.label,
                  value: option.key,
                })),
              ]}
              value={periodFilter}
            />
            <span className="text-[13px] font-semibold text-[var(--neutral-500)]">
              {visibleSummary.count} hóa đơn -{" "}
              {formatMoney(visibleSummary.total)}
            </span>
          </div>
        ) : null}
      </div>

      {receipts.length ? (
        <>
          <div className="grid gap-2 lg:hidden">
            {filteredReceipts.map((receipt) => (
              <article
                className="rounded-lg border border-[var(--neutral-200)] bg-white p-3 shadow-[var(--shadow-sm)]"
                key={receipt.id}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
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
                  receipt={receipt}
                />
              </article>
            ))}
          </div>

          <div className="hidden max-w-full overflow-x-auto pb-2 lg:block">
          <div className="grid min-w-[920px] gap-2">
            <div className="grid grid-cols-[130px_1.1fr_120px_140px_145px_230px] gap-3 rounded-lg bg-[var(--neutral-50)] px-4 py-3 text-[13px] font-bold text-[var(--neutral-500)]">
              <span>Mã hóa đơn</span>
              <span>Học sinh</span>
              <span>Số buổi</span>
              <span>Tổng tiền</span>
              <span>Trạng thái</span>
              <span>Thao tác</span>
            </div>
            {filteredReceipts.map((receipt) => (
              <div
                className="grid grid-cols-[130px_1.1fr_120px_140px_145px_230px] items-center gap-3 rounded-lg border border-[var(--neutral-200)] px-4 py-3"
                key={receipt.id}
              >
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
                  receipt={receipt}
                />
              </div>
            ))}
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
  receipt,
}: {
  className?: string;
  isMutatingReceipt: string;
  onCancel: (receipt: ReceiptListItem) => void;
  onDownload: (receipt: ReceiptListItem) => void;
  onPayment: (receipt: ReceiptListItem) => void;
  onRetryPdf: (receipt: ReceiptListItem) => void;
  receipt: ReceiptListItem;
}) {
  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
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

    const spaceBelow = window.innerHeight - rect.bottom - SELECT_MENU_GAP;
    const spaceAbove = rect.top - SELECT_MENU_GAP;
    const shouldOpenUp =
      spaceBelow < SELECT_MENU_MAX_HEIGHT && spaceAbove > spaceBelow;
    const availableHeight = Math.max(
      132,
      Math.min(SELECT_MENU_MAX_HEIGHT, shouldOpenUp ? spaceAbove : spaceBelow),
    );

    setMenuStyle({
      left: rect.left,
      maxHeight: availableHeight,
      top: shouldOpenUp
        ? rect.top - SELECT_MENU_GAP - availableHeight
        : rect.bottom + SELECT_MENU_GAP,
      width: rect.width,
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

function CurrencyField({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-[14px] font-bold text-[var(--neutral-600)]">
        {label}
      </span>
      <span className="relative">
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

function getTuitionEntriesPeriod(
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

function buildPriceForm(classroom: Classroom): PriceFormState {
  return {
    regularPrice: formatCurrencyInput(String(classroom.regularPrice)),
    makeupPrice: formatCurrencyInput(String(classroom.makeupPrice)),
    priceEffectiveFrom:
      toVietnamDateInputValue(classroom.priceEffectiveFrom) ||
      getVietnamTodayInputDate(),
  };
}

function formatDateInput(value?: string) {
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
