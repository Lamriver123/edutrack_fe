/* eslint-disable @next/next/no-img-element */

"use client";

import Link from "next/link";
import {
  ArrowRight,
  BookOpenCheck,
  CalendarDays,
  Plus,
  Search,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { schoolApi } from "@/lib/api/school";
import type {
  ClassScheduleSlot,
  ClassStatus,
  Classroom,
  LatestFixedSchedule,
} from "@/types/school";
import {
  initialClassForm,
  type ClassFormState,
  type Notice,
} from "./classroom-types";
import {
  ConfirmDialog,
  EmptyState,
  NoticeBanner,
  PrimaryAction,
} from "./classroom-ui";
import {
  CLASS_COLOR_OPTIONS,
  getErrorMessage,
  parseCurrencyInput,
} from "./classroom-utils";
import styles from "./classroom-manager.module.css";
import {
  CreateClassModal,
  type ClassColorUsage,
} from "./create-class-modal";

const DEFAULT_CLASS_IMAGE_URL =
  "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTR-qRE8Ud2H3MA_umzUwRTCefEIGGjOmnsi5hsMnPdrg&s=10";

export function ClassroomsPage() {
  const router = useRouter();
  const [classes, setClasses] = useState<Classroom[]>([]);
  const [classColorSources, setClassColorSources] = useState<Classroom[]>([]);
  const [classSearch, setClassSearch] = useState("");
  const [classForm, setClassForm] = useState<ClassFormState>(initialClassForm);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [isLoadingClasses, setIsLoadingClasses] = useState(true);
  const [isCreatingClass, setIsCreatingClass] = useState(false);
  const [isCreateClassModalOpen, setIsCreateClassModalOpen] = useState(false);
  const [isCreateClassConfirmOpen, setIsCreateClassConfirmOpen] =
    useState(false);

  useEffect(() => {
    let isCurrent = true;
    const timer = window.setTimeout(async () => {
      setIsLoadingClasses(true);

      try {
        const classrooms = await schoolApi.listClasses(classSearch);

        if (isCurrent) {
          setClasses(classrooms);

          if (!classSearch.trim()) {
            setClassColorSources(classrooms);
          }
        }
      } catch (error) {
        if (isCurrent) {
          setNotice({ type: "error", text: getErrorMessage(error) });
        }
      } finally {
        if (isCurrent) {
          setIsLoadingClasses(false);
        }
      }
    }, 250);

    return () => {
      isCurrent = false;
      window.clearTimeout(timer);
    };
  }, [classSearch]);

  async function refreshClassColorSources() {
    const classrooms = await schoolApi.listClasses();
    setClassColorSources(classrooms);

    return classrooms;
  }

  async function openCreateClassModal() {
    let sources = classColorSources;

    if (!sources.length) {
      try {
        sources = await refreshClassColorSources();
      } catch (error) {
        setNotice({ type: "error", text: getErrorMessage(error) });
      }
    }

    setClassForm({
      ...initialClassForm,
      colorIndex: getFirstAvailableColorIndex(sources),
    });
    setIsCreateClassModalOpen(true);
  }

  async function handleCreateClass(event: FormEvent<HTMLFormElement>) {
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
      regularPrice === null ||
      makeupPrice === null ||
      regularPrice < 0 ||
      makeupPrice < 0
    ) {
      setNotice({
        type: "error",
        text: "Học phí cần là số nguyên theo đơn vị VND.",
      });
      return;
    }

    setIsCreateClassConfirmOpen(true);
  }

  async function executeCreateClass() {
    setNotice(null);
    setIsCreatingClass(true);

    try {
      const regularPrice = parseCurrencyInput(classForm.regularPrice) ?? 0;
      const makeupPrice = parseCurrencyInput(classForm.makeupPrice) ?? 0;
      const classroom = await schoolApi.createClass({
        name: classForm.name,
        description: classForm.description || undefined,
        imageUrl: classForm.imageUrl.trim() || undefined,
        colorIndex: classForm.colorIndex,
        regularPrice,
        makeupPrice,
      });

      setClassForm(initialClassForm);
      setIsCreateClassModalOpen(false);
      setIsCreateClassConfirmOpen(false);
      setNotice({
        type: "success",
        text: `Đã tạo lớp ${classroom.name}.`,
      });
      setClassColorSources((current) => [classroom, ...current]);
      router.push(`/classes/${classroom.id}`);
    } catch (error) {
      setNotice({ type: "error", text: getErrorMessage(error) });
      setIsCreateClassConfirmOpen(false);
    } finally {
      setIsCreatingClass(false);
    }
  }

  function closeCreateClassModal() {
    if (isCreatingClass) {
      return;
    }

    setIsCreateClassConfirmOpen(false);
    setIsCreateClassModalOpen(false);
    setClassForm(initialClassForm);
  }

  return (
    <section className={styles.workspace}>
      {notice ? (
        <NoticeBanner notice={notice} onClose={() => setNotice(null)} />
      ) : null}

      <ClassroomToolbar
        onCreateClass={() => void openCreateClassModal()}
        onSearchChange={setClassSearch}
        searchValue={classSearch}
      />

      <ClassroomGrid
        classes={classes}
        isLoading={isLoadingClasses}
        searchTerm={classSearch}
      />

      {isCreateClassModalOpen ? (
        <CreateClassModal
          form={classForm}
          isSubmitting={isCreatingClass}
          onChange={setClassForm}
          onClose={closeCreateClassModal}
          onSubmit={handleCreateClass}
          usedColorUsages={buildClassColorUsages(classColorSources)}
        />
      ) : null}

      {isCreateClassConfirmOpen ? (
        <ConfirmDialog
          confirmText="Tạo lớp"
          description={`Bạn sắp tạo lớp "${classForm.name.trim()}". Kiểm tra lại học phí và mô tả trước khi xác nhận.`}
          isLoading={isCreatingClass}
          onCancel={() => setIsCreateClassConfirmOpen(false)}
          onConfirm={() => void executeCreateClass()}
          title="Xác nhận tạo lớp"
        />
      ) : null}
    </section>
  );
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
    }));
}

