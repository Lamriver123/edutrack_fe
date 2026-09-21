"use client";

import { FileText, Search } from "lucide-react";
import {
  EmptyState,
  PrimaryAction,
  StudentAvatar,
} from "@/components/classes/classroom-ui";
import {
  formatMoney,
  getStudentAvatar,
} from "@/components/classes/classroom-utils";
import type { BillingOverviewStudent } from "@/types/school";
import { StatusPill } from "./receipt-dialogs";

export function BillingStudentList({
  onIssue,
  students,
}: {
  onIssue: (row: BillingOverviewStudent) => void;
  students: BillingOverviewStudent[];
}) {
  if (!students.length) {
    return (
      <EmptyState
        icon={<Search size={22} />}
        text="Chưa có học sinh hoặc buổi học nào cần xuất hóa đơn trong kỳ đang chọn."
        title="Chưa có dữ liệu học phí"
      />
    );
  }

  return (
    <>
      <div className="divide-y divide-[var(--neutral-200)] overflow-hidden rounded-md border border-[var(--neutral-200)] xl:hidden">
        {students.map((row) => (
          <article
            className="grid gap-3 p-3 sm:grid-cols-[minmax(0,1fr)_120px] sm:items-center"
            key={row.student.id}
          >
            <div className="grid min-w-0 gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <StudentAvatar
                  alt={row.student.fullName}
                  src={getStudentAvatar(row.student)}
                />
                <div className="min-w-0 flex-1">
                  <h4 className="truncate text-[15px] font-extrabold text-[var(--neutral-800)]">
                    {row.student.fullName}
                  </h4>
                  <p className="truncate text-[13px] font-semibold text-[var(--neutral-500)]">
                    {row.student.studentCode}
                  </p>
                </div>
                <StatusPill
                  tone={row.reachedSuggestedCycle ? "success" : "neutral"}
                >
                  {row.unbilledLessonCount} buổi
                </StatusPill>
              </div>

              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-[13px] md:grid-cols-3">
                <div className="min-w-0">
                  <dt className="font-semibold text-[var(--neutral-500)]">
                    Tạm tính
                  </dt>
                  <dd className="mt-0.5 truncate font-extrabold text-[var(--brand-950)]">
                    {formatMoney(row.unbilledAmount)}
                  </dd>
                </div>
                <div className="min-w-0">
                  <dt className="font-semibold text-[var(--neutral-500)]">
                    Hóa đơn gần nhất
                  </dt>
                  <dd className="mt-0.5 truncate font-bold text-[var(--neutral-700)]">
                    {row.latestReceipt?.receiptNumber ?? "Chưa có"}
                  </dd>
                </div>
                <div className="col-span-2 min-w-0 md:col-span-1">
                  <dt className="font-semibold text-[var(--neutral-500)]">
                    Trạng thái
                  </dt>
                  <dd className="mt-0.5 truncate font-bold text-[var(--neutral-700)]">
                    {row.reachedSuggestedCycle
                      ? "Đủ chu kỳ gợi ý"
                      : "Có thể xuất thủ công"}
                  </dd>
                </div>
              </dl>
            </div>

            <PrimaryAction
              className="h-10 w-full px-3"
              disabled={row.unbilledLessonCount === 0}
              icon={<FileText size={15} />}
              onClick={() => onIssue(row)}
              type="button"
            >
              Xuất
            </PrimaryAction>
          </article>
        ))}
      </div>

      <div className="hidden max-w-full overflow-x-auto pb-2 xl:block">
        <div className="grid min-w-[820px] gap-2">
          <div className="grid grid-cols-[minmax(240px,1.45fr)_110px_140px_150px_120px] gap-3 rounded-md bg-[var(--neutral-50)] px-4 py-3 text-[13px] font-bold text-[var(--neutral-500)]">
            <span>Học sinh</span>
            <span>Chờ xuất</span>
            <span>Tạm tính</span>
            <span>Hóa đơn gần nhất</span>
            <span>Thao tác</span>
          </div>
          {students.map((row) => (
            <div
              className="grid grid-cols-[minmax(240px,1.45fr)_110px_140px_150px_120px] items-center gap-3 rounded-md border border-[var(--neutral-200)] px-4 py-3"
              key={row.student.id}
            >
              <div className="grid min-w-0 grid-cols-[48px_1fr] items-center gap-3">
                <StudentAvatar
                  alt={row.student.fullName}
                  src={getStudentAvatar(row.student)}
                />
                <span className="min-w-0">
                  <span className="block truncate text-[15px] font-extrabold text-[var(--neutral-800)]">
                    {row.student.fullName}
                  </span>
                  <span className="block truncate text-[13px] font-semibold text-[var(--neutral-500)]">
                    {row.student.studentCode}
                  </span>
                </span>
              </div>
              <StatusPill
                tone={row.reachedSuggestedCycle ? "success" : "neutral"}
              >
                {row.unbilledLessonCount} buổi
              </StatusPill>
              <strong className="text-[15px] text-[var(--brand-950)]">
                {formatMoney(row.unbilledAmount)}
              </strong>
              <span className="truncate text-[13px] font-semibold text-[var(--neutral-500)]">
                {row.latestReceipt?.receiptNumber ?? "Chưa có"}
              </span>
              <PrimaryAction
                className="h-10 w-full px-3"
                disabled={row.unbilledLessonCount === 0}
                icon={<FileText size={15} />}
                onClick={() => onIssue(row)}
                type="button"
              >
                Xuất
              </PrimaryAction>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
