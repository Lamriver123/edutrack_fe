import {
  Badge,
  CalendarDays,
  GraduationCap,
  MapPin,
  NotebookText,
  Phone,
  ShieldCheck,
  UserRound,
  Users,
} from "lucide-react";
import type { ReactNode } from "react";
import type { Student } from "@/types/school";
import { getGenderLabel, getStudentAvatar } from "./classroom-utils";
import { StudentAvatar } from "./classroom-ui";

const dateFormatter = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  timeZone: "Asia/Ho_Chi_Minh",
  year: "numeric",
});

export function StudentIdentityPanel({
  actions,
  student,
}: {
  actions?: ReactNode;
  student: Student;
}) {
  return (
    <section className="relative overflow-hidden rounded-md border border-[var(--brand-100)] bg-[var(--brand-50)]">
      <span
        aria-hidden="true"
        className="absolute inset-y-0 left-0 w-1 bg-[var(--brand-500)]"
      />
      <div className="flex flex-col gap-4 p-4 pl-5 sm:flex-row sm:items-center">
        <div className="flex min-w-0 items-center gap-4">
          <StudentAvatar
            alt={student.fullName}
            size="lg"
            src={getStudentAvatar(student)}
          />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-[20px] font-extrabold text-[var(--brand-950)]">
                {student.fullName}
              </h3>
              <StudentStatus status={student.status} />
            </div>
            <p className="mt-1.5 inline-flex items-center gap-1.5 text-[13px] font-bold text-[var(--neutral-500)]">
              <Badge size={14} />
              {student.studentCode}
            </p>
          </div>
        </div>

        {actions ? (
          <div className="grid grid-cols-2 gap-2 sm:ml-auto sm:flex sm:shrink-0 [&>button]:!h-10 [&>button]:!w-full [&>button]:!rounded-md [&>button]:!px-3 sm:[&>button]:!w-auto">
            {actions}
          </div>
        ) : null}
      </div>
    </section>
  );
}

export function StudentProfileContent({ student }: { student: Student }) {
  return (
    <div className="divide-y divide-[var(--neutral-100)]">
      <ProfileSection icon={<UserRound size={16} />} title="Thông tin cá nhân">
        <DetailItem
          icon={<Badge size={16} />}
          label="Mã học sinh"
          value={student.studentCode}
        />
        <DetailItem
          icon={<UserRound size={16} />}
          label="Giới tính"
          value={getGenderLabel(student.gender)}
        />
        <DetailItem
          icon={<GraduationCap size={16} />}
          label="Lớp mấy"
          value={student.gradeLevel}
        />
        <DetailItem
          icon={<CalendarDays size={16} />}
          label="Ngày sinh"
          value={formatProfileDate(student.dateOfBirth)}
        />
        <DetailItem
          icon={<Phone size={16} />}
          label="Số điện thoại"
          value={student.phone}
          wide
        />
      </ProfileSection>

      <ProfileSection icon={<Users size={16} />} title="Liên hệ phụ huynh">
        <DetailItem
          icon={<UserRound size={16} />}
          label="Tên phụ huynh"
          value={student.parent?.fullName}
        />
        <DetailItem
          icon={<Phone size={16} />}
          label="Số điện thoại phụ huynh"
          value={student.parent?.phone}
        />
        <DetailItem
          icon={<ShieldCheck size={16} />}
          label="Quan hệ"
          value={student.parent?.relation}
        />
        <DetailItem
          icon={<NotebookText size={16} />}
          label="Ghi chú phụ huynh"
          value={student.parent?.note}
        />
      </ProfileSection>

      <ProfileSection
        columns={1}
        icon={<NotebookText size={16} />}
        title="Ghi chú và địa chỉ"
      >
        <DetailItem
          icon={<MapPin size={16} />}
          label="Địa chỉ"
          value={student.address}
        />
        <DetailItem
          icon={<NotebookText size={16} />}
          label="Ghi chú học sinh"
          value={student.note}
        />
      </ProfileSection>
    </div>
  );
}

function StudentStatus({ status }: { status: Student["status"] }) {
  const isActive = status === "active";

  return (
    <span
      className={`inline-flex min-h-7 items-center gap-1.5 rounded-full border px-2.5 text-[12px] font-extrabold ${
        isActive
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-amber-200 bg-amber-50 text-amber-700"
      }`}
    >
      <span
        aria-hidden="true"
        className={`size-1.5 rounded-full ${isActive ? "bg-emerald-500" : "bg-amber-500"}`}
      />
      {isActive ? "Đang học" : "Tạm nghỉ"}
    </span>
  );
}

function ProfileSection({
  children,
  columns = 2,
  icon,
  title,
}: {
  children: ReactNode;
  columns?: 1 | 2;
  icon: ReactNode;
  title: string;
}) {
  return (
    <section className="grid gap-3 py-5 first:pt-0 last:pb-0">
      <h4 className="flex items-center gap-2 text-[14px] font-extrabold text-[var(--brand-800)]">
        <span className="grid size-7 place-items-center rounded-md bg-[var(--brand-50)] text-[var(--brand-600)]">
          {icon}
        </span>
        {title}
      </h4>
      <div
        className={`grid gap-x-8 gap-y-1 ${
          columns === 2 ? "sm:grid-cols-2" : "grid-cols-1"
        }`}
      >
        {children}
      </div>
    </section>
  );
}

function DetailItem({
  icon,
  label,
  value,
  wide = false,
}: {
  icon: ReactNode;
  label: string;
  value?: string;
  wide?: boolean;
}) {
  const displayValue = value?.trim();

  return (
    <div
      className={`flex min-h-[68px] items-start gap-3 border-b border-[var(--neutral-100)] py-2.5 ${
        wide ? "sm:col-span-2" : ""
      }`}
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-md bg-[var(--brand-50)] text-[var(--brand-500)]">
        {icon}
      </span>
      <span className="min-w-0 pt-0.5">
        <span className="block text-[12px] font-bold text-[var(--neutral-500)]">
          {label}
        </span>
        <span
          className={`mt-1 block break-words text-[14px] font-bold leading-5 ${
            displayValue
              ? "text-[var(--neutral-800)]"
              : "text-[var(--neutral-400)]"
          }`}
        >
          {displayValue || "Chưa cập nhật"}
        </span>
      </span>
    </div>
  );
}

function formatProfileDate(value?: string) {
  if (!value) {
    return undefined;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? undefined : dateFormatter.format(date);
}
