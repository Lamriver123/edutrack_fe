"use client";

import { useEffect, useId, useState } from "react";
import { schoolApi } from "@/lib/api/school";
import type { ScheduleTimeSlot } from "@/types/school";
import styles from "./schedule-planning.module.css";

export function ScheduleSourcePicker({
  classId,
  date,
  ignoreOverrideId,
  startTime,
  endTime,
  onChange,
}: {
  classId: string;
  date: string;
  ignoreOverrideId?: string;
  startTime?: string;
  endTime?: string;
  onChange: (slot: ScheduleTimeSlot) => void;
}) {
  const groupName = useId();
  const [state, setState] = useState<{
    key: string;
    slots: ScheduleTimeSlot[];
    error?: string;
  } | null>(null);
  const key = `${classId}:${date}:${ignoreOverrideId}`;
  useEffect(() => {
    if (!date) return;
    let active = true;
    schoolApi
      .getScheduleSourceSlots(classId, date, ignoreOverrideId)
      .then((slots) => {
        if (active) setState({ key, slots });
      })
      .catch((error: unknown) => {
        if (active)
          setState({
            key,
            slots: [],
            error:
              error instanceof Error
                ? error.message
                : "Không tải được tiết gốc.",
          });
      });
    return () => {
      active = false;
    };
  }, [classId, date, ignoreOverrideId, key]);
  const current = state?.key === key ? state : null;
  return (
    <fieldset className={styles.sources}>
      <legend>Tiết gốc cần dời</legend>
      {!date ? (
        <p>Chọn ngày gốc.</p>
      ) : !current ? (
        <p role="status">Đang tải tiết học...</p>
      ) : current.error ? (
        <p role="alert">{current.error}</p>
      ) : !current.slots.length ? (
        <p>Không có tiết cố định khả dụng trong ngày này.</p>
      ) : (
        <div className={styles.slotList}>
          {current.slots.map((slot) => (
            <label
              className={styles.slotChoice}
              key={`${slot.startTime}-${slot.endTime}`}
            >
              <input
                type="radio"
                name={groupName}
                checked={
                  slot.startTime === startTime && slot.endTime === endTime
                }
                onChange={() => onChange(slot)}
              />
              {slot.startTime} - {slot.endTime}
            </label>
          ))}
        </div>
      )}
    </fieldset>
  );
}
