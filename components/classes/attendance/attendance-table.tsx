import { Lock, Pencil } from "lucide-react";
import type {
  AttendanceStatus,
  Student,
  TeacherScheduleEvent,
} from "@/types/school";
import styles from "../class-attendance-tab.module.css";
import { getStudentAvatar } from "../classroom-utils";

type AttendanceTableProps = {
  sessions: TeacherScheduleEvent[];
  activeStudents: Student[];
  localRecords: Record<string, AttendanceStatus>;
  savedSessions: Set<string>;
  billedCells: Set<string>;
  editingSessions: Set<string>;
  overviewStats: Record<string, { present: number; absent: number; excused: number }>;
  onToggleStatus: (sessionId: string, studentId: string) => void;
  onUnlockSession: (sessionId: string) => void;
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
};

export function AttendanceTable({
  sessions,
  activeStudents,
  localRecords,
  savedSessions,
  billedCells,
  editingSessions,
  overviewStats,
  onToggleStatus,
  onUnlockSession,
  scrollContainerRef,
}: AttendanceTableProps) {
  const getDisplayDate = (d: string) => {
    const parts = d.split("-");
    return `${parts[2]}/${parts[1]}`;
  };

  const isToday = (d: string) => {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    return d === todayStr;
  };

  const MIN_COLUMNS = 7;
  const paddingCount = Math.max(0, MIN_COLUMNS - sessions.length);
  const paddingColumns = Array.from({ length: paddingCount }).map((_, i) => `pad-${i}`);

  return (
    <div className="overflow-x-auto overscroll-x-contain" ref={scrollContainerRef}>
      <table className="min-w-[980px] w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-[var(--border)] bg-[var(--neutral-50)] text-[12px] font-bold text-[var(--neutral-500)]">
            <th className={`py-3 sm:py-4 px-1 sm:px-2 w-8 sm:w-14 min-w-[32px] sm:min-w-[56px] text-center ${styles.sttCol}`} scope="col">STT</th>
            <th className={`py-3 sm:py-4 px-2 sm:px-4 w-[120px] sm:w-[280px] min-w-[120px] sm:min-w-[280px] ${styles.stickyCol}`} scope="col">Học sinh & Thống kê</th>
            {sessions.map((s, idx) => {
              const displayDate = getDisplayDate(s.date);
              const today = isToday(s.date);
              const isLatest = idx === sessions.length - 1 && !sessions.some((ses) => isToday(ses.date));
              const idAttr = today ? "session-col-today" : isLatest ? "session-col-latest" : undefined;
              const isSaved = savedSessions.has(s.id);
              const isEditing = editingSessions.has(s.id);
              const isFullyBilled =
                activeStudents.length > 0 &&
                activeStudents.every((student) => billedCells.has(`${s.id}:${student.id}`));

              if (today) {
                return (
                  <th id={idAttr} key={s.id} className="min-w-[96px] border-l border-[var(--brand-100)] bg-[var(--brand-50)] px-2 py-4 text-center sm:min-w-[108px] sm:px-3" scope="col">
                    <div className="inline-flex items-center justify-center gap-1.5 font-extrabold text-[var(--brand-800)]">
                      {displayDate}
                      <span className="size-1.5 rounded-full bg-[var(--brand-600)]"></span>
                      {isSaved && !isEditing && !isFullyBilled && (
                        <button onClick={() => onUnlockSession(s.id)} className="ml-1 rounded p-1 text-[var(--brand-400)] transition hover:bg-white hover:text-[var(--brand-700)]" title="Sửa điểm danh" type="button">
                          <Pencil size={12} />
                        </button>
                      )}
                    </div>
                    <div className="mt-1 text-[11px] font-bold text-[var(--brand-600)]">Hôm nay {s.startTime}</div>
                  </th>
                );
              }
              return (
                <th id={idAttr} key={s.id} className="min-w-[96px] border-l border-[var(--border)] bg-white px-2 py-4 text-center sm:min-w-[108px] sm:px-3" scope="col">
                  <div className="flex items-center justify-center gap-1.5 font-bold text-[var(--neutral-800)]">
                    {displayDate}
                    {isSaved && !isEditing && !isFullyBilled && (
                      <button onClick={() => onUnlockSession(s.id)} className="rounded p-1 text-[var(--neutral-400)] transition hover:bg-[var(--brand-50)] hover:text-[var(--brand-600)]" title="Sửa điểm danh" type="button">
                        <Pencil size={12} />
                      </button>
                    )}
                  </div>
                  <div className="mt-1 text-[11px] font-medium text-[var(--neutral-400)]">{s.startTime}</div>
                </th>
              );
            })}
            {paddingColumns.map((id) => (
              <th key={id} className="min-w-[96px] border-l border-[var(--border)] bg-white px-2 py-4 text-center sm:min-w-[108px] sm:px-3" scope="col"></th>
            ))}
            <th className="w-full" aria-hidden="true"></th>
          </tr>
        </thead>

        <tbody className="divide-y divide-[var(--neutral-100)] text-[14px] font-medium">
          {activeStudents.map((student, i) => {
            const stats = overviewStats[student.id] || { present: 0, absent: 0, excused: 0 };
            const rowBg = i % 2 === 1 ? "bg-[var(--neutral-50)]/50" : "";

            return (
              <tr key={student.id} className={`group transition hover:bg-[var(--brand-50)]/45 ${rowBg}`}>
                <td className={`px-1 py-3 text-center text-[12px] font-bold text-[var(--neutral-400)] sm:px-2 sm:py-4 sm:text-[13px] ${styles.sttCol}`}>
                  {String(i + 1).padStart(2, "0")}
                </td>
                <td className={`py-2 sm:py-4 px-2 sm:px-4 ${styles.stickyCol}`}>
                  <div className="flex items-center gap-0 sm:gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={getStudentAvatar(student)}
                      alt={student.fullName}
                      className="hidden size-10 shrink-0 rounded-md border border-[var(--border)] object-cover sm:block"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-0 sm:gap-2 leading-tight sm:leading-normal">
                        <span className="line-clamp-2 text-[13px] font-bold text-[var(--neutral-900)] transition group-hover:text-[var(--brand-700)] sm:line-clamp-1 sm:text-[15px]">{student.fullName}</span>
                      </div>
                      <div className="mt-1 flex items-center gap-1 text-[11px] font-semibold sm:gap-2 sm:text-[12px]">
                        <span className="text-emerald-600">{stats.present} CM</span>
                        <span className="text-slate-300">•</span>
                        <span className="text-rose-500">{stats.absent} KP</span>
                        <span className="text-slate-300">•</span>
                        <span className="text-amber-500">{stats.excused} CP</span>
                      </div>
                    </div>
                  </div>
                </td>
                {sessions.map((s) => {
                  const key = `${s.id}:${student.id}`;
                  const status = localRecords[key];
                  const today = isToday(s.date);
                  const isSaved = savedSessions.has(s.id);
                  const isEditing = editingSessions.has(s.id);
                  const isBilled = billedCells.has(key);
                  const canEdit = (!isSaved || isEditing) && !isBilled;
                  const cellTitle = isBilled
                    ? "Đã xuất hóa đơn, không thể chỉnh sửa"
                    : canEdit
                      ? "Bấm để đổi trạng thái"
                      : "Mở khóa buổi học để sửa điểm danh";

                  const cellBg = today ? "bg-[var(--brand-50)]/45 border-[var(--brand-100)]" : "border-[var(--neutral-100)]";

                  let btnClass =
                    "inline-flex h-9 min-w-9 shrink-0 items-center justify-center rounded-lg border border-transparent px-2 text-[12px] font-extrabold text-white shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2";
                  let displayContent = null;

                  if (status === "present") {
                    btnClass +=
                      " bg-emerald-500 focus-visible:ring-emerald-300";
                    if (canEdit) btnClass += " hover:bg-emerald-600";
                    displayContent = "CM";
                  } else if (status === "absent") {
                    btnClass += " bg-rose-500 focus-visible:ring-rose-300";
                    if (canEdit) btnClass += " hover:bg-rose-600";
                    displayContent = "KP";
                  } else if (status === "excused") {
                    btnClass += " bg-amber-500 focus-visible:ring-amber-300";
                    if (canEdit) btnClass += " hover:bg-amber-600";
                    displayContent = "CP";
                  } else {
                    return (
                      <td
                        key={s.id}
                        className={`border-l px-2 py-3 text-center text-[13px] font-semibold text-[var(--neutral-300)] sm:px-3 sm:py-4 ${cellBg} ${canEdit ? "cursor-pointer hover:bg-[var(--neutral-50)]" : "opacity-50"}`}
                        onClick={() => canEdit && onToggleStatus(s.id, student.id)}
                        title={cellTitle}
                      >
                        --
                      </td>
                    );
                  }

                  return (
                    <td
                      key={s.id}
                      className={`py-3 sm:py-4 px-2 sm:px-3 text-center border-l ${cellBg} ${canEdit ? "cursor-pointer" : ""}`}
                      onClick={() => canEdit && onToggleStatus(s.id, student.id)}
                      title={cellTitle}
                    >
                      <button
                        aria-label={`${displayContent}${isBilled ? ", đã khóa do đã xuất hóa đơn" : ""}`}
                        className={`${btnClass} ${isBilled ? "ring-2 ring-[var(--neutral-300)] ring-offset-1" : ""} ${!canEdit ? "cursor-not-allowed" : ""}`}
                        disabled={!canEdit}
                        type="button"
                      >
                        {displayContent}
                        {isBilled && (
                          <Lock size={10} className="ml-0.5 text-white/90" />
                        )}
                      </button>
                    </td>
                  );
                })}
                {paddingColumns.map((id) => (
                  <td key={id} className="border-l border-[var(--neutral-100)] px-2 py-3 text-center text-[13px] font-semibold text-[var(--neutral-300)] sm:px-3 sm:py-4">
                    --
                  </td>
                ))}
                <td className="w-full" aria-hidden="true"></td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {activeStudents.length === 0 && (
        <div className="p-8 text-center text-sm text-neutral-500">
          Lớp học chưa có học sinh nào.
        </div>
      )}

      {sessions.length === 0 && activeStudents.length > 0 && (
        <div className="p-8 text-center text-sm text-neutral-500">
          Chưa có buổi học nào được lên lịch cho lớp này.
        </div>
      )}
    </div>
  );
}