function getFirstAvailableColorIndex(classrooms: Classroom[]) {
  const usedColorIndexes = new Set(
    classrooms.map((classroom) => classroom.colorIndex ?? 0),
  );

  for (let colorIndex = 0; colorIndex <= 7; colorIndex += 1) {
    if (!usedColorIndexes.has(colorIndex)) {
      return colorIndex;
    }
  }

  return 0;
}

function ClassroomToolbar({
  onCreateClass,
  onSearchChange,
  searchValue,
}: {
  onCreateClass: () => void;
  onSearchChange: (value: string) => void;
  searchValue: string;
}) {
  return (
    <section className={styles.classToolbar}>
      <label className={styles.classSearchField}>
        <Search size={17} />
        <input
          aria-label="Tìm kiếm lớp học"
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Nhập tên lớp cần tìm..."
          type="search"
          value={searchValue}
        />
      </label>
      <PrimaryAction
        className={styles.toolbarCreateButton}
        icon={<Plus size={16} />}
        onClick={onCreateClass}
        type="button"
      >
        Tạo lớp học
      </PrimaryAction>
    </section>
  );
}

function ClassroomGrid({
  classes,
  isLoading,
  searchTerm,
}: {
  classes: Classroom[];
  isLoading: boolean;
  searchTerm: string;
}) {
  if (isLoading) {
    return <ClassroomGridSkeleton />;
  }

  if (!classes.length) {
    return (
      <EmptyState
        icon={<BookOpenCheck size={22} />}
        text={
          searchTerm
            ? "Không tìm thấy lớp phù hợp với từ khóa hiện tại."
            : "Chưa có lớp học nào. Hãy dùng nút tạo lớp học ở phía trên để bắt đầu."
        }
        title={searchTerm ? "Không có kết quả" : "Chưa có lớp học"}
      />
    );
  }

  return (
    <div className={styles.classGrid}>
      {classes.map((classroom) => (
        <ClassroomGridItem classroom={classroom} key={classroom.id} />
      ))}
    </div>
  );
}

