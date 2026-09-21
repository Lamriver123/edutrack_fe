/* eslint-disable react-hooks/set-state-in-effect */

"use client";

import {
  CalendarDays,
  CheckCircle2,
  Coins,
  FileText,
  LoaderCircle,
  RefreshCw,
  Save,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { schoolApi } from "@/lib/api/school";
import { openPdfInNewTab } from "@/lib/files/open-pdf-in-new-tab";
import type { InvoiceTemplate } from "@/types/invoice-template";
import { ReceiptHistory } from "./tuition/receipt-history";
import { BillingStudentList } from "./tuition/billing-student-list";
import { TuitionMetric } from "./tuition/tuition-metric";
import {
  BULK_RECEIPT_DOWNLOAD_ID,
  CurrencyField,
  IssueReceiptModal,
  PaymentModal,
  buildPriceForm,
  formatDateInput,
  getReceiptPreviewErrorHtml,
  getReceiptPreviewLoadingHtml,
  getTuitionEntriesPeriod,
  initialFilters,
  initialIssueForm,
  toDateInputValue,
  type BillingFilterState,
  type IssueFormState,
  type IssueMode,
  type PaymentFormState,
  type PriceFormState,
} from "./tuition/receipt-dialogs";
import type {
  BillingCandidates,
  BillingOverview,
  BillingOverviewStudent,
  Classroom,
  ClassroomDetail,
  IssueReceiptPayload,
  ReceiptListItem,
  Student,
  StudentBillingOverview,
} from "@/types/school";
import {
  formatCurrencyInput,
  formatMoney,
  getErrorMessage,
  parseCurrencyInput,
  toVietnamDateInputValue,
} from "./classroom-utils";
import {
  ConfirmDialog,
  InlineLoading,
  PrimaryAction,
  SecondaryAction,
  TextInput,
} from "./classroom-ui";

import { useNotice } from "@/components/ui/notice-provider";

function downloadBlobFile(
  blob: Blob,
  fileName: string,
  fallbackMimeType: string,
  extension: string,
) {
  const normalizedBlob =
    blob.type === fallbackMimeType
      ? blob
      : new Blob([blob], { type: fallbackMimeType });
  const objectUrl = URL.createObjectURL(normalizedBlob);
  const link = document.createElement("a");
  const normalizedExtension = extension.startsWith(".")
    ? extension
    : `.${extension}`;

  link.href = objectUrl;
  link.download = fileName.toLowerCase().endsWith(normalizedExtension)
    ? fileName
    : `${fileName}${normalizedExtension}`;
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
  const { setNotice, unwatchReceipt, watchReceipt } = useNotice();
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
  const [issueForm, setIssueForm] = useState<IssueFormState>(initialIssueForm);
  const [isCandidateLoading, setIsCandidateLoading] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [selectedTemplate, setSelectedTemplate] =
    useState<InvoiceTemplate | null>(null);
  const previewTemplateRef = useRef<{ id: string; revision: string } | null>(
    null,
  );
  const [isIssueConfirmOpen, setIsIssueConfirmOpen] = useState(false);
  const [isIssuing, setIsIssuing] = useState(false);
  const [receiptToCancel, setReceiptToCancel] =
    useState<ReceiptListItem | null>(null);
  const [paymentReceipt, setPaymentReceipt] = useState<ReceiptListItem | null>(
    null,
  );
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

  const loadBillingData = useCallback(
    async (silent = false) => {
      if (!silent) setIsLoading(true);

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
        if (!silent) setNotice({ type: "error", text: getErrorMessage(error) });
      } finally {
        if (!silent) setIsLoading(false);
      }
    },
    [classroom.id, filters, setNotice],
  );

  useEffect(() => {
    void loadBillingData();
  }, [loadBillingData]);

  useEffect(() => {
    const hasPending = receipts.some((r) => r.pdfStatus === "pending");

    receipts.forEach((r) => {
      if (r.pdfStatus === "pending") {
        watchReceipt(r.id, r.receiptNumber);
      }
    });

    if (!hasPending) return;

    const timer = setInterval(() => {
      void loadBillingData(true);
    }, 4000);

    return () => clearInterval(timer);
  }, [receipts, loadBillingData, watchReceipt]);

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
    setSelectedTemplate(null);
    previewTemplateRef.current = null;
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
      previewTemplateRef.current = response.template;
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

    const payload = buildIssuePayload(true);

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
      if (receipt.pdfStatus !== "pending") {
        setNotice({
          type: receipt.pdfStatus === "generated" ? "success" : "error",
          text:
            receipt.pdfStatus === "generated"
              ? `Đã phát hành hóa đơn ${receipt.receiptNumber}.`
              : `Đã lưu hóa đơn ${receipt.receiptNumber}, nhưng PDF chưa tạo được. Bạn có thể bấm tạo lại PDF.`,
        });
      }
    } catch (error) {
      setNotice({ type: "error", text: getErrorMessage(error) });
      setIsIssueConfirmOpen(false);
    } finally {
      setIsIssuing(false);
    }
  }

  function buildIssuePayload(forIssue = false): IssueReceiptPayload | null {
    if (!selectedTemplate) {
      setNotice({
        type: "error",
        text: "Vui lòng chọn mẫu hóa đơn trước khi tiếp tục.",
      });
      return null;
    }
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
      templateId: selectedTemplate.id,
      templateRevision:
        forIssue && previewTemplateRef.current?.id === selectedTemplate.id
          ? previewTemplateRef.current.revision
          : undefined,
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
      downloadBlobFile(
        download.blob,
        download.fileName,
        "application/pdf",
        ".pdf",
      );
    } catch (error) {
      setNotice({ type: "error", text: getErrorMessage(error) });
    } finally {
      setIsMutatingReceipt("");
    }
  }

  async function viewReceipt(receipt: ReceiptListItem) {
    setIsMutatingReceipt(receipt.id);

    try {
      await openPdfInNewTab(() => schoolApi.getReceiptDownload(receipt.id));
    } catch (error) {
      setNotice({ type: "error", text: getErrorMessage(error) });
    } finally {
      setIsMutatingReceipt("");
    }
  }

  async function downloadSelectedReceipts(selectedReceipts: ReceiptListItem[]) {
    if (!selectedReceipts.length) {
      setNotice({
        type: "error",
        text: "Vui lòng chọn ít nhất một hóa đơn để tải.",
      });
      return;
    }

    setIsMutatingReceipt(BULK_RECEIPT_DOWNLOAD_ID);

    try {
      const download = await schoolApi.downloadReceipts({
        receiptIds: selectedReceipts.map((receipt) => receipt.id),
      });

      downloadBlobFile(
        download.blob,
        download.fileName,
        "application/zip",
        ".zip",
      );
      setNotice({
        type: "success",
        text: `Đã tải ${selectedReceipts.length} hóa đơn.`,
      });
    } catch (error) {
      setNotice({ type: "error", text: getErrorMessage(error) });
    } finally {
      setIsMutatingReceipt("");
    }
  }

  async function retryPdf(receipt: ReceiptListItem) {
    setIsMutatingReceipt(receipt.id);

    try {
      const updatedReceipt = await schoolApi.retryReceiptPdf(receipt.id);
      await loadBillingData();
      if (updatedReceipt.pdfStatus !== "pending") {
        setNotice({ type: "success", text: "Đã tạo lại PDF hóa đơn." });
      }
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
      unwatchReceipt(receiptToCancel.id);
      await loadBillingData();
      setReceiptToCancel(null);
      setNotice({
        type: "success",
        text: "Đã hủy hóa đơn và mở lại buổi học.",
      });
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
        receipt.paymentStatus === "cancelled"
          ? "unpaid"
          : receipt.paymentStatus,
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
        ? (candidates?.tuitionEntries.map((entry) => entry.tuitionEntryId) ??
            [])
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

    void loadCandidates(
      selectedStudent,
      issueForm,
      "multi_class",
      nextClassIds,
    );
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
        text: "Vui lòng nhập đủ giá buổi thường, giá kèm 1:1 và ngày áp dụng.",
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
      <div className="grid gap-3 md:grid-cols-4">
        <TuitionMetric
          icon={<Coins size={18} />}
          label="Buổi thường"
          tone="primary"
          value={formatMoney(classroom.regularPrice)}
        />
        <TuitionMetric
          icon={<Coins size={18} />}
          label="Học kèm 1:1"
          tone="info"
          value={formatMoney(classroom.makeupPrice)}
        />
        <TuitionMetric
          icon={<FileText size={18} />}
          label="Buổi chờ xuất"
          tone="warning"
          value={`${overview?.totals.unbilledLessonCount ?? 0} buổi`}
        />
        <TuitionMetric
          icon={<CheckCircle2 size={18} />}
          label="Sẵn sàng xuất"
          tone="success"
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
            setFilters((current) => ({
              ...current,
              fromDate: event.target.value,
            }))
          }
          type="date"
          value={filters.fromDate}
        />
        <TextInput
          icon={<CalendarDays size={16} />}
          label="Đến ngày"
          onChange={(event) =>
            setFilters((current) => ({
              ...current,
              toDate: event.target.value,
            }))
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

            <BillingStudentList
              onIssue={(row) => void openIssueModal(row)}
              students={overview?.students ?? []}
            />
          </section>

          <ReceiptHistory
            isMutatingReceipt={isMutatingReceipt}
            onBulkDownload={(selectedReceipts) =>
              void downloadSelectedReceipts(selectedReceipts)
            }
            onCancel={setReceiptToCancel}
            onDownload={(receipt) => void downloadReceipt(receipt)}
            onPayment={openPaymentModal}
            onRetryPdf={(receipt) => void retryPdf(receipt)}
            onView={(receipt) => void viewReceipt(receipt)}
            receipts={receipts}
          />
        </div>
      )}

      {selectedStudent ? (
        <IssueReceiptModal
          selectedTemplate={selectedTemplate}
          onTemplateChange={setSelectedTemplate}
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
          description={`Bạn sắp phát hành hóa đơn cho ${selectedStudent.fullName} bằng mẫu ${selectedTemplate?.name} (V${selectedTemplate?.version}). Các buổi đã chọn sẽ bị khóa để tránh xuất trùng.`}
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
      <div className="grid gap-4 border-b border-[var(--neutral-100)] pb-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-2 rounded-lg border border-[var(--brand-100)] bg-[var(--brand-50)] px-3 py-1.5 text-[13px] font-extrabold text-[var(--brand-700)]">
            <Coins size={14} />
            Cấu hình giá
          </div>
          <h3 className="mt-3 text-[18px] font-extrabold text-[var(--brand-950)]">
            Cập nhật giá buổi học
          </h3>
          <p className="mt-1 max-w-2xl text-[14px] font-semibold leading-6 text-[var(--neutral-500)]">
            Giá được lưu theo ngày áp dụng để khi nhập lại dữ liệu giấy, học phí
            sẽ tính theo đúng ngày học.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 text-[12px] font-extrabold lg:max-w-[520px] lg:justify-end">
          <span className="rounded-md border border-indigo-100 bg-indigo-50 px-3 py-1.5 text-indigo-700">
            Thường: {formatMoney(regularPrice)}
          </span>
          <span className="rounded-md border border-cyan-100 bg-cyan-50 px-3 py-1.5 text-cyan-800">
            Học kèm 1:1: {formatMoney(makeupPrice)}
          </span>
          <span className="rounded-md border border-amber-100 bg-amber-50 px-3 py-1.5 text-amber-800">
            Áp dụng từ:{" "}
            {formatDateInput(toVietnamDateInputValue(priceEffectiveFrom))}
          </span>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-[repeat(3,minmax(0,1fr))_minmax(190px,0.7fr)]">
        <CurrencyField
          label="Giá buổi thường"
          onChange={(value) => onChange({ ...form, regularPrice: value })}
          value={form.regularPrice}
        />
        <CurrencyField
          label="Giá học kèm 1:1"
          onChange={(value) => onChange({ ...form, makeupPrice: value })}
          value={form.makeupPrice}
        />
        <PriceDateField
          onChange={(value) => onChange({ ...form, priceEffectiveFrom: value })}
          value={form.priceEffectiveFrom}
        />
        <div className="grid content-end">
          <PrimaryAction
            className="!h-12 w-full whitespace-nowrap"
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
      </div>
    </section>
  );
}

function PriceDateField({
  onChange,
  value,
}: {
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-[14px] font-bold text-[var(--neutral-600)]">
        Ngày áp dụng
      </span>
      <span className="relative">
        <CalendarDays
          aria-hidden="true"
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--neutral-400)]"
          size={16}
        />
        <input
          className="h-12 w-full rounded-lg border border-[var(--neutral-200)] bg-white pl-11 pr-4 text-[15px] font-medium text-[var(--neutral-800)] outline-none transition focus:border-[var(--brand-400)] focus:shadow-[0_0_0_3px_rgba(99,102,241,0.12)]"
          onChange={(event) => onChange(event.target.value)}
          type="date"
          value={value}
        />
      </span>
    </label>
  );
}
