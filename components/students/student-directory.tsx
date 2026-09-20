"use client";

import { useRouter } from "next/navigation";
import {
  Download,
  FileSpreadsheet,
  Filter,
  LoaderCircle,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent, FormEvent, KeyboardEvent } from "react";
import { schoolApi } from "@/lib/api/school";
import type {
  DeleteStudentMode,
  Student,
  StudentImportResult,
  StudentSortField,
  StudentSortOrder,
  StudentStatus,
} from "@/types/school";
import {
  buildStudentFormFromStudent,
  buildStudentPayload,
  initialStudentForm,
  type StudentFormState,
} from "@/components/classes/classroom-types";
import { useNotice } from "@/components/ui/notice-provider";
import {
  getErrorMessage,
  getGenderLabel,
} from "@/components/classes/classroom-utils";
import {
  ConfirmDialog,
  EmptyState,
  InlineLoading,
  Modal,
  PrimaryAction,
  SecondaryAction,
  TextInput,
} from "@/components/classes/classroom-ui";
import { StudentDetailModal } from "@/components/classes/student-detail-modal";
import { StudentFormFields } from "@/components/classes/student-form-fields";
import { useDeferredStudentAvatarUpload } from "@/components/classes/use-deferred-student-avatar-upload";
import styles from "@/components/classes/classroom-manager.module.css";
import {
  BulkStudentActionMenu,
  DeleteStudentModal,
  FilterSelect,
  ImportStudentsModal,
  StudentDirectoryIdentity,
  buildStudentUpdatePayload,
} from "@/components/students/student-directory-parts";

const studentStatusOptions: Array<{
  label: string;
  value: "all" | StudentStatus;
}> = [
  { label: "Tất cả", value: "all" },
  { label: "Đang học", value: "active" },
  { label: "Tạm nghỉ", value: "inactive" },
];

const studentSortOptions: Array<{
  label: string;
  value: StudentSortField;
}> = [
  { label: "Tên học sinh", value: "fullName" },
  { label: "Lớp mấy", value: "gradeLevel" },
  { label: "Mới tạo", value: "createdAt" },
  { label: "Mới cập nhật", value: "updatedAt" },
];

const studentSortOrderOptions: Array<{
  label: string;
  value: StudentSortOrder;
}> = [
  { label: "Tăng dần", value: "asc" },
  { label: "Giảm dần", value: "desc" },
];

