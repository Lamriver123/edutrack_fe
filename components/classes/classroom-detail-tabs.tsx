import {
  BarChart3,
  BookOpenCheck,
  CalendarDays,
  ClipboardCheck,
  Coins,
  EllipsisVertical,
  LoaderCircle,
  Pencil,
  Plus,
  Search,
  Trash2,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent, ReactNode } from "react";
import type { Classroom, ClassroomDetail, Student } from "@/types/school";
import { ClassScheduleTab } from "./class-schedule-tab";
import { ClassAttendanceTab } from "./class-attendance-tab";
import { ClassExamTab } from "./exam/class-exam-tab";
import { ClassTuitionTab } from "./class-tuition-tab";
import {
  formatMoney,
  getClassColorHex,
  getClassColorTheme,
  getGenderLabel,
  getStudentAvatar,
  normalizeVisibleText,
} from "./classroom-utils";
import {
  EmptyState,
  InlineLoading,
  PrimaryAction,
  SecondaryAction,
  StudentAvatar,
  TextInput,
} from "./classroom-ui";
import { StudentDetailModal } from "./student-detail-modal";
import styles from "./classroom-manager.module.css";

type DetailTab = "students" | "schedule" | "tuition" | "scores" | "attendance";

const detailTabs: Array<{
  icon: typeof Users;
  label: string;
  value: DetailTab;
}> = [
  { icon: Users, label: "Học sinh", value: "students" },
  { icon: CalendarDays, label: "Thời khóa biểu", value: "schedule" },
  { icon: Coins, label: "Học phí", value: "tuition" },
  { icon: BarChart3, label: "Điểm số", value: "scores" },
  { icon: ClipboardCheck, label: "Điểm danh", value: "attendance" },
];

