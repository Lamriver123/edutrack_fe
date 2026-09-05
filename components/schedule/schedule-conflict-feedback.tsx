"use client";

import { AlertTriangle, CircleCheck } from "lucide-react";
import { useRef, useState } from "react";
import { ApiError } from "@/lib/api/client";
import type { ScheduleConflictResult } from "@/types/school";
import styles from "./schedule-planning.module.css";

export function useScheduleCheck() {
  const [result, setResult] = useState<ScheduleConflictResult | null>(null);
  const [error, setError] = useState("");
  const [isChecking, setIsChecking] = useState(false);
  const revision = useRef(0);
  function clear() {
    revision.current += 1;
    setIsChecking(false);
    setResult(null);
    setError("");
  }
  function captureError(error: unknown) {
    if (error instanceof ApiError && error.code === "SCHEDULE_CONFLICT") {
      setResult(error.details as ScheduleConflictResult);
      setError("");
    } else {
      setError(
        error instanceof Error
          ? error.message
          : "Không thể kiểm tra lịch. Vui lòng thử lại.",
      );
    }
  }
  async function check(request: () => Promise<ScheduleConflictResult>) {
    clear();
    const requestRevision = revision.current;
    setIsChecking(true);
    try {
      const next = await request();
      if (requestRevision !== revision.current) return null;
      setResult(next);
      return next.blockingConflicts.length ? null : next;
    } catch (error) {
      if (requestRevision === revision.current) captureError(error);
      return null;
    } finally {
      if (requestRevision === revision.current) setIsChecking(false);
    }
  }
  return { result, error, isChecking, check, clear, captureError };
}

export function ScheduleConflictFeedback({
  result,
  error,
}: {
  result?: ScheduleConflictResult | null;
  error?: string;
}) {
  if (error)
    return (
      <div role="alert" className={styles.feedback} data-tone="error">
        <AlertTriangle size={18} />
        <span>{error}</span>
      </div>
    );
  if (!result) return null;
  const blocked = result.blockingConflicts.length > 0;
  const entries = blocked ? result.blockingConflicts : result.warnings;
  return (
    <div
      role={entries.length ? "alert" : "status"}
      className={styles.feedback}
      data-tone={blocked ? "error" : entries.length ? "warning" : "success"}
    >
      {entries.length ? <AlertTriangle size={18} /> : <CircleCheck size={18} />}
      <div>
        <strong>
          {blocked
            ? "Trùng lịch, vui lòng chọn giờ khác"
            : entries.length
              ? "Trùng lịch tạm, vẫn có thể lưu lịch cố định"
              : "Không có lịch trùng"}
        </strong>
        {entries.length ? (
          <ul>
            {entries.map((item, i) => (
              <li key={`${item.scheduleId}-${i}`}>{item.message}</li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
