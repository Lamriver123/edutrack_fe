import {
  Badge,
  CalendarDays,
  MapPin,
  NotebookText,
  Phone,
  ShieldCheck,
  UserRound,
  Users,
} from "lucide-react";
import type { ReactNode } from "react";
import type { Student } from "@/types/school";
import {
  getGenderLabel,
  getStudentAvatar,
} from "./classroom-utils";
import { Modal, StudentAvatar } from "./classroom-ui";

const dateFormatter = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

export function StudentDetailModal({
  actions,
  onClose,
  student,
}: {
  actions?: ReactNode;
  onClose: () => void;
  student: Student;
}) {
  return (
    <Modal onClose={onClose} title="Thông tin học sinh">
      <div className="grid gap-5">
        <div className="grid gap-4 rounded-lg border border-[var(--neutral-200)] bg-[var(--neutral-50)] p-4 sm:grid-cols-[auto_1fr] sm:items-center">
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
              <span
                className={`rounded-full border px-3 py-1 text-[13px] font-bold ${
                  student.status === "active"
                    ? "border-emerald-100 bg-emerald-50 text-emerald-700"
                    : "border-orange-100 bg-orange-50 text-orange-700"
                }`}
              >
                {student.status === "active" ? "Đang học" : "Tạm nghỉ"}
              </span>
            </div>
            <p className="mt-1 text-[14px] font-semibold text-[var(--neutral-500)]">
              {student.studentCode}
            </p>
          </div>
        </div>

        {actions ? (
          <div className="flex flex-col-reverse gap-3 rounded-lg border border-[var(--neutral-200)] bg-white p-3 sm:flex-row sm:justify-end">
            {actions}
          </div>
        ) : null}

        <section className="grid gap-3">
          <SectionTitle icon={<UserRound size={16} />}>
            Thông tin cá nhân
          </SectionTitle>
          <div className="grid gap-3 sm:grid-cols-2">
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
              icon={<CalendarDays size={16} />}
              label="Ngày sinh"
              value={formatDate(student.dateOfBirth)}
            />
            <DetailItem
              icon={<Phone size={16} />}
              label="Số điện thoại"
              value={student.phone}
            />
          </div>
        </section>

        <section className="grid gap-3">
          <SectionTitle icon={<Users size={16} />}>
            Liên hệ phụ huynh
          </SectionTitle>
          <div className="grid gap-3 sm:grid-cols-2">
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
          </div>
        </section>

        <section className="grid gap-3">
          <SectionTitle icon={<NotebookText size={16} />}>
            Ghi chú và địa chỉ
          </SectionTitle>
          <div className="grid gap-3">
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
          </div>
        </section>
      </div>
    </Modal>
  );
}

function SectionTitle({
  children,
  icon,
}: {
  children: ReactNode;
  icon: ReactNode;
}) {
  return (
    <h4 className="flex items-center gap-2 text-[14px] font-extrabold text-[var(--brand-700)]">
      {icon}
      {children}
    </h4>
  );
}

function DetailItem({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value?: string;
}) {
  return (
    <div className="grid gap-2 rounded-lg border border-[var(--neutral-200)] bg-white p-3">
      <span className="flex items-center gap-2 text-[13px] font-bold text-[var(--neutral-500)]">
        {icon}
        {label}
      </span>
      <span className="break-words text-[15px] font-bold leading-6 text-[var(--neutral-800)]">
        {value?.trim() || "Chưa có"}
      </span>
    </div>
  );
}

function formatDate(value?: string) {
  if (!value) {
    return "Chưa có";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Chưa có";
  }

  return dateFormatter.format(date);
}