export function ClassroomDetailTabs({
  classroom,
  isLoading,
  initialActiveTab,
  initialIssueMode,
  initialIssueStudent,
  onAddStudent,
  onArchiveClass,
  onClassUpdated,
  onEditClass,
  onInitialIssueHandled,
  onRemoveStudent,
  onRemoveStudents,
  onDeleteStudent,
  onScheduleChanged,
  removingStudentId,
  removingStudentIds = [],
  deletingStudentId,
}: {
  classroom: ClassroomDetail | null;
  isLoading: boolean;
  initialActiveTab?: DetailTab;
  initialIssueMode?: "class" | "multi_class";
  initialIssueStudent?: Student | null;
  onAddStudent: () => void;
  onArchiveClass?: () => void;
  onClassUpdated?: (classroom: Classroom) => void;
  onEditClass?: () => void;
  onInitialIssueHandled?: () => void;
  onRemoveStudent: (student: Student) => void;
  onRemoveStudents: (students: Student[]) => void;
  onDeleteStudent: (student: Student) => void;
  onScheduleChanged?: () => Promise<void> | void;
  removingStudentId: string;
  removingStudentIds?: string[];
  deletingStudentId: string;
}) {
  const [activeTab, setActiveTab] = useState<DetailTab>(
    initialActiveTab ?? "students",
  );
  const [studentFilter, setStudentFilter] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [tuitionIssueStudent, setTuitionIssueStudent] =
    useState<Student | null>(null);
  const [tuitionIssueMode, setTuitionIssueMode] =
    useState<"class" | "multi_class">("class");

  const effectiveActiveTab = initialIssueStudent ? "tuition" : activeTab;
  const effectiveIssueMode = initialIssueStudent
    ? initialIssueMode ?? "class"
    : tuitionIssueMode;
  const effectiveIssueStudent = initialIssueStudent ?? tuitionIssueStudent;

  function handleTuitionInitialIssueHandled() {
    if (initialIssueStudent) {
      onInitialIssueHandled?.();
      return;
    }

    setTuitionIssueStudent(null);
    setTuitionIssueMode("class");
  }

  const filteredStudents = useMemo(() => {
    const search = normalizeVisibleText(studentFilter);

    if (!classroom || !search) {
      return classroom?.students ?? [];
    }

    return classroom.students.filter((student) => {
      const haystack = normalizeVisibleText(
        [
          student.fullName,
          student.studentCode,
          student.phone,
          student.parent?.fullName,
          student.parent?.phone,
        ]
          .filter(Boolean)
          .join(" "),
      );

      return haystack.includes(search);
    });
  }, [classroom, studentFilter]);

  if (isLoading) {
    return (
      <section className="rounded-lg border border-[var(--neutral-200)] bg-white p-5 shadow-[var(--shadow-card)]">
        <InlineLoading text="Đang tải thông tin lớp..." />
      </section>
    );
  }

  if (!classroom) {
    return (
      <section className="rounded-lg border border-dashed border-[var(--neutral-300)] bg-white p-6 text-center shadow-[var(--shadow-card)]">
        <EmptyState
          icon={<BookOpenCheck size={22} />}
          text="Chọn một lớp học ở danh sách bên trái để xem chi tiết."
          title="Chưa chọn lớp"
        />
      </section>
    );
  }

  const classColor = getClassColorHex(classroom);
  const classColorTheme = getClassColorTheme(classColor);
  const detailTheme = {
    "--class-accent": classColorTheme.accent,
    "--class-accent-soft": classColorTheme.background,
    "--class-accent-border": classColorTheme.border,
    "--class-accent-text": classColorTheme.text,
  } as CSSProperties;
  const statusLabel =
    classroom.status === "active"
      ? "Đang hoạt động"
      : classroom.status === "inactive"
        ? "Tạm ngưng"
        : "Đã lưu trữ";

  return (
    <>
      <section className={styles.classDetailShell} style={detailTheme}>
        <div className={styles.classDetailHeader}>
          <div className={styles.classDetailIdentity}>
            <span className={styles.classDetailMark} aria-hidden="true">
              <BookOpenCheck size={25} strokeWidth={2.2} />
            </span>
            <div className={styles.classDetailCopy}>
              <div className={styles.classDetailEyebrow}>
                <span aria-hidden="true" />
                Chi tiết lớp học
              </div>
              <h3>{classroom.name}</h3>
              <p>
                {classroom.description || "Chưa có mô tả cho lớp học này."}
              </p>
              <div className={styles.classDetailMeta}>
                <span data-status={classroom.status} data-tone="status">
                  <i aria-hidden="true" />
                  {statusLabel}
                </span>
                <span data-tone="students">
                  <Users size={14} />
                  {classroom.students.length} học sinh
                </span>
                <span data-tone="fee">
                  <Coins size={14} />
                  {formatMoney(classroom.regularPrice)} / buổi
                </span>
              </div>
            </div>
          </div>
          <div className={styles.classDetailActions}>
            {onEditClass ? (
              <SecondaryAction
                className={styles.classEditButton}
                icon={<Pencil size={15} />}
                onClick={onEditClass}
                type="button"
              >
                Sửa lớp
              </SecondaryAction>
            ) : null}
            {onArchiveClass ? (
              <button
                className={styles.classArchiveButton}
                onClick={onArchiveClass}
                type="button"
              >
                <Trash2 size={15} />
                Xóa lớp
              </button>
            ) : null}
          </div>
        </div>

        <div className={`${styles.detailTabBar} ${styles.tabScroller}`}>
          <div className={styles.detailTabList}>
            {detailTabs.map(({ icon: Icon, label, value }) => {
              const isActive = effectiveActiveTab === value;

              return (
                <button
                  aria-pressed={isActive}
                  className={styles.detailTab}
                  data-active={isActive}
                  key={value}
                  onClick={() => setActiveTab(value)}
                  type="button"
                >
                  <Icon size={16} />
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <div className={styles.classDetailContent}>
          {effectiveActiveTab === "students" ? (
            <StudentsTab
              filteredStudents={filteredStudents}
              onAddStudent={onAddStudent}
              onRemoveStudent={onRemoveStudent}
              onRemoveStudents={onRemoveStudents}
              onDeleteStudent={onDeleteStudent}
              onSelectStudent={setSelectedStudent}
              removingStudentId={removingStudentId}
              removingStudentIds={removingStudentIds}
              deletingStudentId={deletingStudentId}
              searchValue={studentFilter}
              setSearchValue={setStudentFilter}
              totalStudents={classroom.students.length}
            />
          ) : effectiveActiveTab === "schedule" ? (
            <ClassScheduleTab
              classroom={classroom}
              onScheduleChanged={onScheduleChanged}
            />
          ) : effectiveActiveTab === "tuition" ? (
            <ClassTuitionTab
              classroom={classroom}
              initialIssueMode={effectiveIssueMode}
              initialIssueStudent={effectiveIssueStudent}
              onInitialIssueHandled={handleTuitionInitialIssueHandled}
              onClassUpdated={onClassUpdated}
            />
          ) : effectiveActiveTab === "attendance" ? (
            <ClassAttendanceTab classroom={classroom} />
          ) : effectiveActiveTab === "scores" ? (
            <ClassExamTab classroom={classroom} />
          ) : (
            <FutureTab tab={effectiveActiveTab} />
          )}
        </div>
      </section>

      {selectedStudent ? (
        <StudentDetailModal
          classroom={classroom}
          onClose={() => setSelectedStudent(null)}
          onIssueReceipt={(student) => {
            setTuitionIssueMode("class");
            setTuitionIssueStudent(student);
            setActiveTab("tuition");
            setSelectedStudent(null);
          }}
          onIssueMultiClassReceipt={(student) => {
            setTuitionIssueMode("multi_class");
            setTuitionIssueStudent(student);
            setActiveTab("tuition");
            setSelectedStudent(null);
          }}
          student={selectedStudent}
        />
      ) : null}
    </>
  );
}

function StudentActionMenu({
  student,
  isRemoving,
  isDeleting,
  disabled,
  onRemove,
  onDelete,
}: {
  student: Student;
  isRemoving: boolean;
  isDeleting: boolean;
  disabled: boolean;
  onRemove: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const isBusy = isRemoving || isDeleting;

  useEffect(() => {
    if (!open) return;

    function handleClickOutside(event: MouseEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    function handleScrollOrResize() {
      setOpen(false);
    }

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [open]);

  function toggleMenu(event: React.MouseEvent) {
    event.stopPropagation();
    if (open) {
      setOpen(false);
      return;
    }
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const menuWidth = 228;
    const menuHeight = 140;
    const spaceBelow = window.innerHeight - rect.bottom;
    const top = spaceBelow < menuHeight + 8
      ? rect.top - menuHeight - 4
      : rect.bottom + 4;
    const left = Math.max(8, Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - 8));
    setMenuPos({ top, left });
    setOpen(true);
  }

  return (
    <div className="flex items-center justify-end">
      {isBusy ? (
        <span className="inline-flex h-8 w-8 items-center justify-center">
          <LoaderCircle
            className="animate-spin"
            size={16}
            style={{ color: isDeleting ? "#ef4444" : "#f59e0b" }}
          />
        </span>
      ) : (
        <button
          ref={triggerRef}
          aria-label={`Thao tác với ${student.fullName}`}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[var(--neutral-400)] transition-colors hover:bg-[var(--neutral-100)] hover:text-[var(--neutral-600)] disabled:pointer-events-none disabled:opacity-40"
          disabled={disabled}
          onClick={toggleMenu}
          type="button"
        >
          <EllipsisVertical size={16} />
        </button>
      )}

      {open && !isBusy && menuPos ? (
        <div
          ref={menuRef}
          className="fixed z-[200] w-[228px] rounded-xl border border-[var(--neutral-200)] bg-white py-1.5 shadow-xl shadow-black/10"
          onClick={(event) => event.stopPropagation()}
          role="menu"
          style={{ top: menuPos.top, left: menuPos.left }}
        >
          <button
            className="flex w-full items-start gap-3 px-3.5 py-2.5 text-left transition-colors hover:bg-amber-50 group"
            onClick={() => {
              setOpen(false);
              onRemove();
            }}
            role="menuitem"
            type="button"
          >
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-600 transition-colors group-hover:bg-amber-200">
              <BookOpenCheck size={14} />
            </span>
            <span className="min-w-0">
              <span className="block text-[13.5px] font-semibold text-[var(--neutral-700)]">
                Cho nghỉ học
              </span>
              <span className="block text-[12px] leading-snug text-[var(--neutral-400)]">
                Tạm ngưng, giữ lại lịch sử học
              </span>
            </span>
          </button>

          <div className="mx-3 my-1 h-px bg-[var(--neutral-100)]" />

          <button
            className="flex w-full items-start gap-3 px-3.5 py-2.5 text-left transition-colors hover:bg-red-50 group"
            onClick={() => {
              setOpen(false);
              onDelete();
            }}
            role="menuitem"
            type="button"
          >
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-red-100 text-red-600 transition-colors group-hover:bg-red-200">
              <Trash2 size={14} />
            </span>
            <span className="min-w-0">
              <span className="block text-[13.5px] font-semibold text-red-600">
                Xóa khỏi lớp
              </span>
              <span className="block text-[12px] leading-snug text-[var(--neutral-400)]">
                Xóa hoàn toàn nếu thêm nhầm
              </span>
            </span>
          </button>
        </div>
      ) : null}
    </div>
  );
}

function StudentsTab({
  filteredStudents,
  onAddStudent,
  onRemoveStudent,
  onRemoveStudents,
  onDeleteStudent,
  onSelectStudent,
  removingStudentId,
  removingStudentIds,
  deletingStudentId,
  searchValue,
  setSearchValue,
  totalStudents,
}: {
  filteredStudents: Student[];
  onAddStudent: () => void;
  onRemoveStudent: (student: Student) => void;
  onRemoveStudents: (students: Student[]) => void;
  onDeleteStudent: (student: Student) => void;
  onSelectStudent: (student: Student) => void;
  removingStudentId: string;
  removingStudentIds: string[];
  deletingStudentId: string;
  searchValue: string;
  setSearchValue: (value: string) => void;
  totalStudents: number;
}) {
  const [selectedStudents, setSelectedStudents] = useState<Student[]>([]);
  const removingStudentIdSet = useMemo(
    () => new Set(removingStudentIds),
    [removingStudentIds],
  );
  const visibleStudentIds = useMemo(
    () => new Set(filteredStudents.map((student) => student.id)),
    [filteredStudents],
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
    filteredStudents.length > 0 &&
    filteredStudents.every((student) => selectedStudentIds.has(student.id));
  const isBulkRemoving = removingStudentIds.length > 0;

  function toggleStudent(student: Student) {
    if (isBulkRemoving || removingStudentIdSet.has(student.id)) {
      return;
    }

    setSelectedStudents((current) =>
      current.some((selectedStudent) => selectedStudent.id === student.id)
        ? current.filter((selectedStudent) => selectedStudent.id !== student.id)
        : [...current, student],
    );
  }

  function toggleVisibleStudents() {
    if (isBulkRemoving || !filteredStudents.length) {
      return;
    }

    setSelectedStudents((current) =>
      allVisibleSelected
        ? current.filter((student) => !visibleStudentIds.has(student.id))
        : [
            ...current.filter((student) => !visibleStudentIds.has(student.id)),
            ...filteredStudents,
          ],
    );
  }

  function handleRowKeyDown(
    event: KeyboardEvent<HTMLDivElement>,
    student: Student,
  ) {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    onSelectStudent(student);
  }

  return (
    <div className="grid gap-4">
      
      <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-end">
        <TextInput
          icon={<Search size={16} />}
          label="Tìm học sinh trong lớp"
          onChange={(event) => setSearchValue(event.target.value)}
          placeholder="Tên, mã, số điện thoại..."
          type="search"
          value={searchValue}
        />
        <div className="flex flex-col gap-2 sm:flex-row lg:justify-end">
          {selectedVisibleStudents.length ? (
            <button
              className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-red-100 bg-red-50 px-4 text-[14px] font-bold text-red-600 transition hover:border-red-200 hover:bg-red-100 disabled:pointer-events-none disabled:opacity-60"
              disabled={isBulkRemoving}
              onClick={() => onRemoveStudents(selectedVisibleStudents)}
              type="button"
            >
              {isBulkRemoving ? (
                <LoaderCircle className="animate-spin" size={16} />
              ) : (
                <Trash2 size={16} />
              )}
              Cho nghỉ {selectedVisibleStudents.length} HS
            </button>
          ) : null}
          <PrimaryAction
            className="w-full lg:w-auto"
            icon={<Plus size={16} />}
            onClick={onAddStudent}
            type="button"
          >
            Thêm học sinh
          </PrimaryAction>
        </div>
      </div>

      {filteredStudents.length ? (
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
                  disabled={isBulkRemoving || !filteredStudents.length}
                  onChange={toggleVisibleStudents}
                  type="checkbox"
                />
              </label>
              <span>Học sinh</span>
              <span>Lớp mấy</span>
              <span>Giới tính</span>
              <span>Liên hệ</span>
              <span>Phụ huynh</span>
              <span>Thao tác</span>
            </div>

            {filteredStudents.map((student) => (
              <div
                className={`${styles.studentTableRow} ${styles.selectableStudentTableRow} cursor-pointer rounded-lg border border-[var(--neutral-200)] px-4 py-3 transition hover:border-[var(--brand-200)] hover:bg-[var(--brand-50)] focus-visible:border-[var(--brand-400)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgba(99,102,241,0.18)] ${
                  selectedStudentIds.has(student.id)
                    ? "border-[var(--brand-200)] bg-[var(--brand-50)]"
                    : ""
                }`}
                key={student.id}
                onClick={() => onSelectStudent(student)}
                onKeyDown={(event) => handleRowKeyDown(event, student)}
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
                    disabled={
                      isBulkRemoving || removingStudentIdSet.has(student.id)
                    }
                    onChange={() => toggleStudent(student)}
                    type="checkbox"
                  />
                </label>
                <StudentIdentity student={student} />
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
                <StudentActionMenu
                  student={student}
                  isRemoving={removingStudentId === student.id}
                  isDeleting={deletingStudentId === student.id}
                  disabled={
                    isBulkRemoving ||
                    removingStudentIdSet.has(student.id)
                  }
                  onRemove={() => onRemoveStudent(student)}
                  onDelete={() => onDeleteStudent(student)}
                />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <EmptyState
          action={
            totalStudents === 0 ? (
              <PrimaryAction
                icon={<Plus size={15} />}
                onClick={onAddStudent}
                type="button"
              >
                Thêm học sinh
              </PrimaryAction>
            ) : null
          }
          icon={<Users size={22} />}
          text={
            totalStudents === 0
              ? "Lớp này chưa có học sinh."
              : "Không có học sinh nào khớp với từ khóa."
          }
        />
      )}
    </div>
  );
}

function TabStatCard({
  icon,
  label,
  tone,
  value,
}: {
  icon: ReactNode;
  label: string;
  tone: "search" | "students";
  value: string;
}) {
  return (
    <div className={styles.tabStatCard} data-tone={tone}>
      <span className={styles.tabStatIcon}>
        {icon}
      </span>
      <span className={styles.tabStatCopy}>
        <span>{label}</span>
        <strong>{value}</strong>
      </span>
    </div>
  );
}

function StudentIdentity({ student }: { student: Student }) {
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

function FutureTab({ tab }: { tab: DetailTab }) {
  const content = {
    schedule: {
      icon: CalendarDays,
      title: "Thời khóa biểu",
      text: "Khu vực cấu hình lịch cố định, lịch tạm thời và buổi học thực tế.",
    },
    tuition: {
      icon: Coins,
      title: "Học phí",
      text: "Khu vực theo dõi chu kỳ học phí, dòng phát sinh và phiếu thu.",
    },
    scores: {
      icon: BarChart3,
      title: "Điểm số",
      text: "Khu vực quản lý bài kiểm tra và điểm của từng học sinh.",
    },
    attendance: {
      icon: ClipboardCheck,
      title: "Điểm danh",
      text: "",
    },
    students: {
      icon: Users,
      title: "Học sinh",
      text: "",
    },
  }[tab];
  const Icon = content.icon;

  return (
    <EmptyState
      icon={<Icon size={22} />}
      text={content.text}
      title={content.title}
    />
  );
}
