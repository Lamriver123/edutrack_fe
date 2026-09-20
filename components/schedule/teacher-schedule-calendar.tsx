/* eslint-disable react-hooks/set-state-in-effect */

"use client";

import {
  BookOpenCheck,
  CalendarCheck,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  Layers,
  LoaderCircle,
  RefreshCw,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ConfirmDialog } from "@/components/classes/classroom-ui";
import { schoolApi } from "@/lib/api/school";
import {
  ScheduleConflictFeedback,
  useScheduleCheck,
} from "./schedule-conflict-feedback";
import type {
  ScheduleOverrideAction,
  TeacherScheduleEvent,
  TeacherWeekSchedule,
} from "@/types/school";
import styles from "./teacher-schedule-calendar.module.css";
import { useNotice } from "@/components/ui/notice-provider";
import {
  CalendarSkeleton,
  ClassLegend,
  EmptyScheduleState,
  ScheduleEventModal,
  SummaryItem,
  WeekCalendar,
  addDaysToDateKey,
  buildTemporaryFormFromEvent,
  buildTemporaryPayload,
  calendarPeriods,
  compareEventsByStartTime,
  formatDate,
  getCalendarCellKey,
  getCurrentWeekStartKey,
  getErrorMessage,
  getSessionPeriod,
  getTemporaryScheduleIdFromEvent,
  getWeekStartKey,
  initialTemporaryForm,
  unknownPeriod,
  type TemporaryScheduleForm,
} from "./teacher-schedule-parts";

