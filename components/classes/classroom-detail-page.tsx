/* eslint-disable react-hooks/set-state-in-effect */

"use client";

import Link from "next/link";
import { ArrowLeft, BookOpenCheck } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { schoolApi } from "@/lib/api/school";
import type { Classroom, ClassroomDetail, Student } from "@/types/school";
import { ClassroomDetailTabs } from "./classroom-detail-tabs";
import {
  initialClassForm,
  type ClassFormState,
  type Notice,
} from "./classroom-types";
import {
  ConfirmDialog,
  EmptyState,
  NoticeBanner,
  SecondaryAction,
} from "./classroom-ui";
import {
  formatCurrencyInput,
  getErrorMessage,
  getClassColorHex,
  getVietnamTodayInputDate,
  parseCurrencyInput,
  toVietnamDateInputValue,
} from "./classroom-utils";
import {
  EditClassModal,
  type ClassColorUsage,
} from "./create-class-modal";
import { StudentPickerModal } from "./student-picker-modal";
import { useDeferredClassImageUpload } from "./use-deferred-class-image-upload";

export function ClassroomDetailPage({ classId }: { classId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [classDetail, setClassDetail] = useState<ClassroomDetail | null>(null);
  const [classColorSources, setClassColorSources] = useState<Classroom[]>([]);
  const [classForm, setClassForm] = useState<ClassFormState>(initialClassForm);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(true);
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [isEditClassModalOpen, setIsEditClassModalOpen] = useState(false);
  const [isEditClassConfirmOpen, setIsEditClassConfirmOpen] = useState(false);
  const [isUpdatingClass, setIsUpdatingClass] = useState(false);
  const [isArchiveClassConfirmOpen, setIsArchiveClassConfirmOpen] =
    useState(false);
  const [isArchivingClass, setIsArchivingClass] = useState(false);
  const [removingStudentId, setRemovingStudentId] = useState("");
  const [studentToRemove, setStudentToRemove] = useState<Student | null>(null);
  const [studentsToRemove, setStudentsToRemove] = useState<Student[]>([]);
  const [isRemovingStudents, setIsRemovingStudents] = useState(false);
  const [handledIssueRequestKey, setHandledIssueRequestKey] = useState("");
  const {
    classImageFileName,
    classImagePreviewUrl,
    isUploadingClassImage,
    resetClassImageSelection,
    selectClassImageFile,
    uploadSelectedClassImage,
  } = useDeferredClassImageUpload();

  const loadClassDetail = useCallback(async () => {
    setIsLoadingDetail(true);

    try {
      const detail = await schoolApi.getClassDetail(classId);
      setClassDetail(detail);
    } catch (error) {
      setClassDetail(null);
      setNotice({ type: "error", text: getErrorMessage(error) });
    } finally {
      setIsLoadingDetail(false);
    }
  }, [classId]);

  useEffect(() => {
    void loadClassDetail();
  }, [loadClassDetail]);

  const receiptStudentId = searchParams.get("receiptStudentId");
  const receiptMode =
    searchParams.get("receiptMode") === "multi_class"
      ? "multi_class"
      : "class";
  const receiptRequestKey = `${receiptMode}:${receiptStudentId ?? ""}`;
  const initialIssueStudent =
    receiptStudentId && receiptRequestKey !== handledIssueRequestKey
      ? classDetail?.students.find((student) => student.id === receiptStudentId)
      : null;

  const handleInitialIssueHandled = useCallback(() => {
    setHandledIssueRequestKey(receiptRequestKey);
    router.replace(`/classes/${classId}`, { scroll: false });
  }, [classId, receiptRequestKey, router]);

  async function refreshClassColorSources() {
    const classrooms = await schoolApi.listClasses();
    setClassColorSources(classrooms);

    return classrooms;
  }

  const handleStudentModalError = useCallback((message: string) => {
    setNotice({ type: "error", text: message });
  }, []);

  const handleStudentAdded = useCallback(
    async (message: string) => {
      setNotice({ type: "success", text: message });
      await loadClassDetail();
    },
    [loadClassDetail],
  );

  async function handleRemoveStudent(student: Student) {
    setNotice(null);
    setRemovingStudentId(student.id);

    try {
      await schoolApi.removeStudentFromClass(classId, student.id);
      await loadClassDetail();
      setNotice({
        type: "success",
        text: `Đã chuyển ${student.fullName} khỏi danh sách đang học.`,
      });
      setStudentToRemove(null);
    } catch (error) {
      setNotice({ type: "error", text: getErrorMessage(error) });
      setStudentToRemove(null);
    } finally {
      setRemovingStudentId("");
    }
  }

  async function handleRemoveStudents(students: Student[]) {
    if (!students.length) {
      return;
    }

    setNotice(null);
    setIsRemovingStudents(true);

    try {
      const result = await schoolApi.removeStudentsFromClass(
        classId,
        students.map((student) => student.id),
      );
      await loadClassDetail();
      setNotice({
        type: result.failedCount ? "error" : "success",
        text: result.failedCount
          ? `Đã cho nghỉ ${result.successCount} học sinh, ${result.failedCount} học sinh chưa xử lý được.`
          : `Đã cho nghỉ ${result.successCount} học sinh trong lớp.`,
      });
      setStudentsToRemove([]);
    } catch (error) {
      setNotice({ type: "error", text: getErrorMessage(error) });
      setStudentsToRemove([]);
    } finally {
      setIsRemovingStudents(false);
    }
  }

  async function openEditClassModal() {
    if (!classDetail) {
      return;
    }

    if (!classColorSources.length) {
      try {
        await refreshClassColorSources();
      } catch (error) {
        setNotice({ type: "error", text: getErrorMessage(error) });
      }
    }

    setClassForm(buildClassFormFromClass(classDetail));
    resetClassImageSelection();
    setIsEditClassModalOpen(true);
  }

  function closeEditClassModal() {
    if (isUpdatingClass) {
      return;
    }

    setIsEditClassModalOpen(false);
    setIsEditClassConfirmOpen(false);
    setClassForm(initialClassForm);
    resetClassImageSelection();
  }

  function handleClassImageUrlChange(imageUrl: string) {
    resetClassImageSelection();
    setClassForm((current) => ({
      ...current,
      imageUrl,
    }));
  }

  async function handleUpdateClass(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(null);

    const regularPrice = parseCurrencyInput(classForm.regularPrice);
    const makeupPrice = parseCurrencyInput(classForm.makeupPrice);

    if (!classForm.name.trim()) {
      setNotice({ type: "error", text: "Vui lòng nhập tên lớp học." });
      return;
    }

    if (
      !classForm.regularPrice ||
      !classForm.makeupPrice ||
      !classForm.priceEffectiveFrom ||
      regularPrice === null ||
      makeupPrice === null ||
      regularPrice < 0 ||
      makeupPrice < 0
    ) {
      setNotice({
        type: "error",
        text: "Vui lòng nhập học phí và ngày áp dụng giá.",
      });
      return;
    }

    setIsEditClassConfirmOpen(true);
  }

  async function executeUpdateClass() {
    if (!classDetail) {
      return;
    }

    setIsUpdatingClass(true);
    setNotice(null);

    try {
      const regularPrice = parseCurrencyInput(classForm.regularPrice) ?? 0;
      const makeupPrice = parseCurrencyInput(classForm.makeupPrice) ?? 0;
      const uploadedImageUrl = await uploadSelectedClassImage();
      const typedImageUrl = classForm.imageUrl.trim();
      const currentPriceEffectiveFrom =
        toVietnamDateInputValue(classDetail.priceEffectiveFrom) ||
        getVietnamTodayInputDate();
      const hasPriceChange =
        regularPrice !== classDetail.regularPrice ||
        makeupPrice !== classDetail.makeupPrice ||
        classForm.priceEffectiveFrom !== currentPriceEffectiveFrom;
      const updatedClass = await schoolApi.updateClass(classDetail.id, {
        name: classForm.name.trim(),
        description: classForm.description.trim(),
        imageUrl: uploadedImageUrl ?? (typedImageUrl || undefined),
        colorIndex: classForm.colorIndex,
        colorHex: classForm.colorHex,
        regularPrice: hasPriceChange ? regularPrice : undefined,
        makeupPrice: hasPriceChange ? makeupPrice : undefined,
        priceEffectiveFrom: hasPriceChange
          ? classForm.priceEffectiveFrom
          : undefined,
        status: classForm.status,
      });

      setClassDetail((current) =>
        current
          ? {
              ...updatedClass,
              students: current.students,
            }
          : current,
      );
      setClassColorSources((current) =>
        current.map((classroom) =>
          classroom.id === updatedClass.id ? updatedClass : classroom,
        ),
      );
      setIsEditClassModalOpen(false);
      setIsEditClassConfirmOpen(false);
      resetClassImageSelection();
      setNotice({
        type: "success",
        text: `Đã cập nhật lớp ${updatedClass.name}.`,
      });
    } catch (error) {
      setNotice({ type: "error", text: getErrorMessage(error) });
      setIsEditClassConfirmOpen(false);
    } finally {
      setIsUpdatingClass(false);
    }
  }

  async function executeArchiveClass() {
    if (!classDetail) {
      return;
    }

    setIsArchivingClass(true);
    setNotice(null);

    try {
      await schoolApi.deleteClass(classDetail.id);
      setNotice({
        type: "success",
        text: `Đã chuyển lớp ${classDetail.name} vào lưu trữ.`,
      });
      router.push("/classes");
    } catch (error) {
      setNotice({ type: "error", text: getErrorMessage(error) });
      setIsArchiveClassConfirmOpen(false);
    } finally {
      setIsArchivingClass(false);
    }
  }

  return (
    <section className="grid gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link
            className="inline-flex min-h-10 items-center gap-2 text-[14px] font-bold text-[var(--brand-600)] transition hover:text-[var(--brand-800)]"
            href="/classes"
          >
            <ArrowLeft size={15} />
            Quay lại danh sách lớp
          </Link>
          
        </div>
        
      </div>

      {notice ? (
        <NoticeBanner notice={notice} onClose={() => setNotice(null)} />
      ) : null}

      {!isLoadingDetail && !classDetail ? (
        <EmptyState
          action={
            <SecondaryAction
              onClick={() => void loadClassDetail()}
              type="button"
            >
              Tải lại
            </SecondaryAction>
          }
          icon={<BookOpenCheck size={22} />}
          text="Không thể tải thông tin lớp học. Hãy kiểm tra lại quyền truy cập hoặc thử tải lại."
          title="Không tìm thấy lớp"
        />
      ) : (
        <ClassroomDetailTabs
          classroom={classDetail}
          isLoading={isLoadingDetail}
          initialActiveTab={receiptStudentId ? "tuition" : undefined}
          initialIssueMode={receiptMode}
          initialIssueStudent={initialIssueStudent}
          onAddStudent={() => setIsStudentModalOpen(true)}
          onArchiveClass={() => setIsArchiveClassConfirmOpen(true)}
          onClassUpdated={(updatedClass) =>
            setClassDetail((current) =>
              current
                ? {
                    ...updatedClass,
                    students: current.students,
                  }
                : current,
            )
          }
          onEditClass={() => void openEditClassModal()}
          onInitialIssueHandled={handleInitialIssueHandled}
          onRemoveStudent={setStudentToRemove}
          onRemoveStudents={setStudentsToRemove}
          onScheduleChanged={loadClassDetail}
          removingStudentId={removingStudentId}
          removingStudentIds={
            isRemovingStudents
              ? studentsToRemove.map((student) => student.id)
              : removingStudentId
                ? [removingStudentId]
                : []
          }
        />
      )}

      {isStudentModalOpen && classDetail ? (
        <StudentPickerModal
          classroom={classDetail}
          onAdded={(message) => void handleStudentAdded(message)}
          onClose={() => setIsStudentModalOpen(false)}
          onError={handleStudentModalError}
        />
      ) : null}

      {studentToRemove ? (
        <ConfirmDialog
          confirmText="Cho nghỉ"
          description={`Bạn sắp chuyển ${studentToRemove.fullName} khỏi danh sách đang học của lớp này. Lịch sử học tập vẫn được giữ lại.`}
          isLoading={removingStudentId === studentToRemove.id}
          onCancel={() => setStudentToRemove(null)}
          onConfirm={() => void handleRemoveStudent(studentToRemove)}
          title="Xác nhận cho nghỉ lớp"
          tone="danger"
        />
      ) : null}

      {studentsToRemove.length ? (
        <ConfirmDialog
          confirmText="Cho nghỉ"
          description={`Bạn sắp chuyển ${studentsToRemove.length} học sinh khỏi danh sách đang học của lớp này. Lịch sử học tập vẫn được giữ lại.`}
          isLoading={isRemovingStudents}
          onCancel={() => setStudentsToRemove([])}
          onConfirm={() => void handleRemoveStudents(studentsToRemove)}
          title="Xác nhận cho nghỉ nhiều học sinh"
          tone="danger"
        />
      ) : null}

      {isEditClassModalOpen ? (
        <EditClassModal
          form={classForm}
          imageFileName={classImageFileName}
          imagePreviewUrl={classImagePreviewUrl}
          isSubmitting={isUpdatingClass}
          isUploadingImage={isUploadingClassImage}
          onChange={setClassForm}
          onClose={closeEditClassModal}
          onImageFileChange={(event) =>
            selectClassImageFile(event, (message) =>
              setNotice({ type: "error", text: message }),
            )
          }
          onImageUrlChange={handleClassImageUrlChange}
          onSubmit={handleUpdateClass}
          usedColorUsages={buildClassColorUsages(
            classColorSources,
            classDetail?.id,
          )}
        />
      ) : null}

      {isEditClassConfirmOpen && classDetail ? (
        <ConfirmDialog
          confirmText="Lưu thay đổi"
          description={`Bạn sắp cập nhật thông tin lớp "${classForm.name.trim()}". Màu lớp trên thời khóa biểu chung cũng sẽ đổi theo lựa chọn này.`}
          isLoading={isUpdatingClass}
          onCancel={() => setIsEditClassConfirmOpen(false)}
          onConfirm={() => void executeUpdateClass()}
          title="Xác nhận sửa lớp"
        />
      ) : null}

      {isArchiveClassConfirmOpen && classDetail ? (
        <ConfirmDialog
          confirmText="Xóa lớp"
          description={`Bạn sắp chuyển lớp ${classDetail.name} sang trạng thái lưu trữ. Lớp sẽ không còn hiển thị trong danh sách và thời khóa biểu chung.`}
          isLoading={isArchivingClass}
          onCancel={() => setIsArchiveClassConfirmOpen(false)}
          onConfirm={() => void executeArchiveClass()}
          title="Xác nhận xóa lớp"
          tone="danger"
        />
      ) : null}
    </section>
  );
}

function buildClassFormFromClass(classroom: ClassroomDetail): ClassFormState {
  return {
    name: classroom.name,
    description: classroom.description ?? "",
    imageUrl: classroom.imageUrl ?? "",
    colorIndex: classroom.colorIndex ?? 0,
    colorHex: getClassColorHex(classroom),
    regularPrice: formatCurrencyInput(String(classroom.regularPrice)),
    makeupPrice: formatCurrencyInput(String(classroom.makeupPrice)),
    priceEffectiveFrom:
      toVietnamDateInputValue(classroom.priceEffectiveFrom) ||
      getVietnamTodayInputDate(),
    status: classroom.status === "archived" ? "inactive" : classroom.status,
  };
}

function buildClassColorUsages(
  classrooms: Classroom[],
  ignoredClassId?: string,
): ClassColorUsage[] {
  return classrooms
    .filter((classroom) => classroom.id !== ignoredClassId)
    .map((classroom) => ({
      classId: classroom.id,
      className: classroom.name,
      colorIndex: classroom.colorIndex ?? 0,
      colorHex: getClassColorHex(classroom),
    }));
}
