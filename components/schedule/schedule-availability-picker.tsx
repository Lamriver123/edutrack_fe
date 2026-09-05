"use client";

import { Clock, LoaderCircle, Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { schoolApi } from "@/lib/api/school";
import type {
  ScheduleAvailability,
  ScheduleAvailabilityPayload,
  ScheduleTimeSlot,
} from "@/types/school";
import { ScheduleConflictFeedback } from "./schedule-conflict-feedback";
import styles from "./schedule-planning.module.css";

type Context = Omit<
  ScheduleAvailabilityPayload,
  "duration" | "startTime" | "endTime"
>;
const minutes = (time: string) =>
  Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
const format = (value: number) =>
  `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;

function maskTime(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 4);
  return digits.length > 2
    ? `${digits.slice(0, 2)}:${digits.slice(2)}`
    : digits;
}

export function ScheduleAvailabilityPicker({
  context,
  onSelect,
  reservedSlots = [],
}: {
  context: Context;
  onSelect: (slot: ScheduleTimeSlot) => void;
  reservedSlots?: ScheduleTimeSlot[];
}) {
  const [expanded, setExpanded] = useState(false);
  const [duration, setDuration] = useState(90);
  const [startTime, setStartTime] = useState("06:00");
  const [endTime, setEndTime] = useState("22:00");
  const [result, setResult] = useState<{
    key: string;
    data: ScheduleAvailability;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const key = JSON.stringify({
    context,
    duration,
    startTime,
    endTime,
    reservedSlots,
  });
  const currentKey = useRef(key);
  useEffect(() => {
    currentKey.current = key;
  }, [key]);
  async function search() {
    const requestedKey = key;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const data = await schoolApi.getScheduleAvailability({
        ...context,
        duration,
        startTime,
        endTime,
      });
      if (currentKey.current === requestedKey)
        setResult({ key: requestedKey, data });
    } catch (error) {
      if (currentKey.current === requestedKey)
        setError(
          error instanceof Error ? error.message : "Không thể tìm giờ trống.",
        );
    } finally {
      setLoading(false);
    }
  }
  const data = result?.key === key ? result.data : null;
  let slots = data?.slots ?? [];
  for (const busy of reservedSlots.filter((s) => s.startTime && s.endTime)) {
    slots = slots.flatMap((s) => {
      if (s.startTime >= busy.endTime || busy.startTime >= s.endTime)
        return [s];
      return [
        { startTime: s.startTime, endTime: busy.startTime },
        { startTime: busy.endTime, endTime: s.endTime },
      ].filter(
        (part) => minutes(part.endTime) - minutes(part.startTime) >= duration,
      );
    });
  }
  return (
    <div className={styles.availability}>
      <button
        type="button"
        className={styles.textButton}
        aria-expanded={expanded}
        onClick={() => setExpanded(!expanded)}
      >
        <Search size={16} />
        Tìm giờ trống
      </button>
      {expanded ? (
        <div className={styles.availabilityBody}>
          <div className={styles.fields}>
            <label>
              Từ giờ
              <input
                aria-label="Tìm giờ trống từ giờ"
                type="text"
                inputMode="numeric"
                placeholder="06:00"
                maxLength={5}
                value={startTime}
                onChange={(e) => setStartTime(maskTime(e.target.value))}
              />
            </label>
            <label>
              Đến giờ
              <input
                aria-label="Tìm giờ trống đến giờ"
                type="text"
                inputMode="numeric"
                placeholder="22:00"
                maxLength={5}
                value={endTime}
                onChange={(e) => setEndTime(maskTime(e.target.value))}
              />
            </label>
            <label>
              Thời lượng (phút)
              <input
                type="number"
                min={1}
                max={1439}
                value={duration || ""}
                onChange={(e) => setDuration(Number(e.target.value))}
              />
            </label>
            <button
              type="button"
              disabled={loading || !context.date || duration < 1}
              onClick={() => void search()}
            >
              {loading ? (
                <LoaderCircle className="animate-spin" size={16} />
              ) : (
                <Search size={16} />
              )}
              Tìm
            </button>
          </div>
          {error ? <ScheduleConflictFeedback error={error} /> : null}
          {data ? (
            <>
              {slots.length ? (
                <div className={styles.slotList}>
                  {slots.map((slot) => (
                    <button
                      key={slot.startTime}
                      type="button"
                      title={`Chọn ${slot.startTime} - ${format(minutes(slot.startTime) + duration)}`}
                      onClick={() =>
                        onSelect({
                          startTime: slot.startTime,
                          endTime: format(minutes(slot.startTime) + duration),
                        })
                      }
                    >
                      <Clock size={16} />
                      <span>
                        {slot.startTime} - {slot.endTime}
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <p role="status">Không có khoảng trống đủ {duration} phút.</p>
              )}
              {data.warnings.length ? (
                <ScheduleConflictFeedback
                  result={{ blockingConflicts: [], warnings: data.warnings }}
                />
              ) : null}
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