function ClassroomGridItem({ classroom }: { classroom: Classroom }) {
  const hasSchedule = Boolean(classroom.latestFixedSchedule?.schedules.length);
  const scheduleText = getLatestScheduleText(classroom.latestFixedSchedule);

  return (
    <Link
      className={styles.classGridItem}
      href={`/classes/${classroom.id}`}
    >
      <div className={styles.classImageFrame}>
        <img
          alt={`Ảnh lớp ${classroom.name}`}
          src={classroom.imageUrl || DEFAULT_CLASS_IMAGE_URL}
        />
        <span className={getStatusClassName(classroom.status)}>
          {getStatusLabel(classroom.status)}
        </span>
      </div>

      <div className={styles.classCardBody}>
        <h3>{classroom.name}</h3>
        <p>{classroom.description || "Chưa có mô tả cho lớp học này."}</p>
      </div>

      <div
        className={`${styles.classScheduleLine} ${
          hasSchedule ? "" : styles.classScheduleEmpty
        }`}
      >
        <CalendarDays size={15} />
        <span>{scheduleText}</span>
      </div>

      <div className={styles.classCardFooter}>
        <span className={styles.classFooterMeta}>
          <span className={styles.classStudentCount}>
            <Users size={15} />
            {classroom.studentCount} học sinh
          </span>
          <span className={styles.classColorChip}>
            <span style={getClassColorStyle(classroom.colorIndex)} />
            {getClassColorLabel(classroom.colorIndex)}
          </span>
        </span>
        <span className={styles.classArrow}>
          <ArrowRight size={17} />
        </span>
      </div>
    </Link>
  );
}

function ClassroomGridSkeleton() {
  return (
    <div className={styles.classGrid} aria-label="Đang tải danh sách lớp học">
      {Array.from({ length: 8 }).map((_, index) => (
        <div className={styles.classSkeletonItem} key={index}>
          <div className={styles.skeletonImage}>
            <div className={styles.skeletonBadge} />
          </div>
          <div className="grid gap-3">
            <div className={styles.skeletonTitle} />
            <div className={styles.skeletonLine} />
            <div className={styles.skeletonLineShort} />
          </div>
          <div className={styles.skeletonSchedule} />
          <div className={styles.skeletonFooter} />
        </div>
      ))}
    </div>
  );
}

function getStatusLabel(status: ClassStatus) {
  if (status === "archived") {
    return "Lưu trữ";
  }

  if (status === "inactive") {
    return "Tạm dừng";
  }

  return "Đang học";
}

function getStatusClassName(status: ClassStatus) {
  if (status === "archived") {
    return `${styles.classStatusBadge} ${styles.classStatusArchived}`;
  }

  if (status === "inactive") {
    return `${styles.classStatusBadge} ${styles.classStatusInactive}`;
  }

  return `${styles.classStatusBadge} ${styles.classStatusActive}`;
}

function getClassColorLabel(colorIndex: number) {
  return CLASS_COLOR_OPTIONS[colorIndex]?.label ?? "Màu lịch";
}

function getClassColorStyle(colorIndex: number) {
  return {
    background: CLASS_COLOR_OPTIONS[colorIndex]?.accent ?? "#4f46e5",
  };
}

function getLatestScheduleText(schedule: LatestFixedSchedule | null) {
  const slots = schedule?.schedules ?? [];

  if (!slots.length) {
    return "Chưa có lịch cố định";
  }

  const visibleSlots = slots.slice(0, 2).map(formatScheduleSlot);
  const hiddenCount = slots.length - visibleSlots.length;

  return hiddenCount > 0
    ? `${visibleSlots.join(", ")} +${hiddenCount} buổi`
    : visibleSlots.join(", ");
}

function formatScheduleSlot(slot: ClassScheduleSlot) {
  return `${getDayLabel(slot.dayOfWeek)} ${slot.startTime}-${slot.endTime}`;
}

function getDayLabel(dayOfWeek: number) {
  if (dayOfWeek === 7) {
    return "CN";
  }

  if (dayOfWeek >= 1 && dayOfWeek <= 6) {
    return `T${dayOfWeek + 1}`;
  }

  return "Ngày học";
}
