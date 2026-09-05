import {
  BarChart3,
  BookOpenCheck,
  CalendarDays,
  ClipboardCheck,
  Coins,
  LoaderCircle,
  Pencil,
  Plus,
  Search,
  Trash2,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";
import type { KeyboardEvent, ReactNode } from "react";
import type { ClassroomDetail, Student } from "@/types/school";
import { ClassScheduleTab } from "./class-schedule-tab";
import { ClassAttendanceTab } from "./class-attendance-tab";
import { ClassExamTab } from "./exam/class-exam-tab";
import { ClassTuitionTab } from "./class-tuition-tab";
import {
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
  onAddStudent,
  onArchiveClass,
  onEditClass,
  onRemoveStudent,
  onScheduleChanged,
  removingStudentId,
}: {
  classroom: ClassroomDetail | null;
  isLoading: boolean;
  onAddStudent: () => void;
  onArchiveClass?: () => void;
  onEditClass?: () => void;
  onRemoveStudent: (student: Student) => void;
  onScheduleChanged?: () => Promise<void> | void;
  removingStudentId: string;
}) {
  const [activeTab, setActiveTab] = useState<DetailTab>("students");
  const [studentFilter, setStudentFilter] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [tuitionIssueStudent, setTuitionIssueStudent] =
    useState<Student | null>(null);

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

  return (
    <>
      <section className="rounded-lg border border-[var(--neutral-200)] bg-white shadow-[var(--shadow-card)]">
        <div className="grid gap-4 border-b border-[var(--neutral-100)] p-5 lg:grid-cols-[1fr_auto] lg:items-start">
          <div className="min-w-0">
            <div className="mb-2 inline-flex items-center gap-2 rounded-lg border border-[var(--brand-100)] bg-[var(--brand-50)] px-3 py-1.5 text-[13px] font-bold text-[var(--brand-700)]">
              <BookOpenCheck size={14} />
              Chi tiết lớp học
            </div>
            <h3 className="truncate text-[24px] font-extrabold leading-tight text-[var(--brand-950)]">
              {classroom.name}
            </h3>
            <p className="mt-2 max-w-3xl text-[15px] leading-7 text-[var(--neutral-500)]">
              {classroom.description || "Chưa có mô tả cho lớp học này."}
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row lg:justify-end">
            {onEditClass ? (
              <SecondaryAction
                className="w-full sm:w-auto"
                icon={<Pencil size={15} />}
                onClick={onEditClass}
                type="button"
              >
                Sửa lớp
              </SecondaryAction>
            ) : null}
            {onArchiveClass ? (
              <button
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg border border-red-100 bg-red-50 px-5 text-[14px] font-bold text-red-600 transition hover:border-red-200 hover:bg-red-100 sm:w-auto"
                onClick={onArchiveClass}
                type="button"
              >
                <Trash2 size={15} />
                Xóa lớp
              </button>
            ) : null}
          </div>
        </div>

        <div
          className={`border-b border-[var(--neutral-100)] p-3 ${styles.tabScroller}`}
        >
          <div className="flex flex-wrap gap-2">
            {detailTabs.map(({ icon: Icon, label, value }) => {
              const isActive = activeTab === value;

              return (
                <button
                  className={`inline-flex h-11 items-center justify-center gap-2 rounded-lg px-4 text-[14px] font-bold transition ${
                    isActive
                      ? "bg-[var(--brand-50)] text-[var(--brand-700)] ring-1 ring-[var(--brand-100)]"
                      : "text-[var(--neutral-500)] hover:bg-[var(--neutral-50)] hover:text-[var(--brand-600)]"
                  }`}
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

        <div className="p-5">
          {activeTab === "students" ? (
            <StudentsTab
              filteredStudents={filteredStudents}
              onAddStudent={onAddStudent}
              onRemoveStudent={onRemoveStudent}
              onSelectStudent={setSelectedStudent}
              removingStudentId={removingStudentId}
              searchValue={studentFilter}
              setSearchValue={setStudentFilter}
              totalStudents={classroom.students.length}
            />
          ) : activeTab === "schedule" ? (
            <ClassScheduleTab
              classroom={classroom}
              onScheduleChanged={onScheduleChanged}
            />
          ) : activeTab === "tuition" ? (
            <ClassTuitionTab
              classroom={classroom}
              initialIssueStudent={tuitionIssueStudent}
              onInitialIssueHandled={() => setTuitionIssueStudent(null)}
            />
          ) : activeTab === "attendance" ? (
            <ClassAttendanceTab classroom={classroom} />
          ) : activeTab === "scores" ? (
            <ClassExamTab classroom={classroom} />
          ) : (
            <FutureTab tab={activeTab} />
          )}
        </div>
      </section>

      {selectedStudent ? (
        <StudentDetailModal
          classroom={classroom}
          onClose={() => setSelectedStudent(null)}
          onIssueReceipt={(student) => {
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

function StudentsTab({
  filteredStudents,
  onAddStudent,
  onRemoveStudent,
  onSelectStudent,
  removingStudentId,
  searchValue,
  setSearchValue,
  totalStudents,
}: {
  filteredStudents: Student[];
  onAddStudent: () => void;
  onRemoveStudent: (student: Student) => void;
  onSelectStudent: (student: Student) => void;
  removingStudentId: string;
  searchValue: string;
  setSearchValue: (value: string) => void;
  totalStudents: number;
}) {
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
      <div className="grid gap-3 sm:grid-cols-2">
        <TabStatCard
          icon={<Users size={18} />}
          label="Tổng học sinh"
          value={`${totalStudents} học sinh`}
        />
        <TabStatCard
          icon={<Search size={18} />}
          label="Kết quả đang hiển thị"
          value={`${filteredStudents.length} hồ sơ`}
        />
      </div>

      <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-end">
        <TextInput
          icon={<Search size={16} />}
          label="Tìm học sinh trong lớp"
          onChange={(event) => setSearchValue(event.target.value)}
          placeholder="Tên, mã, số điện thoại..."
          type="search"
          value={searchValue}
        />
        <PrimaryAction
          className="w-full lg:w-auto"
          icon={<Plus size={16} />}
          onClick={onAddStudent}
          type="button"
        >
          Thêm học sinh
        </PrimaryAction>
      </div>

      {filteredStudents.length ? (
        <div className={styles.studentListScroller}>
          <div className={styles.studentListTable}>
            <div
              className={`${styles.studentTableHeader} rounded-lg bg-[var(--neutral-50)] px-4 py-3 text-[13px] font-bold text-[var(--neutral-500)]`}
            >
              <span>Học sinh</span>
              <span>Giới tính</span>
              <span>Liên hệ</span>
              <span>Phụ huynh</span>
              <span>Thao tác</span>
            </div>

            {filteredStudents.map((student) => (
              <div
                className={`${styles.studentTableRow} cursor-pointer rounded-lg border border-[var(--neutral-200)] px-4 py-3 transition hover:border-[var(--brand-200)] hover:bg-[var(--brand-50)] focus-visible:border-[var(--brand-400)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgba(99,102,241,0.18)]`}
                key={student.id}
                onClick={() => onSelectStudent(student)}
                onKeyDown={(event) => handleRowKeyDown(event, student)}
                role="button"
                tabIndex={0}
              >
                <StudentIdentity student={student} />
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
                <button
                  aria-label={`Cho ${student.fullName} nghỉ lớp`}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-red-100 bg-red-50 px-3 text-[13px] font-bold text-red-600 transition hover:border-red-200 hover:bg-red-100 disabled:pointer-events-none disabled:text-red-300"
                  disabled={removingStudentId === student.id}
                  onClick={(event) => {
                    event.stopPropagation();
                    onRemoveStudent(student);
                  }}
                  type="button"
                >
                  {removingStudentId === student.id ? (
                    <LoaderCircle className="animate-spin" size={14} />
                  ) : (
                    <Trash2 size={14} />
                  )}
                  Nghỉ
                </button>
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
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="grid min-w-0 grid-cols-[42px_1fr] items-center gap-3 rounded-lg border border-[var(--neutral-200)] bg-[var(--neutral-50)] p-3">
      <span className="grid size-[42px] place-items-center rounded-lg bg-white text-[var(--brand-600)] shadow-[var(--shadow-sm)]">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-[13px] font-bold text-[var(--neutral-500)]">
          {label}
        </span>
        <strong className="mt-0.5 block truncate text-[18px] font-extrabold text-[var(--brand-950)]">
          {value}
        </strong>
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
