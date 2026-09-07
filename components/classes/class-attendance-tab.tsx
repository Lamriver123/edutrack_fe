"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { schoolApi } from "@/lib/api/school";
import { useNotice } from "@/components/ui/notice-provider";
import type {
  AttendanceStatus,
  ClassroomDetail,
  FlatAttendanceRecord,
  TakeAttendancePayload,
  TeacherScheduleEvent,
} from "@/types/school";
import { FileSpreadsheet } from "lucide-react";
import { ConfirmDialog } from "./classroom-ui";
import { AttendanceTable } from "./attendance/attendance-table";
import { AttendanceLegend } from "./attendance/attendance-legend";
import { AttendanceActionBar } from "./attendance/attendance-action-bar";

type ClassAttendanceTabProps = {
  classroom: ClassroomDetail;
};

export function ClassAttendanceTab({ classroom }: ClassAttendanceTabProps) {
  const [sessions, setSessions] = useState<TeacherScheduleEvent[]>([]);
  const [fetchedRecords, setFetchedRecords] = useState<FlatAttendanceRecord[]>([]);
  const [localRecords, setLocalRecords] = useState<Record<string, AttendanceStatus>>({});
  const [dirtyCells, setDirtyCells] = useState<Set<string>>(new Set());
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { setNotice } = useNotice();
  const [showConfirm, setShowConfirm] = useState(false);

  const [notes, setNotes] = useState<Record<string, string>>({});
  const [editingSessions, setEditingSessions] = useState<Set<string>>(new Set());
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const activeStudents = useMemo(() => 
    classroom.students.filter(s => s.status === 'active'),
  [classroom.students]);

  useEffect(() => {
    const fetchSheet = async () => {
      try {
        setIsLoading(true);
        const data = await schoolApi.getAttendanceSheet(classroom.id);
        if (data) {
          setSessions(data.sessions);
          setFetchedRecords(data.records);
          
          const initialRecords: Record<string, AttendanceStatus> = {};
          const initialNotes: Record<string, string> = {};
          data.records.forEach(r => {
            initialRecords[`${r.sessionId}:${r.studentId}`] = r.status as AttendanceStatus;
            if (r.note) {
              initialNotes[`${r.sessionId}:${r.studentId}`] = r.note;
            }
          });
          setLocalRecords(initialRecords);
          setNotes(initialNotes);
          setDirtyCells(new Set());
          setEditingSessions(new Set());
        }
      } catch (err) {
        console.error("Failed to fetch attendance sheet", err);
      } finally {
        setIsLoading(false);
        // Scroll logic will trigger after render
        setTimeout(() => {
          scrollToActiveSession();
        }, 100);
      }
    };
    
    fetchSheet();
  }, [classroom.id]);

  const scrollToActiveSession = () => {
    if (!scrollContainerRef.current) return;
    
    // Attempt to find today's column first
    let target = document.getElementById('session-col-today');
    if (!target) {
      // Find the last session column if today doesn't exist
      target = document.getElementById('session-col-latest');
    }
    
    if (target && scrollContainerRef.current) {
      // Get the relative position within the container
      const containerBounds = scrollContainerRef.current.getBoundingClientRect();
      const targetBounds = target.getBoundingClientRect();
      
      // Calculate offset to center the column (taking sticky cols into account)
      const stickyColsWidth = 330; // STT + Student Col
      const scrollPosition = (targetBounds.left - containerBounds.left) + scrollContainerRef.current.scrollLeft - stickyColsWidth - 50;
      
      scrollContainerRef.current.scrollTo({
        left: Math.max(0, scrollPosition),
        behavior: 'smooth'
      });
    }
  };

  const savedSessions = useMemo(() => {
    const saved = new Set<string>();
    fetchedRecords.forEach(r => saved.add(r.sessionId));
    return saved;
  }, [fetchedRecords]);

  const billedCells = useMemo(() => {
    const billed = new Set<string>();
    fetchedRecords.forEach((record) => {
      if (record.isBilled) {
        billed.add(`${record.sessionId}:${record.studentId}`);
      }
    });
    return billed;
  }, [fetchedRecords]);

  const toggleStatus = (sessionId: string, studentId: string) => {
    const key = `${sessionId}:${studentId}`;
    if (billedCells.has(key)) {
      setNotice({
        type: "error",
        text: "Lượt điểm danh này đã xuất hóa đơn nên không thể chỉnh sửa.",
      });
      return;
    }

    if (savedSessions.has(sessionId) && !editingSessions.has(sessionId)) return;

    const currentStatus = localRecords[key];
    
    let nextStatus: AttendanceStatus | undefined = "present";
    if (currentStatus === "present") nextStatus = "absent";
    else if (currentStatus === "absent") nextStatus = "excused";
    else if (currentStatus === "excused") nextStatus = undefined;

    setLocalRecords(prev => {
      const next = { ...prev };
      if (nextStatus) {
        next[key] = nextStatus;
      } else {
        delete next[key];
      }
      return next;
    });

    setDirtyCells(prev => {
      const next = new Set(prev);
      
      const originalRecord = fetchedRecords.find(r => r.sessionId === sessionId && r.studentId === studentId);
      const originalStatus = originalRecord?.status;
      
      if (originalStatus === nextStatus) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const handleUnlockSession = (sessionId: string) => {
    setEditingSessions(prev => new Set(prev).add(sessionId));
  };

  const handleCancelChanges = () => {
    const initialRecords: Record<string, AttendanceStatus> = {};
    const initialNotes: Record<string, string> = {};
    fetchedRecords.forEach(r => {
      initialRecords[`${r.sessionId}:${r.studentId}`] = r.status as AttendanceStatus;
      if (r.note) initialNotes[`${r.sessionId}:${r.studentId}`] = r.note;
    });
    setLocalRecords(initialRecords);
    setNotes(initialNotes);
    setDirtyCells(new Set());
    setEditingSessions(new Set());
  };

  const handleSaveOrClose = () => {
    if (dirtyCells.size > 0) {
      setShowConfirm(true);
    } else {
      setEditingSessions(new Set());
    }
  };

  const handleSave = async () => {
    if (dirtyCells.size === 0) return;
    
    setIsSaving(true);
    setNotice(null);
    setShowConfirm(false);
    
    try {
      const updatesBySession: Record<string, { studentId: string, status: AttendanceStatus | null, note?: string }[]> = {};
      
      dirtyCells.forEach(key => {
        const lastColonIdx = key.lastIndexOf(":");
        const sessionId = key.substring(0, lastColonIdx);
        const studentId = key.substring(lastColonIdx + 1);
        const status = localRecords[key];
        const note = notes[key];
        
        if (!updatesBySession[sessionId]) {
          updatesBySession[sessionId] = [];
        }
        updatesBySession[sessionId].push({ 
          studentId, 
          status: status || null,
          note: note || undefined
        });
      });
      
      const payloadSessions: TakeAttendancePayload[] = [];
      for (const [sessionId, records] of Object.entries(updatesBySession)) {
        const sessionDef = sessions.find(s => s.id === sessionId);
        if (!sessionDef) continue;
        
        payloadSessions.push({
          date: sessionDef.date,
          startTime: sessionDef.startTime || "00:00",
          endTime: sessionDef.endTime || "23:59",
          scheduleEventType: sessionDef.type === "cancel" ? "manual" : sessionDef.type,
          records: records
        });
      }
      
      await schoolApi.takeAttendanceBatch(classroom.id, { sessions: payloadSessions });
      
      // Update fetchedRecords
      const newFetched = [...fetchedRecords];
      dirtyCells.forEach(key => {
        const lastColonIdx = key.lastIndexOf(":");
        const sessionId = key.substring(0, lastColonIdx);
        const studentId = key.substring(lastColonIdx + 1);
        const status = localRecords[key];
        const idx = newFetched.findIndex(r => r.sessionId === sessionId && r.studentId === studentId);
        if (idx >= 0) {
          if (status) {
            newFetched[idx].status = status;
            newFetched[idx].note = notes[key];
            newFetched[idx].isBilled = false;
          } else {
            newFetched.splice(idx, 1);
          }
        } else if (status) {
          newFetched.push({
            id: 'temp',
            sessionId,
            studentId,
            status,
            note: notes[key] || '',
            isBilled: false,
          });
        }
      });
      
      setFetchedRecords(newFetched);
      setDirtyCells(new Set());
      setEditingSessions(new Set());
      setNotice({ type: 'success', text: 'Đã lưu điểm danh thành công!' });
    } catch (err: unknown) {
      setNotice({
        type: 'error',
        text: getApiErrorMessage(err, 'Có lỗi xảy ra khi lưu điểm danh.'),
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center text-sm text-neutral-500">Đang tải dữ liệu điểm danh...</div>;
  }

  // Calculate overview based on current localRecords
  const overviewStats = activeStudents.reduce((acc, student) => {
    let present = 0, absent = 0, excused = 0;
    sessions.forEach(s => {
      const status = localRecords[`${s.id}:${student.id}`];
      if (status === 'present') present++;
      if (status === 'absent') absent++;
      if (status === 'excused') excused++;
    });
    acc[student.id] = { present, absent, excused };
    return acc;
  }, {} as Record<string, { present: number, absent: number, excused: number }>);

  return (
    <div className="flex flex-col min-w-0">
      <main className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800">Bảng điểm danh</h2>
          <button className="px-4 py-2 text-sm font-bold rounded-full bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-sm transition flex items-center gap-2 shrink-0">
            <FileSpreadsheet size={16} className="text-emerald-600 shrink-0" />
            <span>Excel</span>
          </button>
        </div>

        {/* AttendanceMatrixSection */}
        <section className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col">
          <AttendanceTable
            sessions={sessions}
            activeStudents={activeStudents}
            localRecords={localRecords}
            savedSessions={savedSessions}
            billedCells={billedCells}
            editingSessions={editingSessions}
            overviewStats={overviewStats}
            onToggleStatus={toggleStatus}
            onUnlockSession={handleUnlockSession}
            scrollContainerRef={scrollContainerRef}
          />
          <AttendanceLegend 
            showingCount={activeStudents.length} 
            totalCount={classroom.students.length} 
          />
        </section>

        <AttendanceActionBar
          dirtyCellsSize={dirtyCells.size}
          editingSessionsSize={editingSessions.size}
          isSaving={isSaving}
          onCancel={handleCancelChanges}
          onSaveOrClose={handleSaveOrClose}
        />
      </main>

      {showConfirm && (
        <ConfirmDialog
          title="Xác nhận lưu điểm danh"
          description={`Bạn đang lưu điểm danh cho ${dirtyCells.size} lượt thay đổi. Dữ liệu này sẽ cập nhật vào hệ thống.`}
          confirmText="Lưu thay đổi"
          cancelText="Hủy"
          onConfirm={handleSave}
          onCancel={() => setShowConfirm(false)}
          isLoading={isSaving}
        />
      )}


    </div>
  );
}

function getApiErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error !== "object" || error === null || !("response" in error)) {
    return fallback;
  }

  const response = error as {
    response?: {
      data?: {
        message?: unknown;
      };
    };
  };
  const message = response.response?.data?.message;

  if (typeof message === "string") {
    return message;
  }

  if (Array.isArray(message)) {
    return message.filter((item) => typeof item === "string").join(", ");
  }

  return fallback;
}
