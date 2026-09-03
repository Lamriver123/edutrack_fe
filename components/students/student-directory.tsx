"use client";

import {
  AlertTriangle,
  Pencil,
  LoaderCircle,
  Plus,
  Search,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";
import { schoolApi } from "@/lib/api/school";
import type {
  DeleteStudentMode,
  Student,
  UpdateStudentPayload,
} from "@/types/school";
import {
  buildStudentFormFromStudent,
  buildStudentPayload,
  initialStudentForm,
  type Notice,
  type StudentFormState,
} from "@/components/classes/classroom-types";
import {
  getErrorMessage,
  getGenderLabel,
  getStudentAvatar,
} from "@/components/classes/classroom-utils";
import {
  ConfirmDialog,
  EmptyState,
  InlineLoading,
  Modal,
  NoticeBanner,
  PrimaryAction,
  SecondaryAction,
  StudentAvatar,
  TextInput,
} from "@/components/classes/classroom-ui";
import { StudentDetailModal } from "@/components/classes/student-detail-modal";
import { StudentFormFields } from "@/components/classes/student-form-fields";
import { useDeferredStudentAvatarUpload } from "@/components/classes/use-deferred-student-avatar-upload";
import styles from "@/components/classes/classroom-manager.module.css";

export function StudentDirectory() {
  const [students, setStudents] = useState<Student[]>([]);
  const [search, setSearch] = useState("");
  const [studentForm, setStudentForm] =
    useState<StudentFormState>(initialStudentForm);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isCreateConfirmOpen, setIsCreateConfirmOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [isEditConfirmOpen, setIsEditConfirmOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [deletingStudent, setDeletingStudent] = useState<Student | null>(null);
  const [deleteMode, setDeleteMode] =
    useState<DeleteStudentMode>("deactivate");
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const {
    avatarFileName,
    avatarPreviewUrl,
    isUploadingAvatar,
    resetAvatarSelection,
    selectAvatarFile,
    uploadSelectedAvatar,
  } = useDeferredStudentAvatarUpload();

  useEffect(() => {
    let isCurrent = true;
    const timer = window.setTimeout(async () => {
      setIsLoading(true);

      try {
        const results = await schoolApi.searchStudents(search);

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
  }, [search]);

  async function reloadStudents() {
    const results = await schoolApi.searchStudents(search);
    setStudents(results);
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

  return (
    <section className="grid gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <PrimaryAction
          className="w-full sm:w-auto"
          icon={<Plus size={16} />}
          onClick={() => setIsCreateModalOpen(true)}
          type="button"
        >
          Tạo học sinh
        </PrimaryAction>
      </div>

      {notice ? (
        <NoticeBanner notice={notice} onClose={() => setNotice(null)} />
      ) : null}

      <section className="rounded-lg border border-[var(--neutral-200)] bg-white p-5 shadow-[var(--shadow-card)]">
        <div className="mb-4 grid gap-3 lg:grid-cols-[1fr_auto] lg:items-end">
          <TextInput
            icon={<Search size={16} />}
            label="Tìm học sinh"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Tên, mã, số điện thoại..."
            type="search"
            value={search}
          />
          <span className="inline-flex h-12 items-center justify-center rounded-lg border border-[var(--neutral-200)] bg-[var(--neutral-50)] px-4 text-[14px] font-bold text-[var(--neutral-600)]">
            {students.length} học sinh
          </span>
        </div>

        {isLoading ? (
          <InlineLoading text="Đang tải học sinh..." />
        ) : students.length ? (
          <div className={styles.studentListScroller}>
            <div className={styles.studentListTable}>
              <div
                className={`${styles.studentTableHeader} rounded-lg bg-[var(--neutral-50)] px-4 py-3 text-[13px] font-bold text-[var(--neutral-500)]`}
              >
                <span>Học sinh</span>
                <span>Giới tính</span>
                <span>Liên hệ</span>
                <span>Phụ huynh</span>
                <span>Trạng thái</span>
              </div>

              {students.map((student) => (
                <div
                  className={`${styles.studentTableRow} cursor-pointer rounded-lg border border-[var(--neutral-200)] px-4 py-3 transition hover:border-[var(--brand-200)] hover:bg-[var(--brand-50)] focus-visible:border-[var(--brand-400)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgba(99,102,241,0.18)]`}
                  key={student.id}
                  onClick={() => setSelectedStudent(student)}
                  onKeyDown={(event) => handleStudentCardKeyDown(event, student)}
                  role="button"
                  tabIndex={0}
                >
                  <StudentDirectoryIdentity student={student} />
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
              search
                ? "Không tìm thấy học sinh phù hợp."
                : "Chưa có học sinh nào trong danh bạ."
            }
          />
        )}
      </section>

      {isCreateModalOpen ? (
        <Modal
          onClose={handleCloseCreateModal}
          title="Tạo học sinh mới"
        >
          <form className="grid gap-5" onSubmit={handleCreateStudent}>
            <StudentFormFields
              avatarFileName={avatarFileName}
              avatarPreviewUrl={avatarPreviewUrl}
              form={studentForm}
              isUploadingAvatar={isUploadingAvatar}
              subtitle="Tạo hồ sơ học sinh độc lập trong danh bạ."
              onAvatarUpload={(event) =>
                selectAvatarFile(event, (message) =>
                  setNotice({ type: "error", text: message }),
                )
              }
              onChange={setStudentForm}
            />
            <div className="flex flex-col-reverse gap-3 border-t border-[var(--neutral-200)] pt-4 sm:flex-row sm:justify-end">
              <SecondaryAction
                onClick={handleCloseCreateModal}
                type="button"
              >
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
        <Modal onClose={handleCloseEditModal} title="Sửa học sinh">
          <form className="grid gap-5" onSubmit={handleUpdateStudent}>
            <StudentFormFields
              avatarFileName={avatarFileName}
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
              subtitle="Cập nhật hồ sơ, liên hệ phụ huynh và trạng thái học sinh."
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
          student={selectedStudent}
        />
      ) : null}
    </section>
  );
}

function StudentDirectoryIdentity({ student }: { student: Student }) {
  return (
    <div className="grid min-w-0 grid-cols-[48px_1fr] items-center gap-3">
      <StudentAvatar alt={student.fullName} src={getStudentAvatar(student)} />
      <span className="min-w-0">
        <span className="block truncate text-[15px] font-bold text-[var(--neutral-800)]">
          {student.fullName}
        </span>
        <span className="block truncate text-[13px] text-[var(--neutral-500)]">
          {student.studentCode}
        </span>
      </span>
    </div>
  );
}

function buildStudentUpdatePayload(
  form: StudentFormState,
): UpdateStudentPayload {
  return {
    studentCode: form.studentCode.trim(),
    fullName: form.fullName.trim(),
    gender: form.gender,
    avatarUrl: form.avatarUrl.trim() || undefined,
    dateOfBirth: form.dateOfBirth || undefined,
    phone: form.phone.trim(),
    parent: {
      fullName: form.parentFullName.trim(),
      phone: form.parentPhone.trim(),
      relation: form.parentRelation.trim(),
      note: form.parentNote.trim(),
    },
    address: form.address.trim(),
    note: form.note.trim(),
    status: form.status,
  };
}

function DeleteStudentModal({
  isDeleting,
  mode,
  onChangeMode,
  onClose,
  onConfirm,
  student,
}: {
  isDeleting: boolean;
  mode: DeleteStudentMode;
  onChangeMode: (mode: DeleteStudentMode) => void;
  onClose: () => void;
  onConfirm: () => void;
  student: Student;
}) {
  const options: Array<{
    description: string;
    label: string;
    value: DeleteStudentMode;
  }> = [
    {
      description:
        "Giữ hồ sơ trong danh bạ, đổi trạng thái sang tạm nghỉ và rời khỏi các lớp đang học.",
      label: "Tạm nghỉ",
      value: "deactivate",
    },
    {
      description:
        "Xóa hồ sơ khỏi hệ thống. Thao tác này không nên dùng nếu còn cần lịch sử quản lý.",
      label: "Xóa vĩnh viễn",
      value: "delete",
    },
  ];

  return (
    <Modal onClose={isDeleting ? () => undefined : onClose} size="sm" title="Xóa học sinh">
      <div className="grid gap-4">
        <div className="grid gap-3 rounded-lg border border-red-100 bg-red-50 p-4 text-red-700">
          <span className="flex items-center gap-2 text-[15px] font-extrabold">
            <AlertTriangle size={18} />
            Chọn cách xử lý hồ sơ
          </span>
          <p className="text-[14px] font-semibold leading-6">
            Bạn đang thao tác với học sinh {student.fullName}. Vui lòng chọn
            cách xóa trước khi xác nhận.
          </p>
        </div>

        <div className="grid gap-2">
          {options.map((option) => {
            const isActive = mode === option.value;

            return (
              <button
                className={`grid gap-1 rounded-lg border p-3 text-left transition ${
                  isActive
                    ? "border-red-300 bg-red-50 text-red-800"
                    : "border-[var(--neutral-200)] bg-white text-[var(--neutral-700)] hover:border-red-100 hover:bg-red-50"
                }`}
                disabled={isDeleting}
                key={option.value}
                onClick={() => onChangeMode(option.value)}
                type="button"
              >
                <strong className="text-[14px]">{option.label}</strong>
                <span className="text-[13px] font-semibold leading-5 text-[var(--neutral-500)]">
                  {option.description}
                </span>
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 gap-3 pt-2 sm:grid-cols-2">
          <SecondaryAction disabled={isDeleting} onClick={onClose} type="button">
            Hủy
          </SecondaryAction>
          <button
            className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-red-500 bg-red-600 px-5 text-[14px] font-bold text-white shadow-[0_18px_30px_rgba(220,38,38,0.18)] transition hover:bg-red-500 disabled:pointer-events-none disabled:opacity-60"
            disabled={isDeleting}
            onClick={onConfirm}
            type="button"
          >
            {isDeleting ? (
              <LoaderCircle className="animate-spin" size={16} />
            ) : (
              <Trash2 size={16} />
            )}
            {mode === "delete" ? "Xóa vĩnh viễn" : "Chuyển tạm nghỉ"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
