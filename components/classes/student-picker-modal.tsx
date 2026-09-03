"use client";

import {
  Check,
  LoaderCircle,
  Plus,
  Search,
  UserPlus,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { schoolApi } from "@/lib/api/school";
import type { ClassroomDetail, Student } from "@/types/school";
import {
  buildStudentPayload,
  initialStudentForm,
  type StudentFormState,
} from "./classroom-types";
import {
  getErrorMessage,
  getStudentAvatar,
} from "./classroom-utils";
import {
  ConfirmDialog,
  EmptyState,
  InlineLoading,
  Modal,
  PrimaryAction,
  SecondaryAction,
  StudentAvatar,
  TextInput,
} from "./classroom-ui";
import { StudentFormFields } from "./student-form-fields";
import { useDeferredStudentAvatarUpload } from "./use-deferred-student-avatar-upload";

type AddMode = "existing" | "new";
type PendingStudentAction =
  | { student: Student; type: "enroll" }
  | { type: "create" };

export function StudentPickerModal({
  classroom,
  onAdded,
  onClose,
  onError,
}: {
  classroom: ClassroomDetail;
  onAdded: (message: string) => void;
  onClose: () => void;
  onError: (message: string) => void;
}) {
  const [mode, setMode] = useState<AddMode>("existing");
  const [search, setSearch] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [studentForm, setStudentForm] =
    useState<StudentFormState>(initialStudentForm);
  const [isSearching, setIsSearching] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [enrollingStudentId, setEnrollingStudentId] = useState("");
  const [pendingAction, setPendingAction] =
    useState<PendingStudentAction | null>(null);
  const {
    avatarFileName,
    avatarPreviewUrl,
    isUploadingAvatar,
    resetAvatarSelection,
    selectAvatarFile,
    uploadSelectedAvatar,
  } = useDeferredStudentAvatarUpload();

  const selectedStudentIds = useMemo(
    () => new Set(classroom.students.map((student) => student.id)),
    [classroom.students],
  );

  useEffect(() => {
    if (mode !== "existing") {
      return;
    }

    let isCurrent = true;
    const timer = window.setTimeout(async () => {
      setIsSearching(true);

      try {
        const results = await schoolApi.searchStudents(search);

        if (isCurrent) {
          setStudents(results);
        }
      } catch (error) {
        if (isCurrent) {
          onError(getErrorMessage(error));
        }
      } finally {
        if (isCurrent) {
          setIsSearching(false);
        }
      }
    }, 250);

    return () => {
      isCurrent = false;
      window.clearTimeout(timer);
    };
  }, [mode, onError, search]);

  async function executeEnrollExisting(student: Student) {
    setEnrollingStudentId(student.id);

    try {
      await schoolApi.enrollExistingStudent(classroom.id, student.id);
      onAdded(`Đã thêm ${student.fullName} vào lớp ${classroom.name}.`);
      onClose();
    } catch (error) {
      onError(getErrorMessage(error));
    } finally {
      setEnrollingStudentId("");
      setPendingAction(null);
    }
  }

  async function handleCreateStudentAndEnroll(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!studentForm.fullName.trim()) {
      onError("Vui lòng nhập họ tên học sinh.");
      return;
    }

    setPendingAction({ type: "create" });
  }

  async function executeCreateStudentAndEnroll() {
    setIsCreating(true);

    try {
      const payload = buildStudentPayload(studentForm);
      const uploadedAvatarUrl = await uploadSelectedAvatar();

      if (uploadedAvatarUrl) {
        payload.avatarUrl = uploadedAvatarUrl;
      }

      const enrollment = await schoolApi.createStudentAndEnroll(
        classroom.id,
        payload,
      );

      onAdded(
        `Đã tạo hồ sơ và thêm ${enrollment.student.fullName} vào lớp ${classroom.name}.`,
      );
      resetAvatarSelection();
      onClose();
    } catch (error) {
      onError(getErrorMessage(error));
    } finally {
      setIsCreating(false);
      setPendingAction(null);
    }
  }

  function handleConfirmAction() {
    if (!pendingAction) {
      return;
    }

    if (pendingAction.type === "enroll") {
      void executeEnrollExisting(pendingAction.student);
      return;
    }

    void executeCreateStudentAndEnroll();
  }

  return (
    <>
      <Modal onClose={onClose} title="Thêm học sinh vào lớp">
        <div className="grid gap-5">
        <div className="grid gap-2 rounded-lg border border-[var(--neutral-200)] bg-[var(--neutral-50)] p-1.5 sm:grid-cols-2">
          <button
            className={`h-12 rounded-lg text-[14px] font-bold transition ${
              mode === "existing"
                ? "bg-white text-[var(--brand-700)] shadow-[var(--shadow-sm)]"
                : "text-[var(--neutral-500)] hover:bg-white/70"
            }`}
            onClick={() => setMode("existing")}
            type="button"
          >
            Học sinh có sẵn
          </button>
          <button
            className={`h-12 rounded-lg text-[14px] font-bold transition ${
              mode === "new"
                ? "bg-white text-[var(--brand-700)] shadow-[var(--shadow-sm)]"
                : "text-[var(--neutral-500)] hover:bg-white/70"
            }`}
            onClick={() => setMode("new")}
            type="button"
          >
            Tạo mới
          </button>
        </div>

        {mode === "existing" ? (
          <div className="grid gap-4">
            <TextInput
              icon={<Search size={16} />}
              label="Tìm học sinh"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Nhập tên học sinh..."
              type="search"
              value={search}
            />

            <div className="grid max-h-[440px] gap-3 overflow-y-auto pr-1">
              {isSearching ? (
                <InlineLoading text="Đang tìm học sinh..." />
              ) : students.length ? (
                students.map((student) => {
                  const isInClass = selectedStudentIds.has(student.id);
                  const isEnrolling = enrollingStudentId === student.id;

                  return (
                    <StudentOption
                      isEnrolling={isEnrolling}
                      isInClass={isInClass}
                      key={student.id}
                      onAdd={() => setPendingAction({ student, type: "enroll" })}
                      student={student}
                    />
                  );
                })
              ) : (
                <EmptyState
                  action={
                    <SecondaryAction
                      icon={<UserPlus size={15} />}
                      onClick={() => setMode("new")}
                      type="button"
                    >
                      Tạo học sinh mới
                    </SecondaryAction>
                  }
                  icon={<Search size={22} />}
                  text="Không tìm thấy học sinh phù hợp."
                />
              )}
            </div>
          </div>
        ) : (
          <form className="grid gap-5" onSubmit={handleCreateStudentAndEnroll}>
            <StudentFormFields
              avatarFileName={avatarFileName}
              avatarPreviewUrl={avatarPreviewUrl}
              form={studentForm}
              isUploadingAvatar={isUploadingAvatar}
              onAvatarUpload={(event) => selectAvatarFile(event, onError)}
              onChange={setStudentForm}
            />

            <div className="flex flex-col-reverse gap-3 border-t border-[var(--neutral-200)] pt-4 sm:flex-row sm:justify-end">
              <SecondaryAction onClick={onClose} type="button">
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
                Tạo và thêm
              </PrimaryAction>
            </div>
          </form>
        )}
        </div>
      </Modal>

      {pendingAction ? (
        <ConfirmDialog
          confirmText={
            pendingAction.type === "enroll" ? "Thêm học sinh" : "Tạo và thêm"
          }
          description={
            pendingAction.type === "enroll"
              ? `Bạn sắp thêm ${pendingAction.student.fullName} vào lớp ${classroom.name}.`
              : `Bạn sắp tạo hồ sơ học sinh mới và thêm vào lớp ${classroom.name}.`
          }
          isLoading={
            isCreating || isUploadingAvatar || Boolean(enrollingStudentId)
          }
          onCancel={() => setPendingAction(null)}
          onConfirm={handleConfirmAction}
          title={
            pendingAction.type === "enroll"
              ? "Xác nhận thêm học sinh"
              : "Xác nhận tạo học sinh"
          }
        />
      ) : null}
    </>
  );
}