export function TeacherScheduleCalendar() {
  const scheduleCheck = useScheduleCheck();
  const [selectedWeekStart, setSelectedWeekStart] = useState<string>(() =>
    getCurrentWeekStartKey(),
  );
  const [schedule, setSchedule] = useState<TeacherWeekSchedule | null>(null);
  const [selectedEvent, setSelectedEvent] =
    useState<TeacherScheduleEvent | null>(null);
  const [temporaryForm, setTemporaryForm] =
    useState<TemporaryScheduleForm>(initialTemporaryForm);
  const [adjustmentMode, setAdjustmentMode] = useState<
    ScheduleOverrideAction | ""
  >("");
  const [isAdjustmentConfirmOpen, setIsAdjustmentConfirmOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingTemporary, setIsSavingTemporary] = useState(false);
  const { setNotice } = useNotice();

  const loadSchedule = useCallback(async () => {
    setIsLoading(true);

    try {
      const result = await schoolApi.getTeacherWeekSchedule(selectedWeekStart);
      setSchedule(result);
    } catch (error) {
      setSchedule(null);
      setNotice({ type: "error", text: getErrorMessage(error) });
    } finally {
      setIsLoading(false);
    }
  }, [selectedWeekStart, setNotice]);

  useEffect(() => {
    void loadSchedule();
  }, [loadSchedule]);

  const visibleEvents = useMemo(
    () => (schedule?.events ?? []).filter((event) => event.type !== "cancel"),
    [schedule],
  );
  const eventsByDateAndPeriod = useMemo(() => {
    const eventMap = new Map<string, TeacherScheduleEvent[]>();

    for (const event of visibleEvents) {
      const period = getSessionPeriod(event.startTime).value;
      const key = getCalendarCellKey(event.date, period);

      eventMap.set(key, [...(eventMap.get(key) ?? []), event]);
    }

    for (const events of eventMap.values()) {
      events.sort(compareEventsByStartTime);
    }

    return eventMap;
  }, [visibleEvents]);
  const visiblePeriods = useMemo(() => {
    const hasUnknownEvent = visibleEvents.some(
      (event) => getSessionPeriod(event.startTime).value === "unknown",
    );

    return hasUnknownEvent
      ? [...calendarPeriods, unknownPeriod]
      : calendarPeriods;
  }, [visibleEvents]);

  const activeEventCount = visibleEvents.length;
  const temporaryEventCount = visibleEvents.filter(
    (event) => event.type !== "fixed",
  ).length;
  const weekRange = schedule
    ? `${formatDate(schedule.weekStart)} - ${formatDate(schedule.weekEnd)}`
    : `${formatDate(selectedWeekStart)} - ${formatDate(
        addDaysToDateKey(selectedWeekStart, 6),
      )}`;

  function goToPreviousWeek() {
    setSelectedWeekStart((current) => addDaysToDateKey(current, -7));
  }

  function goToNextWeek() {
    setSelectedWeekStart((current) => addDaysToDateKey(current, 7));
  }

  function goToCurrentWeek() {
    setSelectedWeekStart(getCurrentWeekStartKey());
  }

  function handleSelectDate(value: string) {
    if (!value) {
      return;
    }

    setSelectedWeekStart(getWeekStartKey(value));
  }

  function openEventDetail(event: TeacherScheduleEvent) {
    setSelectedEvent(event);
    setAdjustmentMode("");
    setTemporaryForm(initialTemporaryForm);
  }

  function closeEventDetail() {
    scheduleCheck.clear();
    setSelectedEvent(null);
    setAdjustmentMode("");
    setIsAdjustmentConfirmOpen(false);
    setTemporaryForm(initialTemporaryForm);
  }

  function beginAdjustment(action: ScheduleOverrideAction) {
    if (!selectedEvent) {
      return;
    }

    scheduleCheck.clear();
    setAdjustmentMode(action);
    setTemporaryForm(buildTemporaryFormFromEvent(selectedEvent, action));
  }

  function cancelAdjustment() {
    scheduleCheck.clear();
    setAdjustmentMode("");
    setIsAdjustmentConfirmOpen(false);
    setTemporaryForm(initialTemporaryForm);
  }

  async function handleSaveAdjustment() {
    if (!selectedEvent || !adjustmentMode) {
      return;
    }

    const payload = buildTemporaryPayload(temporaryForm);

    if (typeof payload === "string") {
      setNotice({ type: "error", text: payload });
      return;
    }

    const result = await scheduleCheck.check(() =>
      schoolApi.checkTemporarySchedule(
        selectedEvent.classId,
        payload,
        getTemporaryScheduleIdFromEvent(selectedEvent) || undefined,
      ),
    );
    if (result) setIsAdjustmentConfirmOpen(true);
  }

  async function executeSaveAdjustment() {
    if (!selectedEvent || !adjustmentMode) {
      setIsAdjustmentConfirmOpen(false);
      return;
    }

    const payload = buildTemporaryPayload(temporaryForm);

    if (typeof payload === "string") {
      setNotice({ type: "error", text: payload });
      setIsAdjustmentConfirmOpen(false);
      return;
    }

    setIsSavingTemporary(true);
    setNotice(null);

    try {
      const scheduleId = getTemporaryScheduleIdFromEvent(selectedEvent);

      if (scheduleId) {
        await schoolApi.updateTemporarySchedule(
          selectedEvent.classId,
          scheduleId,
          payload,
        );
        setNotice({ type: "success", text: "Đã cập nhật lịch tạm thời." });
      } else {
        await schoolApi.createTemporarySchedule(selectedEvent.classId, payload);
        setNotice({ type: "success", text: "Đã tạo lịch tạm thời." });
      }

      closeEventDetail();
      await loadSchedule();
    } catch (error) {
      scheduleCheck.captureError(error);
      setNotice({ type: "error", text: getErrorMessage(error) });
      setIsAdjustmentConfirmOpen(false);
    } finally {
      setIsSavingTemporary(false);
    }
  }

  return (
    <section className={styles.workspace}>
      <div className={styles.toolbar}>
        <div>
          <span className={styles.eyebrow}>
            <CalendarDays size={15} />
            Lịch giảng dạy
          </span>
          <h2 className={styles.title}>Thời khóa biểu tuần</h2>
          <p className={styles.subtitle}>{weekRange}</p>
        </div>

        <div className={styles.controls}>
          <button
            aria-label="Tuần trước"
            className={`${styles.iconButton} ${styles.previousButton}`}
            onClick={goToPreviousWeek}
            type="button"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            className={`${styles.textButton} ${styles.todayButton}`}
            onClick={goToCurrentWeek}
            type="button"
          >
            <CalendarCheck size={16} />
            Tuần này
          </button>
          <label className={styles.datePicker}>
            <CalendarDays size={16} />
            <input
              lang="vi-VN"
              onChange={(event) => handleSelectDate(event.target.value)}
              type="date"
              value={selectedWeekStart}
            />
          </label>
          <button
            aria-label="Tuần sau"
            className={`${styles.iconButton} ${styles.nextButton}`}
            onClick={goToNextWeek}
            type="button"
          >
            <ChevronRight size={18} />
          </button>
          <button
            className={`${styles.textButton} ${styles.reloadButton}`}
            onClick={() => void loadSchedule()}
            type="button"
          >
            {isLoading ? (
              <LoaderCircle className="animate-spin" size={16} />
            ) : (
              <RefreshCw size={16} />
            )}
            Tải lại
          </button>
        </div>
      </div>

      <div className={styles.summaryGrid}>
        <SummaryItem
          icon={<BookOpenCheck size={19} />}
          label="Lớp đang quản lý"
          value={String(schedule?.classes.length ?? 0)}
        />
        <SummaryItem
          icon={<Clock size={19} />}
          label="Buổi trong tuần"
          value={String(activeEventCount)}
        />
        <SummaryItem
          icon={<Layers size={19} />}
          label="Lịch tạm"
          value={String(temporaryEventCount)}
        />
      </div>

      {isLoading && !schedule ? (
        <CalendarSkeleton />
      ) : schedule ? (
        <>
          <ClassLegend classes={schedule.classes} />
          <section className={styles.calendarFrame}>
            {visibleEvents.length || schedule.classes.length ? (
              <WeekCalendar
                days={schedule.days}
                eventsByDateAndPeriod={eventsByDateAndPeriod}
                onEventView={openEventDetail}
                periods={visiblePeriods}
              />
            ) : (
              <EmptyScheduleState />
            )}
          </section>
        </>
      ) : (
        <EmptyScheduleState />
      )}

      {selectedEvent ? (
        <ScheduleEventModal
          event={selectedEvent}
          form={temporaryForm}
          isSaving={isSavingTemporary || scheduleCheck.isChecking}
          mode={adjustmentMode}
          onChange={(value) => {
            scheduleCheck.clear();
            setTemporaryForm(value);
          }}
          feedback={
            <ScheduleConflictFeedback
              result={scheduleCheck.result}
              error={scheduleCheck.error}
            />
          }
          onCancelAdjustment={cancelAdjustment}
          onClose={closeEventDetail}
          onModeChange={beginAdjustment}
          onSave={() => void handleSaveAdjustment()}
        />
      ) : null}

      {isAdjustmentConfirmOpen && selectedEvent && adjustmentMode ? (
        <ConfirmDialog
          confirmText={
            adjustmentMode === "cancel" ? "Hủy lịch" : "Lưu lịch dời"
          }
          description={`Bạn sắp ${
            adjustmentMode === "cancel" ? "hủy" : "dời"
          } buổi học ${formatDate(selectedEvent.date)} của lớp ${
            selectedEvent.className
          }.`}
          isLoading={isSavingTemporary}
          onCancel={() => setIsAdjustmentConfirmOpen(false)}
          onConfirm={() => void executeSaveAdjustment()}
          title={
            adjustmentMode === "cancel"
              ? "Xác nhận hủy lịch"
              : "Xác nhận dời lịch"
          }
          tone={adjustmentMode === "cancel" ? "danger" : "default"}
        />
      ) : null}
    </section>
  );
}
