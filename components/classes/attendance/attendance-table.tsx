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
    <div className="overflow-x-auto" ref={scrollContainerRef}>
      <table className="w-full text-left border-collapse min-w-[950px]">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50/75 text-[10px] sm:text-[11px] font-bold tracking-wider text-slate-500 uppercase">
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
                  <th id={idAttr} key={s.id} className="py-4 px-2 sm:px-3 text-center border-l border-indigo-100 bg-indigo-50/70 w-[90px] sm:w-[100px] min-w-[90px] sm:min-w-[100px]" scope="col">
                    <div className="inline-flex items-center justify-center gap-1.5 font-black text-indigo-800">
                      {displayDate}
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-600"></span>
                      {isSaved && !isEditing && !isFullyBilled && (
                        <button onClick={() => onUnlockSession(s.id)} className="text-indigo-400 hover:text-indigo-600 ml-1 transition" title="Sửa điểm danh">
                          <Pencil size={12} />
                        </button>
                      )}
                    </div>
                    <div className="text-[10px] font-bold text-indigo-600">Hôm nay {s.startTime}</div>
                  </th>
                );
              }
              return (
                <th id={idAttr} key={s.id} className="py-4 px-2 sm:px-3 text-center border-l border-slate-200 bg-slate-100/50 w-[80px] sm:w-[90px] min-w-[80px] sm:min-w-[90px]" scope="col">
                  <div className="flex items-center justify-center gap-1.5 font-bold text-slate-800">
                    {displayDate}
                    {isSaved && !isEditing && !isFullyBilled && (
                      <button onClick={() => onUnlockSession(s.id)} className="text-slate-400 hover:text-indigo-600 transition" title="Sửa điểm danh">
                        <Pencil size={12} />
                      </button>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-400 font-normal lowercase">{s.startTime}</div>
                </th>
              );
            })}
            {paddingColumns.map((id) => (
              <th key={id} className="py-4 px-2 sm:px-3 text-center border-l border-slate-200 bg-slate-100/50 min-w-[90px] sm:min-w-[95px] pr-4 sm:pr-6" scope="col"></th>
            ))}
            <th className="w-full" aria-hidden="true"></th>
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-100 text-sm font-medium">
          {activeStudents.map((student, i) => {
            const stats = overviewStats[student.id] || { present: 0, absent: 0, excused: 0 };
            const rowBg = i % 2 === 1 ? "bg-slate-50/30" : "";

            return (
              <tr key={student.id} className={`hover:bg-slate-50/80 transition group ${rowBg}`}>
                <td className={`py-3 sm:py-4 px-1 sm:px-2 text-center text-[11px] sm:text-xs text-slate-400 font-bold ${styles.sttCol}`}>
                  {String(i + 1).padStart(2, "0")}
                </td>
                <td className={`py-2 sm:py-4 px-2 sm:px-4 ${styles.stickyCol}`}>
                  <div className="flex items-center gap-0 sm:gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={getStudentAvatar(student)}
                      alt={student.fullName}
                      className="w-0 h-0 sm:w-10 sm:h-10 rounded-full object-cover border border-neutral-200 flex-shrink-0 hidden sm:block"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-0 sm:gap-2 leading-tight sm:leading-normal">
                        <span className="font-bold text-[12px] sm:text-base text-slate-900 group-hover:text-indigo-600 transition line-clamp-2 sm:line-clamp-1">{student.fullName}</span>
                      </div>
                      <div className="flex items-center gap-1 sm:gap-2 text-[9px] sm:text-[11px] font-semibold mt-0.5 sm:mt-1">
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

                  const cellBg = today ? "bg-indigo-50/20 border-indigo-50" : "border-slate-100";

                  let btnClass = "w-9 h-9 rounded-full text-[11px] sm:text-xs inline-flex items-center justify-center transition font-bold shrink-0";
                  let displayContent = null;

                  if (status === "present") {
                    btnClass += " bg-emerald-50 border border-emerald-200 text-emerald-700";
                    if (canEdit) btnClass += " hover:bg-emerald-100";
                    displayContent = "CM";
                  } else if (status === "absent") {
                    btnClass += " bg-rose-50 border border-rose-200 text-rose-700";
                    if (canEdit) btnClass += " hover:bg-rose-100";
                    displayContent = "KP";
                  } else if (status === "excused") {
                    btnClass += " bg-amber-50 border border-amber-200 text-amber-700";
                    if (canEdit) btnClass += " hover:bg-amber-100";
                    displayContent = "CP";
                  } else {
                    return (
                      <td
                        key={s.id}
                        className={`py-3 sm:py-4 px-2 sm:px-3 text-center border-l ${cellBg} text-slate-300 font-mono text-xs ${canEdit ? "cursor-pointer hover:bg-slate-50" : "opacity-50"}`}
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
                      <button className={`${btnClass} ${isBilled ? "ring-2 ring-slate-200 ring-offset-1" : ""} ${!canEdit ? "opacity-70 cursor-not-allowed" : ""}`}>
                        {displayContent}
                        {isBilled && (
                          <Lock size={10} className="ml-0.5 text-slate-500" />
                        )}
                      </button>
                    </td>
                  );
                })}
                {paddingColumns.map((id) => (
                  <td key={id} className="py-3 sm:py-4 px-2 sm:px-3 text-center border-l border-slate-100 text-slate-300 font-mono text-xs pr-4 sm:pr-6">
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