export function StudentDirectory() {
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | StudentStatus>(
    "active",
  );
  const [gradeFilter, setGradeFilter] = useState("");
  const [sortBy, setSortBy] = useState<StudentSortField>("fullName");
  const [sortOrder, setSortOrder] = useState<StudentSortOrder>("asc");
  const [studentForm, setStudentForm] =
    useState<StudentFormState>(initialStudentForm);
  const { setNotice } = useNotice();
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isImportConfirmOpen, setIsImportConfirmOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<StudentImportResult | null>(
    null,
  );
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isCreateConfirmOpen, setIsCreateConfirmOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [isEditConfirmOpen, setIsEditConfirmOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [deletingStudent, setDeletingStudent] = useState<Student | null>(null);
  const [deleteMode, setDeleteMode] = useState<DeleteStudentMode>("deactivate");
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState<Student[]>([]);
  const [bulkDeleteMode, setBulkDeleteMode] =
    useState<DeleteStudentMode>("deactivate");
  const [isBulkDeleteConfirmOpen, setIsBulkDeleteConfirmOpen] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [openingReceiptStudentId, setOpeningReceiptStudentId] = useState("");
  const {
    avatarPreviewUrl,
    isUploadingAvatar,
    resetAvatarSelection,
    selectAvatarFile,
    uploadSelectedAvatar,
  } = useDeferredStudentAvatarUpload();
  const visibleStudentIds = useMemo(
    () => new Set(students.map((student) => student.id)),
    [students],
  );
  const selectedVisibleStudents = useMemo(
    () =>
      selectedStudents.filter((student) => visibleStudentIds.has(student.id)),
    [selectedStudents, visibleStudentIds],
  );
  const selectedStudentIds = useMemo(
    () => new Set(selectedVisibleStudents.map((student) => student.id)),
    [selectedVisibleStudents],
  );
  const allVisibleSelected =
    students.length > 0 &&
    students.every((student) => selectedStudentIds.has(student.id));

  useEffect(() => {
    let isCurrent = true;
    const timer = window.setTimeout(async () => {
      setIsLoading(true);

      try {
        const results = await schoolApi.listStudents({
          gradeLevel: gradeFilter,
          limit: "200",
          search,
          sortBy,
          sortOrder,
          status: statusFilter === "all" ? undefined : statusFilter,
        });

        if (isCurrent) {
          setStudents(results);
        }
      } catch (error) {
        if (isCurrent) {
          setNotice({ type: "error", text: getErrorMessage(error) });
        }
      } finally {
        if (isCurrent) {
          setIsLoading(false);
        }
      }
    }, 250);

    return () => {
      isCurrent = false;
      window.clearTimeout(timer);
    };
  }, [gradeFilter, search, sortBy, sortOrder, statusFilter, setNotice]);

  async function reloadStudents() {
    const results = await schoolApi.listStudents({
      gradeLevel: gradeFilter,
      limit: "200",
      search,
      sortBy,
      sortOrder,
      status: statusFilter === "all" ? undefined : statusFilter,
    });
    setStudents(results);
  }

  function resetFilters() {
    setSearch("");
    setGradeFilter("");
    setStatusFilter("active");
    setSortBy("fullName");
    setSortOrder("asc");
  }

  async function handleDownloadTemplate() {
    setIsDownloadingTemplate(true);
    setNotice(null);

    try {
      const template = await schoolApi.downloadStudentImportTemplate();
      const url = window.URL.createObjectURL(template.blob);
      const link = document.createElement("a");
      link.href = url;
      link.download =
        template.fileName === "receipt.pdf"
          ? "mau-import-hoc-sinh-edutrack.xlsx"
          : template.fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      setNotice({ type: "error", text: getErrorMessage(error) });
    } finally {
      setIsDownloadingTemplate(false);
    }
  }

  function handleOpenImportModal() {
    setImportFile(null);
    setImportResult(null);
    setIsImportConfirmOpen(false);
    setIsImportModalOpen(true);
  }

  function handleCloseImportModal() {
    if (isImporting) {
      return;
    }

    setImportFile(null);
    setImportResult(null);
    setIsImportConfirmOpen(false);
    setIsImportModalOpen(false);
  }

  function handleImportFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setImportFile(file);
    setImportResult(null);
  }

  async function executeImportStudents() {
    if (!importFile) {
      setNotice({ type: "error", text: "Vui lòng chọn file danh sách." });
      return;
    }

    setIsImporting(true);
    setNotice(null);

    try {
      const result = await schoolApi.importStudents(importFile);
      setImportResult(result);
      setIsImportConfirmOpen(false);
      setNotice({
        type: result.failedCount ? "error" : "success",
        text: `Import xong: ${result.successCount} thành công, ${result.failedCount} lỗi.`,
      });
      await reloadStudents();
    } catch (error) {
      setNotice({ type: "error", text: getErrorMessage(error) });
      setIsImportConfirmOpen(false);
    } finally {
      setIsImporting(false);
    }
  }

  function handleCloseCreateModal() {
    if (isCreating || isUploadingAvatar) {
      return;
    }

    setIsCreateModalOpen(false);
    setIsCreateConfirmOpen(false);
    setStudentForm(initialStudentForm);
    resetAvatarSelection();
  }

  function handleOpenEditStudent(student: Student) {
    resetAvatarSelection();
    setStudentForm(buildStudentFormFromStudent(student));
    setEditingStudent(student);
    setSelectedStudent(null);
  }

  function handleCloseEditModal() {
    if (isUpdating || isUploadingAvatar) {
      return;
    }

    setEditingStudent(null);
    setIsEditConfirmOpen(false);
    setStudentForm(initialStudentForm);
    resetAvatarSelection();
  }

  function handleOpenDeleteStudent(student: Student) {
    setDeletingStudent(student);
    setDeleteMode("deactivate");
    setSelectedStudent(null);
  }

  function toggleStudentSelection(student: Student) {
    if (isBulkDeleting) {
      return;
    }

    setSelectedStudents((current) =>
      current.some((selectedStudent) => selectedStudent.id === student.id)
        ? current.filter((selectedStudent) => selectedStudent.id !== student.id)
        : [...current, student],
    );
  }

  function toggleVisibleStudents() {
    if (isBulkDeleting || !students.length) {
      return;
    }

    setSelectedStudents((current) =>
      allVisibleSelected
        ? current.filter((student) => !visibleStudentIds.has(student.id))
        : [
            ...current.filter((student) => !visibleStudentIds.has(student.id)),
            ...students,
          ],
    );
  }

  function handleOpenBulkDelete(mode: DeleteStudentMode) {
    if (!selectedVisibleStudents.length) {
      return;
    }

    setBulkDeleteMode(mode);
    setIsBulkDeleteConfirmOpen(true);
  }

  function handleStudentCardKeyDown(
    event: KeyboardEvent<HTMLElement>,
    student: Student,
  ) {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    setSelectedStudent(student);
  }

  async function handleCreateStudent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!studentForm.fullName.trim()) {
      setNotice({ type: "error", text: "Vui lòng nhập họ tên học sinh." });
      return;
    }

    setIsCreateConfirmOpen(true);
  }

  async function executeCreateStudent() {
    setIsCreating(true);
    setNotice(null);

    try {
      const payload = buildStudentPayload(studentForm);
      const uploadedAvatarUrl = await uploadSelectedAvatar();

      if (uploadedAvatarUrl) {
        payload.avatarUrl = uploadedAvatarUrl;
      }

      const student = await schoolApi.createStudent(payload);
      setStudentForm(initialStudentForm);
      resetAvatarSelection();
      setIsCreateModalOpen(false);
      setIsCreateConfirmOpen(false);
      setNotice({
        type: "success",
        text: `Đã tạo hồ sơ ${student.fullName}.`,
      });
      await reloadStudents();
    } catch (error) {
      setNotice({ type: "error", text: getErrorMessage(error) });
      setIsCreateConfirmOpen(false);
    } finally {
      setIsCreating(false);
    }
  }

  async function handleUpdateStudent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!studentForm.fullName.trim()) {
      setNotice({ type: "error", text: "Vui lòng nhập họ tên học sinh." });
      return;
    }

    if (!studentForm.studentCode.trim()) {
      setNotice({ type: "error", text: "Vui lòng nhập mã học sinh." });
      return;
    }

    setIsEditConfirmOpen(true);
  }

  async function executeUpdateStudent() {
    if (!editingStudent) {
      return;
    }

    setIsUpdating(true);
    setNotice(null);

    try {
      const payload = buildStudentUpdatePayload(studentForm);
      const uploadedAvatarUrl = await uploadSelectedAvatar();

      if (uploadedAvatarUrl) {
        payload.avatarUrl = uploadedAvatarUrl;
      }

      const student = await schoolApi.updateStudent(editingStudent.id, payload);
      setStudentForm(initialStudentForm);
      resetAvatarSelection();
      setEditingStudent(null);
      setIsEditConfirmOpen(false);
      setNotice({
        type: "success",
        text: `Đã cập nhật hồ sơ ${student.fullName}.`,
      });
      await reloadStudents();
    } catch (error) {
      setNotice({ type: "error", text: getErrorMessage(error) });
      setIsEditConfirmOpen(false);
    } finally {
      setIsUpdating(false);
    }
  }

  async function executeDeleteStudent() {
    if (!deletingStudent) {
      return;
    }

    setIsDeleting(true);
    setNotice(null);

    try {
      await schoolApi.deleteStudent(deletingStudent.id, deleteMode);
      setNotice({
        type: "success",
        text:
          deleteMode === "delete"
            ? `Đã xóa vĩnh viễn hồ sơ ${deletingStudent.fullName}.`
            : `Đã chuyển ${deletingStudent.fullName} sang trạng thái tạm nghỉ.`,
      });
      setDeletingStudent(null);
      setSelectedStudent(null);
      await reloadStudents();
    } catch (error) {
      setNotice({ type: "error", text: getErrorMessage(error) });
    } finally {
      setIsDeleting(false);
    }
  }

  async function executeBulkDeleteStudents() {
    if (!selectedVisibleStudents.length) {
      return;
    }

    setIsBulkDeleting(true);
    setNotice(null);

    try {
      const result = await schoolApi.deleteStudents(
        selectedVisibleStudents.map((student) => student.id),
        bulkDeleteMode,
      );
      const actionText =
        bulkDeleteMode === "delete" ? "xóa vĩnh viễn" : "chuyển tạm nghỉ";

      setNotice({
        type: result.failedCount ? "error" : "success",
        text: result.failedCount
          ? `Đã ${actionText} ${result.successCount} học sinh, ${result.failedCount} học sinh chưa xử lý được.`
          : `Đã ${actionText} ${result.successCount} học sinh.`,
      });
      setSelectedStudents([]);
      setIsBulkDeleteConfirmOpen(false);
      await reloadStudents();
    } catch (error) {
      setNotice({ type: "error", text: getErrorMessage(error) });
      setIsBulkDeleteConfirmOpen(false);
    } finally {
      setIsBulkDeleting(false);
    }
  }

  async function openMultiClassReceipt(student: Student) {
    setOpeningReceiptStudentId(student.id);
    setNotice(null);

    try {
      const overview = await schoolApi.getStudentBillingOverview(student.id);
      const targetClass =
        overview.classes.find((item) => item.unbilledLessonCount > 0)?.class ??
        overview.classes[0]?.class;

      if (!targetClass) {
        setNotice({
          type: "error",
          text: "Học sinh này chưa có lớp hoặc buổi học nào để xuất hóa đơn.",
        });
        return;
      }

      setSelectedStudent(null);
      router.push(
        `/classes/${targetClass.id}?receiptMode=multi_class&receiptStudentId=${student.id}`,
      );
    } catch (error) {
      setNotice({ type: "error", text: getErrorMessage(error) });
    } finally {
      setOpeningReceiptStudentId("");
    }
  }

  const hasActiveFilters =
    Boolean(search.trim()) ||
    Boolean(gradeFilter.trim()) ||
    statusFilter !== "active" ||
    sortBy !== "fullName" ||
    sortOrder !== "asc";

  return (
    <section className="grid gap-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        {selectedVisibleStudents.length ? (
          <BulkStudentActionMenu
            disabled={isBulkDeleting}
            onSelectAction={handleOpenBulkDelete}
            selectedCount={selectedVisibleStudents.length}
          />
        ) : (
          <span aria-hidden="true" />
        )}

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-end">
          <SecondaryAction
            className="w-full sm:w-auto"
            disabled={isDownloadingTemplate}
            icon={
              isDownloadingTemplate ? (
                <LoaderCircle className="animate-spin" size={16} />
              ) : (
                <Download size={16} />
              )
            }
            onClick={() => void handleDownloadTemplate()}
            type="button"
          >
            Tải mẫu
          </SecondaryAction>
          <SecondaryAction
            className="w-full sm:w-auto"
            icon={<FileSpreadsheet size={16} />}
            onClick={handleOpenImportModal}
            type="button"
          >
            Import danh sách
          </SecondaryAction>
          <PrimaryAction
            className="w-full sm:w-auto"
            icon={<Plus size={16} />}
            onClick={() => setIsCreateModalOpen(true)}
            type="button"
          >
            Tạo học sinh
          </PrimaryAction>
        </div>
      </div>

      <section className="rounded-lg border border-[var(--neutral-200)] bg-white p-5 shadow-[var(--shadow-card)]">
        <div className="mb-4 grid gap-3 xl:grid-cols-[minmax(260px,1fr)_minmax(150px,0.55fr)_minmax(150px,0.55fr)_minmax(170px,0.6fr)_minmax(140px,0.5fr)_auto] xl:items-end">
          <TextInput
            icon={<Search size={16} />}
            label="Tìm học sinh"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Tên, mã, số điện thoại..."
            type="search"
            value={search}
          />
          <TextInput
            icon={<Filter size={16} />}
            label="Lớp mấy"
            onChange={(event) => setGradeFilter(event.target.value)}
            placeholder="VD: Lớp 5"
            value={gradeFilter}
          />
          <FilterSelect
            label="Trạng thái"
            onChange={(value) =>
              setStatusFilter(value as "all" | StudentStatus)
            }
            options={studentStatusOptions}
            value={statusFilter}
          />
          <FilterSelect
            label="Sắp xếp"
            onChange={(value) => setSortBy(value as StudentSortField)}
            options={studentSortOptions}
            value={sortBy}
          />
          <FilterSelect
            label="Thứ tự"
            onChange={(value) => setSortOrder(value as StudentSortOrder)}
            options={studentSortOrderOptions}
            value={sortOrder}
          />
          <div className="grid gap-2">
            <span className="text-[14px] font-bold text-transparent">Tổng</span>
            <div className="grid gap-2 sm:grid-cols-[auto_auto] xl:grid-cols-1">
              <span className="inline-flex h-12 items-center justify-center rounded-lg border border-[var(--neutral-200)] bg-[var(--neutral-50)] px-4 text-[14px] font-bold text-[var(--neutral-600)]">
                {students.length} học sinh
              </span>
              {hasActiveFilters ? (
                <button
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-[var(--neutral-200)] bg-white px-4 text-[14px] font-bold text-[var(--neutral-600)] transition hover:border-[var(--brand-200)] hover:bg-[var(--brand-50)] hover:text-[var(--brand-700)]"
                  onClick={resetFilters}
                  type="button"
                >
                  <RotateCcw size={15} />
                  Xóa lọc
                </button>
              ) : null}
            </div>
          </div>
        </div>

        {isLoading ? (
          <InlineLoading text="Đang tải học sinh..." />
        ) : students.length ? (
          <div className={styles.studentListScroller}>
            <div
              className={`${styles.studentListTable} ${styles.selectableStudentListTable}`}
            >
              <div
                className={`${styles.studentTableHeader} ${styles.selectableStudentTableRow} rounded-lg bg-[var(--neutral-50)] px-4 py-3 text-[13px] font-bold text-[var(--neutral-500)]`}
              >
                <label
                  className="flex items-center justify-center"
                  onClick={(event) => event.stopPropagation()}
                >
                  <input
                    aria-label="Chọn tất cả học sinh đang hiển thị"
                    checked={allVisibleSelected}
                    className={styles.studentBulkCheckbox}
                    disabled={isBulkDeleting || !students.length}
                    onChange={toggleVisibleStudents}
                    type="checkbox"
                  />
                </label>
                <span>Học sinh</span>
                <span>Lớp mấy</span>
                <span>Giới tính</span>
                <span>Liên hệ</span>
                <span>Phụ huynh</span>
                <span>Trạng thái</span>
              </div>

              {students.map((student) => (
                <div
                  className={`${styles.studentTableRow} ${styles.selectableStudentTableRow} cursor-pointer rounded-lg border border-[var(--neutral-200)] px-4 py-3 transition hover:border-[var(--brand-200)] hover:bg-[var(--brand-50)] focus-visible:border-[var(--brand-400)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgba(99,102,241,0.18)] ${
                    selectedStudentIds.has(student.id)
                      ? "border-[var(--brand-200)] bg-[var(--brand-50)]"
                      : ""
                  }`}
                  key={student.id}
                  onClick={() => setSelectedStudent(student)}
                  onKeyDown={(event) =>
                    handleStudentCardKeyDown(event, student)
                  }
                  role="button"
                  tabIndex={0}
                >
                  <label
                    className="flex items-center justify-center"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <input
                      aria-label={`Chọn ${student.fullName}`}
                      checked={selectedStudentIds.has(student.id)}
                      className={styles.studentBulkCheckbox}
                      disabled={isBulkDeleting}
                      onChange={() => toggleStudentSelection(student)}
                      type="checkbox"
                    />
                  </label>
                  <StudentDirectoryIdentity student={student} />
                  <span className="truncate text-[14px] font-semibold text-[var(--neutral-600)]">
                    {student.gradeLevel || "Chưa có"}
                  </span>
                  <span className="text-[14px] font-semibold text-[var(--neutral-600)]">
                    {getGenderLabel(student.gender)}
                  </span>
                  <span className="truncate text-[14px] text-[var(--neutral-600)]">
                    {student.phone || "Chưa có"}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[14px] font-bold text-[var(--neutral-700)]">
                      {student.parent?.fullName || "Chưa có"}
                    </span>
                    <span className="block truncate text-[13px] text-[var(--neutral-500)]">
                      {student.parent?.phone || "Chưa có số điện thoại"}
                    </span>
                  </span>
                  <span
                    className={`inline-flex h-9 w-fit items-center rounded-lg border px-3 text-[13px] font-bold ${
                      student.status === "active"
                        ? "border-emerald-100 bg-emerald-50 text-emerald-700"
                        : "border-orange-100 bg-orange-50 text-orange-700"
                    }`}
                  >
                    {student.status === "active" ? "Đang học" : "Tạm nghỉ"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <EmptyState
            action={
              <PrimaryAction
                icon={<UserPlus size={15} />}
                onClick={() => setIsCreateModalOpen(true)}
                type="button"
              >
                Tạo học sinh
              </PrimaryAction>
            }
            icon={<Users size={22} />}
            text={
              hasActiveFilters
                ? "Không tìm thấy học sinh phù hợp."
                : "Chưa có học sinh nào trong danh bạ."
            }
          />
        )}
      </section>

      {isImportModalOpen ? (
        <ImportStudentsModal
          file={importFile}
          isImporting={isImporting}
          onClose={handleCloseImportModal}
          onConfirm={() => setIsImportConfirmOpen(true)}
          onDownloadTemplate={() => void handleDownloadTemplate()}
          onFileChange={handleImportFileChange}
          result={importResult}
        />
      ) : null}

      {isImportConfirmOpen && importFile ? (
        <ConfirmDialog
          confirmText="Import danh sách"
          description={`Bạn sắp tạo học sinh từ file "${importFile.name}". Dòng hợp lệ sẽ được tạo, dòng lỗi sẽ được báo lại sau khi import.`}
          isLoading={isImporting}
          onCancel={() => setIsImportConfirmOpen(false)}
          onConfirm={() => void executeImportStudents()}
          title="Xác nhận import học sinh"
        />
      ) : null}

      {isCreateModalOpen ? (
        <Modal onClose={handleCloseCreateModal} title="Tạo học sinh mới">
          <form className="grid gap-5" onSubmit={handleCreateStudent}>
            <StudentFormFields
              avatarPreviewUrl={avatarPreviewUrl}
              form={studentForm}
              isUploadingAvatar={isUploadingAvatar}
              onAvatarUpload={(event) =>
                selectAvatarFile(event, (message) =>
                  setNotice({ type: "error", text: message }),
                )
              }
              onChange={setStudentForm}
            />
            <div className="flex flex-col-reverse gap-3 border-t border-[var(--neutral-200)] pt-4 sm:flex-row sm:justify-end">
              <SecondaryAction onClick={handleCloseCreateModal} type="button">
                Hủy
              </SecondaryAction>
              <PrimaryAction
                disabled={isCreating || isUploadingAvatar}
                icon={
                  isCreating ? (
                    <LoaderCircle className="animate-spin" size={16} />
                  ) : (
                    <UserPlus size={16} />
                  )
                }
                type="submit"
              >
                Tạo học sinh
              </PrimaryAction>
            </div>
          </form>
        </Modal>
      ) : null}

      {isCreateConfirmOpen ? (
        <ConfirmDialog
          confirmText="Tạo học sinh"
          description={`Bạn sắp tạo hồ sơ học sinh "${studentForm.fullName.trim()}"`}
          isLoading={isCreating || isUploadingAvatar}
          onCancel={() => setIsCreateConfirmOpen(false)}
          onConfirm={() => void executeCreateStudent()}
          title="Xác nhận tạo học sinh"
        />
      ) : null}

      {editingStudent ? (
        <Modal onClose={handleCloseEditModal} title="Sửa thông tin học sinh">
          <form className="grid gap-5" onSubmit={handleUpdateStudent}>
            <StudentFormFields
              avatarPreviewUrl={avatarPreviewUrl}
              form={studentForm}
              isUploadingAvatar={isUploadingAvatar}
              onAvatarUpload={(event) =>
                selectAvatarFile(event, (message) =>
                  setNotice({ type: "error", text: message }),
                )
              }
              onChange={setStudentForm}
              showStatus
            />
            <div className="flex flex-col-reverse gap-3 border-t border-[var(--neutral-200)] pt-4 sm:flex-row sm:justify-end">
              <SecondaryAction onClick={handleCloseEditModal} type="button">
                Hủy
              </SecondaryAction>
              <PrimaryAction
                disabled={isUpdating || isUploadingAvatar}
                icon={
                  isUpdating ? (
                    <LoaderCircle className="animate-spin" size={16} />
                  ) : (
                    <Pencil size={16} />
                  )
                }
                type="submit"
              >
                Lưu thay đổi
              </PrimaryAction>
            </div>
          </form>
        </Modal>
      ) : null}

      {isEditConfirmOpen && editingStudent ? (
        <ConfirmDialog
          confirmText="Lưu thay đổi"
          description={`Bạn sắp cập nhật hồ sơ học sinh "${studentForm.fullName.trim()}". Ảnh mới chỉ được tải lên sau khi xác nhận.`}
          isLoading={isUpdating || isUploadingAvatar}
          onCancel={() => setIsEditConfirmOpen(false)}
          onConfirm={() => void executeUpdateStudent()}
          title="Xác nhận sửa học sinh"
        />
      ) : null}

      {deletingStudent ? (
        <DeleteStudentModal
          isDeleting={isDeleting}
          mode={deleteMode}
          onChangeMode={setDeleteMode}
          onClose={() => setDeletingStudent(null)}
          onConfirm={() => void executeDeleteStudent()}
          student={deletingStudent}
        />
      ) : null}

      {isBulkDeleteConfirmOpen ? (
        <ConfirmDialog
          confirmText={
            bulkDeleteMode === "delete" ? "Xóa vĩnh viễn" : "Chuyển tạm nghỉ"
          }
          description={
            bulkDeleteMode === "delete"
              ? `Bạn sắp xóa vĩnh viễn ${selectedVisibleStudents.length} học sinh đã chọn. Thao tác này không nên dùng nếu còn cần lịch sử quản lý.`
              : `Bạn sắp chuyển ${selectedVisibleStudents.length} học sinh đã chọn sang trạng thái tạm nghỉ và rời khỏi các lớp đang học.`
          }
          isLoading={isBulkDeleting}
          onCancel={() => setIsBulkDeleteConfirmOpen(false)}
          onConfirm={() => void executeBulkDeleteStudents()}
          title={
            bulkDeleteMode === "delete"
              ? "Xác nhận xóa nhiều học sinh"
              : "Xác nhận tạm nghỉ nhiều học sinh"
          }
          tone="danger"
        />
      ) : null}

      {selectedStudent ? (
        <StudentDetailModal
          actions={
            <>
              <SecondaryAction
                className="w-full sm:w-auto"
                icon={<Pencil size={15} />}
                onClick={() => handleOpenEditStudent(selectedStudent)}
                type="button"
              >
                Sửa
              </SecondaryAction>
              <button
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg border border-red-100 bg-red-50 px-5 text-[14px] font-bold text-red-600 transition hover:border-red-200 hover:bg-red-100 sm:w-auto"
                onClick={() => handleOpenDeleteStudent(selectedStudent)}
                type="button"
              >
                <Trash2 size={15} />
                Xóa
              </button>
            </>
          }
          onClose={() => setSelectedStudent(null)}
          onIssueMultiClassReceipt={(student) =>
            void openMultiClassReceipt(student)
          }
          receiptActionLoading={openingReceiptStudentId === selectedStudent.id}
          student={selectedStudent}
        />
      ) : null}
    </section>
  );
}