function StudentOption({
  isEnrolling,
  isInClass,
  onAdd,
  student,
}: {
  isEnrolling: boolean;
  isInClass: boolean;
  onAdd: () => void;
  student: Student;
}) {
  return (
    <div className="grid gap-3 rounded-lg border border-[var(--neutral-200)] bg-[var(--neutral-50)] p-3 sm:grid-cols-[1fr_auto] sm:items-center">
      <div className="grid min-w-0 grid-cols-[48px_1fr] items-center gap-3">
        <StudentAvatar
          alt={student.fullName}
          src={getStudentAvatar(student)}
        />
        <span className="min-w-0">
          <span className="block truncate text-[15px] font-bold text-[var(--neutral-800)]">
            {student.fullName}
          </span>
          <span className="block truncate text-[13px] text-[var(--neutral-500)]">
            {student.studentCode}
          </span>
        </span>
      </div>

      <button
        className={`inline-flex h-11 items-center justify-center gap-2 rounded-lg px-4 text-[14px] font-bold transition ${
          isInClass
            ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
            : "border border-[var(--brand-200)] bg-white text-[var(--brand-700)] hover:bg-[var(--brand-50)]"
        }`}
        disabled={isInClass || isEnrolling}
        onClick={onAdd}
        type="button"
      >
        {isEnrolling ? (
          <LoaderCircle className="animate-spin" size={15} />
        ) : isInClass ? (
          <Check size={15} />
        ) : (
          <Plus size={15} />
        )}
        {isInClass ? "Đã có" : "Thêm"}
      </button>
    </div>
  );
}
