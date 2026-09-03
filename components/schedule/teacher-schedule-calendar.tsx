/* eslint-disable react-hooks/set-state-in-effect */

"use client";

import Link from "next/link";
import {
  Ban,
  BookOpenCheck,
  CalendarCheck,
  CalendarDays,
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  FileText,
  Layers,
  LoaderCircle,
  Moon,
  RefreshCw,
  Save,
  Sun,
  Sunrise,
} from "lucide-react";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import type {
  CSSProperties,
  Dispatch,
  ReactNode,
  SetStateAction,
} from "react";
import {
  ConfirmDialog,
  Modal,
  NoticeBanner,
  PrimaryAction,
  SecondaryAction,
  TextArea,
} from "@/components/classes/classroom-ui";
import { schoolApi } from "@/lib/api/school";
import type {
  CreateTemporarySchedulePayload,
  ScheduleOverrideAction,
  TeacherScheduleClass,
  TeacherScheduleDay,
  TeacherScheduleEvent,
  TeacherScheduleEventType,
  TeacherWeekSchedule,
} from "@/types/school";
import formStyles from "@/components/classes/classroom-manager.module.css";
import styles from "./teacher-schedule-calendar.module.css";

const VIETNAM_TIMEZONE_OFFSET_MS = 7 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

const eventPalettes = [
  {
    accent: "#4f46e5",
    background: "#eef2ff",
    border: "#c7d2fe",
    text: "#312e81",
  },
  {
    accent: "#0f766e",
    background: "#ecfdf5",
    border: "#99f6e4",
    text: "#134e4a",
  },
  {
    accent: "#c2410c",
    background: "#fff7ed",
    border: "#fed7aa",
    text: "#7c2d12",
  },
  {
    accent: "#be185d",
    background: "#fdf2f8",
    border: "#fbcfe8",
    text: "#831843",
  },
  {
    accent: "#0369a1",
    background: "#f0f9ff",
    border: "#bae6fd",
    text: "#0c4a6e",
  },
  {
    accent: "#7c3aed",
    background: "#f5f3ff",
    border: "#ddd6fe",
    text: "#4c1d95",
  },
  {
    accent: "#15803d",
    background: "#f0fdf4",
    border: "#bbf7d0",
    text: "#14532d",
  },
  {
    accent: "#475569",
    background: "#f8fafc",
    border: "#cbd5e1",
    text: "#1e293b",
  },
];

const dateFormatter = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  timeZone: "Asia/Ho_Chi_Minh",
  year: "numeric",
});

type SessionPeriodValue = "morning" | "afternoon" | "evening" | "unknown";

type SchedulePeriod = {
  label: string;
  timeHint: string;
  value: SessionPeriodValue;
};

const calendarPeriods: SchedulePeriod[] = [
  {
    label: "Sáng",
    timeHint: "Trước 12:00",
    value: "morning",
  },
  {
    label: "Chiều",
    timeHint: "12:00 - 17:59",
    value: "afternoon",
  },
  {
    label: "Tối",
    timeHint: "Từ 18:00",
    value: "evening",
  },
];

const unknownPeriod: SchedulePeriod = {
  label: "Chưa rõ",
  timeHint: "Chưa có giờ",
  value: "unknown",
};

type TemporaryScheduleForm = {
  action: ScheduleOverrideAction;
  originalDate: string;
  newDate: string;
  startTime: string;
  endTime: string;
  reason: string;
};

const initialTemporaryForm: TemporaryScheduleForm = {
  action: "reschedule",
  originalDate: "",
  newDate: "",
  startTime: "",
  endTime: "",
  reason: "",
};

export function TeacherScheduleCalendar() {
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
  const [isAdjustmentConfirmOpen, setIsAdjustmentConfirmOpen] =
    useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingTemporary, setIsSavingTemporary] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [notice, setNotice] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const loadSchedule = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const result = await schoolApi.getTeacherWeekSchedule(selectedWeekStart);
      setSchedule(result);
    } catch (error) {
      setSchedule(null);
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, [selectedWeekStart]);

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
  const temporaryEventCount =
    visibleEvents.filter((event) => event.type !== "fixed").length;
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
    setSelectedEvent(null);
    setAdjustmentMode("");
    setIsAdjustmentConfirmOpen(false);
    setTemporaryForm(initialTemporaryForm);
  }

  function beginAdjustment(action: ScheduleOverrideAction) {
    if (!selectedEvent) {
      return;
    }

    setAdjustmentMode(action);
    setTemporaryForm(buildTemporaryFormFromEvent(selectedEvent, action));
  }

  function cancelAdjustment() {
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

    setIsAdjustmentConfirmOpen(true);
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
            className={styles.iconButton}
            onClick={goToPreviousWeek}
            type="button"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            className={styles.textButton}
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
            className={styles.iconButton}
            onClick={goToNextWeek}
            type="button"
          >
            <ChevronRight size={18} />
          </button>
          <button
            className={styles.textButton}
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

      {errorMessage ? (
        <NoticeBanner
          notice={{ type: "error", text: errorMessage }}
          onClose={() => setErrorMessage("")}
        />
      ) : null}

      {notice ? (
        <NoticeBanner notice={notice} onClose={() => setNotice(null)} />
      ) : null}

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
          isSaving={isSavingTemporary}
          mode={adjustmentMode}
          onChange={setTemporaryForm}
          onCancelAdjustment={cancelAdjustment}
          onClose={closeEventDetail}
          onModeChange={beginAdjustment}
          onSave={() => void handleSaveAdjustment()}
        />
      ) : null}

      {isAdjustmentConfirmOpen && selectedEvent && adjustmentMode ? (
        <ConfirmDialog
          confirmText={adjustmentMode === "cancel" ? "Hủy lịch" : "Lưu lịch dời"}
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

function SummaryItem({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className={styles.summaryItem}>
      <span className={styles.summaryIcon}>{icon}</span>
      <span>
        <span className={styles.summaryLabel}>{label}</span>
        <strong className={styles.summaryValue}>{value}</strong>
      </span>
    </div>
  );
}

function ClassLegend({ classes }: { classes: TeacherScheduleClass[] }) {
  if (!classes.length) {
    return null;
  }

  return (
    <div className={styles.legend}>
      {classes.map((classroom) => (
        <span
          className={styles.legendItem}
          key={classroom.id}
          style={getEventStyle(classroom.colorIndex)}
          title={classroom.name}
        >
          <span className={styles.legendDot} />
          <span>{classroom.name}</span>
        </span>
      ))}
    </div>
  );
}

function WeekCalendar({
  days,
  eventsByDateAndPeriod,
  onEventView,
  periods,
}: {
  days: TeacherScheduleDay[];
  eventsByDateAndPeriod: Map<string, TeacherScheduleEvent[]>;
  onEventView: (event: TeacherScheduleEvent) => void;
  periods: SchedulePeriod[];
}) {
  return (
    <>
      <div className={styles.calendarGrid}>
        <div className={styles.cornerCell}>Buổi</div>
        {days.map((day) => (
          <DayHeader day={day} key={day.date} />
        ))}

        {periods.map((period) => (
          <Fragment key={period.value}>
            <PeriodHeader period={period} />
            {days.map((day) => (
              <CalendarCell
                day={day}
                events={
                  eventsByDateAndPeriod.get(
                    getCalendarCellKey(day.date, period.value),
                  ) ?? []
                }
                key={`${period.value}-${day.date}`}
                onEventView={onEventView}
                period={period}
              />
            ))}
          </Fragment>
        ))}
      </div>

      <div className={styles.mobileCalendarList}>
        {days.map((day) => (
          <article className={styles.mobileDayCard} key={day.date}>
            <DayHeader day={day} />
            <div className={styles.mobilePeriodList}>
              {periods.map((period) => (
                <section className={styles.mobilePeriodBlock} key={period.value}>
                  <PeriodHeader period={period} />
                  <CalendarCell
                    day={day}
                    events={
                      eventsByDateAndPeriod.get(
                        getCalendarCellKey(day.date, period.value),
                      ) ?? []
                    }
                    onEventView={onEventView}
                    period={period}
                  />
                </section>
              ))}
            </div>
          </article>
        ))}
      </div>
    </>
  );
}

function DayHeader({ day }: { day: TeacherScheduleDay }) {
  return (
    <header className={styles.dayHeader} data-today={isToday(day.date)}>
      <span className={styles.dayName}>{getDayLabel(day.dayOfWeek)}</span>
      <strong className={styles.dayDate}>{formatDate(day.date)}</strong>
    </header>
  );
}

function PeriodHeader({ period }: { period: SchedulePeriod }) {
  return (
    <div className={styles.periodHeader} data-period={period.value}>
      <span className={styles.periodIcon}>
        {getSessionPeriodIcon(period.value)}
      </span>
      <span className={styles.periodText}>
        <strong>{period.label}</strong>
        <small>{period.timeHint}</small>
      </span>
    </div>
  );
}

function CalendarCell({
  day,
  events,
  onEventView,
  period,
}: {
  day: TeacherScheduleDay;
  events: TeacherScheduleEvent[];
  onEventView: (event: TeacherScheduleEvent) => void;
  period: SchedulePeriod;
}) {
  return (
    <div
      aria-label={`${period.label} ${formatDate(day.date)}`}
      className={styles.periodCell}
    >
      {events.length ? (
        events.map((event) => (
          <ScheduleEventCard
            event={event}
            key={event.id}
            onView={() => onEventView(event)}
          />
        ))
      ) : (
        <div
          aria-label={`Không có lịch ${period.label.toLowerCase()} ngày ${formatDate(
            day.date,
          )}`}
          className={styles.emptySlot}
        />
      )}
    </div>
  );
}

function ScheduleEventCard({
  event,
  onView,
}: {
  event: TeacherScheduleEvent;
  onView: () => void;
}) {
  const eventLabel = getEventLabel(event);
  const lessonContent = getLessonContent(event);
  const lessonTitle = event.topic?.trim();

  return (
    <button
      aria-label={`Xem thông tin buổi học ${event.className} lúc ${formatTimeRange(
        event,
      )}`}
      className={styles.eventCard}
      data-type={event.type}
      onClick={onView}
      style={getEventStyle(event.colorIndex)}
      type="button"
    >
      <span className={styles.eventTopLine}>
        <span className={styles.eventTime}>
          <Clock size={13} />
          {formatTimeRange(event)}
        </span>
      </span>
      <strong className={styles.eventTitle}>{event.className}</strong>
      <span className={styles.eventLesson}>
        <span className={styles.eventLessonIcon}>
          <FileText size={13} />
        </span>
        <span className={styles.eventLessonText}>
          {lessonTitle ? (
            <strong>{lessonTitle}</strong>
          ) : null}
          <span>{lessonContent}</span>
        </span>
      </span>
      <span className={styles.eventMeta}>
        <span className={styles.eventBadge}>
          {getEventIcon(event.type)}
          {eventLabel}
        </span>
        {event.type === "reschedule" && event.originalDate ? (
          <span className={styles.eventBadge}>
            Từ {formatDate(event.originalDate)}
          </span>
        ) : null}
      </span>
      {event.reason ? (
        <span className={styles.eventReason}>{event.reason}</span>
      ) : null}
    </button>
  );
}

function ScheduleEventModal({
  event,
  form,
  isSaving,
  mode,
  onCancelAdjustment,
  onChange,
  onClose,
  onModeChange,
  onSave,
}: {
  event: TeacherScheduleEvent;
  form: TemporaryScheduleForm;
  isSaving: boolean;
  mode: ScheduleOverrideAction | "";
  onCancelAdjustment: () => void;
  onChange: Dispatch<SetStateAction<TemporaryScheduleForm>>;
  onClose: () => void;
  onModeChange: (mode: ScheduleOverrideAction) => void;
  onSave: () => void;
}) {
  return (
    <Modal onClose={onClose} title="Thông tin buổi học">
      <div className={styles.sessionModalBody}>
        <section className={styles.sessionSummary} style={getEventStyle(event.colorIndex)}>
          <span className={styles.sessionSummaryIcon}>
            {getEventIcon(event.type)}
          </span>
          <div className={styles.sessionSummaryText}>
            <strong>{event.className}</strong>
            <p>
              {formatDate(event.date)} - {formatTimeRange(event)}
            </p>
          </div>
          <Link className={styles.classDetailLink} href={`/classes/${event.classId}`}>
            <ExternalLink size={15} />
            Chi tiết lớp
          </Link>
        </section>

        <section className={styles.sessionInfoGrid}>
          <InfoBlock label="Trạng thái" value={getEventLabel(event)} />
          <InfoBlock label="Buổi học" value={getSessionPeriod(event.startTime).label} />
          <InfoBlock label="Ngày gốc" value={event.originalDate ? formatDate(event.originalDate) : "Không có"} />
        </section>

        <section className={styles.sessionContentBox}>
          <span>
            <FileText size={15} />
            Nội dung buổi học
          </span>
          {event.topic ? <strong>{event.topic}</strong> : null}
          <p>{getLessonContent(event)}</p>
          {event.reason ? <p>Lý do: {event.reason}</p> : null}
        </section>

        <section className={styles.adjustmentPanel}>
          <div className={styles.adjustmentHeader}>
            <strong>Điều chỉnh buổi học</strong>
            <p>Dời lịch hoặc cho nghỉ sẽ tạo lịch tạm ngay trên tuần đang xem.</p>
          </div>

          <div className={styles.adjustmentActions}>
            <SecondaryAction
              className={mode === "reschedule" ? styles.activeAdjustButton : ""}
              icon={<RefreshCw size={15} />}
              onClick={() => onModeChange("reschedule")}
              type="button"
            >
              Dời lịch
            </SecondaryAction>
            {event.type !== "cancel" ? (
              <SecondaryAction
                className={`${styles.dangerButton} ${
                  mode === "cancel" ? styles.activeDangerButton : ""
                }`}
                icon={<Ban size={15} />}
                onClick={() => onModeChange("cancel")}
                type="button"
              >
                Hủy lịch
              </SecondaryAction>
            ) : null}
          </div>

          {mode ? (
            <div className={styles.adjustmentForm}>
              <span className={styles.adjustmentSource}>
                Áp dụng cho {formatDate(form.originalDate)}
              </span>

              {mode === "reschedule" ? (
                <div className={styles.adjustmentGrid}>
                  <DateField
                    label="Ngày học mới"
                    onChange={(value) =>
                      onChange((current) => ({
                        ...current,
                        newDate: value,
                      }))
                    }
                    value={form.newDate}
                  />
                  <TimeField
                    label="Giờ bắt đầu"
                    onChange={(value) =>
                      onChange((current) => ({
                        ...current,
                        startTime: value,
                      }))
                    }
                    value={form.startTime}
                  />
                  <TimeField
                    label="Giờ kết thúc"
                    onChange={(value) =>
                      onChange((current) => ({
                        ...current,
                        endTime: value,
                      }))
                    }
                    value={form.endTime}
                  />
                </div>
              ) : null}

              <TextArea
                label={mode === "cancel" ? "Lý do hủy" : "Lý do dời lịch"}
                maxLength={300}
                onChange={(changeEvent) =>
                  onChange((current) => ({
                    ...current,
                    reason: changeEvent.target.value,
                  }))
                }
                placeholder="Nghỉ lễ, học bù, đổi phòng học..."
                value={form.reason}
              />

              <div className={styles.adjustmentFooter}>
                <SecondaryAction onClick={onCancelAdjustment} type="button">
                  Hủy thao tác
                </SecondaryAction>
                <PrimaryAction
                  disabled={isSaving}
                  icon={
                    isSaving ? (
                      <LoaderCircle className="animate-spin" size={16} />
                    ) : mode === "cancel" ? (
                      <Ban size={16} />
                    ) : (
                      <Save size={16} />
                    )
                  }
                  onClick={onSave}
                  type="button"
                >
                  {mode === "cancel" ? "Hủy lịch" : "Lưu lịch dời"}
                </PrimaryAction>
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </Modal>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.infoBlock}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function DateField({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-[14px] font-bold text-[var(--neutral-600)]">
        {label}
      </span>
      <input
        className={formStyles.scheduleControl}
        lang="vi-VN"
        onChange={(event) => onChange(event.target.value)}
        type="date"
        value={value}
      />
    </label>
  );
}

function TimeField({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-[14px] font-bold text-[var(--neutral-600)]">
        {label}
      </span>
      <input
        className={formStyles.scheduleControl}
        inputMode="numeric"
        lang="vi-VN"
        maxLength={5}
        onBlur={() => onChange(normalizeTimeOnBlur(value))}
        onChange={(event) => onChange(normalizeTimeInput(event.target.value))}
        pattern="[0-9]{2}:[0-9]{2}"
        placeholder="VD: 19:30"
        type="text"
        value={value}
      />
    </label>
  );
}

function CalendarSkeleton() {
  const skeletonDays = getSkeletonDays();

  return (
    <section className={styles.calendarFrame}>
      <div className={styles.calendarGrid}>
        <div className={styles.cornerCell}>Buổi</div>
        {skeletonDays.map((day) => (
          <DayHeader day={day} key={day.date} />
        ))}

        {calendarPeriods.map((period) => (
          <Fragment key={period.value}>
            <PeriodHeader period={period} />
            {skeletonDays.map((day) => (
              <div
                className={styles.periodCell}
                key={`${period.value}-${day.date}`}
              >
                <div className={styles.skeleton} />
              </div>
            ))}
          </Fragment>
        ))}
      </div>

      <div className={styles.mobileCalendarList}>
        {skeletonDays.map((day) => (
          <article className={styles.mobileDayCard} key={day.date}>
            <DayHeader day={day} />
            <div className={styles.mobilePeriodList}>
              {calendarPeriods.map((period) => (
                <section className={styles.mobilePeriodBlock} key={period.value}>
                  <PeriodHeader period={period} />
                  <div className={styles.periodCell}>
                    <div className={styles.skeleton} />
                  </div>
                </section>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function EmptyScheduleState() {
  return (
    <div className={styles.emptyState}>
      <div>
        <span className={styles.emptyIcon}>
          <CalendarPlus size={24} />
        </span>
        <h3 className={styles.emptyTitle}>Chưa có thời khóa biểu</h3>
        <p className={styles.emptyText}>
          Hãy tạo lịch cố định trong chi tiết lớp để lịch tuần hiển thị tại đây.
        </p>
      </div>
    </div>
  );
}

function getEventStyle(colorIndex: number) {
  const palette = eventPalettes[colorIndex % eventPalettes.length];

  return {
    "--event-accent": palette.accent,
    "--event-bg": palette.background,
    "--event-border": palette.border,
    "--event-text": palette.text,
  } as CSSProperties;
}

function getEventIcon(type: TeacherScheduleEventType) {
  if (type === "cancel") {
    return <Ban size={12} />;
  }

  if (type === "extra") {
    return <CalendarPlus size={12} />;
  }

  if (type === "reschedule") {
    return <RefreshCw size={12} />;
  }

  return <CalendarCheck size={12} />;
}

function getEventLabel(event: TeacherScheduleEvent) {
  if (event.type === "cancel") {
    return "Đã hủy";
  }

  if (event.type === "extra") {
    return "Học thêm";
  }

  if (event.type === "reschedule") {
    return "Dời lịch";
  }

  return "Cố định";
}

function formatTimeRange(event: TeacherScheduleEvent) {
  if (!event.startTime || !event.endTime) {
    return "Chưa có giờ";
  }

  return `${event.startTime} - ${event.endTime}`;
}

function getLessonContent(event: TeacherScheduleEvent) {
  return (
    event.content?.trim() ||
    event.lessonContent?.trim() ||
    "Nội dung buổi học"
  );
}

function buildTemporaryFormFromEvent(
  event: TeacherScheduleEvent,
  requestedAction: ScheduleOverrideAction,
): TemporaryScheduleForm {
  const originalDate =
    event.type === "reschedule" ? event.originalDate ?? event.date : event.date;
  const action =
    event.type === "extra" && requestedAction === "reschedule"
      ? "extra"
      : requestedAction;

  return {
    action,
    originalDate,
    newDate: requestedAction === "cancel" ? "" : event.date,
    startTime: event.startTime ?? "",
    endTime: event.endTime ?? "",
    reason: event.reason ?? "",
  };
}

function buildTemporaryPayload(
  form: TemporaryScheduleForm,
): CreateTemporarySchedulePayload | string {
  if (form.action === "cancel") {
    if (!form.originalDate) {
      return "Vui lòng chọn ngày cần hủy.";
    }

    const hasStartTime = Boolean(form.startTime);
    const hasEndTime = Boolean(form.endTime);

    if (hasStartTime !== hasEndTime) {
      return "Vui lòng nhập đầy đủ giờ bắt đầu và giờ kết thúc.";
    }

    if (
      hasStartTime &&
      (!timePattern.test(form.startTime) || !timePattern.test(form.endTime))
    ) {
      return "Vui lòng nhập giờ theo định dạng 24h HH:mm.";
    }

    if (hasStartTime && form.startTime >= form.endTime) {
      return "Giờ bắt đầu phải nhỏ hơn giờ kết thúc.";
    }

    return {
      action: form.action,
      endTime: form.endTime || undefined,
      originalDate: form.originalDate,
      reason: form.reason.trim() || undefined,
      startTime: form.startTime || undefined,
    };
  }

  if (!form.newDate) {
    return form.action === "extra"
      ? "Vui lòng chọn ngày học thêm."
      : "Vui lòng chọn ngày học mới.";
  }

  if (!form.startTime || !form.endTime) {
    return "Vui lòng nhập đầy đủ giờ bắt đầu và giờ kết thúc.";
  }

  if (!timePattern.test(form.startTime) || !timePattern.test(form.endTime)) {
    return "Vui lòng nhập giờ theo định dạng 24h HH:mm.";
  }

  if (form.startTime >= form.endTime) {
    return "Giờ bắt đầu phải nhỏ hơn giờ kết thúc.";
  }

  if (form.action === "reschedule" && !form.originalDate) {
    return "Vui lòng chọn ngày gốc.";
  }

  return {
    action: form.action,
    originalDate:
      form.action === "reschedule" ? form.originalDate : undefined,
    newDate: form.newDate,
    startTime: form.startTime,
    endTime: form.endTime,
    reason: form.reason.trim() || undefined,
  };
}

function getTemporaryScheduleIdFromEvent(event: TeacherScheduleEvent) {
  if (event.type === "fixed") {
    return "";
  }

  return event.id.split(":")[1] ?? "";
}

function getCalendarCellKey(date: string, period: SessionPeriodValue) {
  return `${date}:${period}`;
}

function compareEventsByStartTime(
  firstEvent: TeacherScheduleEvent,
  secondEvent: TeacherScheduleEvent,
) {
  return getTimeOrderValue(firstEvent.startTime) - getTimeOrderValue(secondEvent.startTime);
}

function getTimeOrderValue(time?: string) {
  if (!time) {
    return Number.MAX_SAFE_INTEGER;
  }

  const [hour = "0", minute = "0"] = time.split(":");

  return Number(hour) * 60 + Number(minute);
}

function getSessionPeriod(time?: string): {
  label: string;
  value: SessionPeriodValue;
} {
  const hour = time ? Number(time.slice(0, 2)) : Number.NaN;

  if (!Number.isFinite(hour)) {
    return {
      label: "Chưa có buổi",
      value: "unknown",
    };
  }

  if (hour < 12) {
    return {
      label: "Buổi sáng",
      value: "morning",
    };
  }

  if (hour < 18) {
    return {
      label: "Buổi chiều",
      value: "afternoon",
    };
  }

  return {
    label: "Buổi tối",
    value: "evening",
  };
}

function getSessionPeriodIcon(period: SessionPeriodValue) {
  if (period === "morning") {
    return <Sunrise size={12} />;
  }

  if (period === "afternoon") {
    return <Sun size={12} />;
  }

  if (period === "evening") {
    return <Moon size={12} />;
  }

  return <Clock size={12} />;
}

function getSkeletonDays(): TeacherScheduleDay[] {
  const weekStart = getCurrentWeekStartKey();

  return Array.from({ length: 7 }, (_, index) => ({
    date: addDaysToDateKey(weekStart, index),
    dayOfWeek: index === 6 ? 7 : index + 1,
  }));
}

function getDayLabel(dayOfWeek: number) {
  if (dayOfWeek === 7) {
    return "Chủ nhật";
  }

  return `Thứ ${dayOfWeek + 1}`;
}

function formatDate(value: string) {
  const date = parseVietnamDateKey(value);

  if (!date) {
    return value;
  }

  return dateFormatter.format(date);
}

function getCurrentWeekStartKey(): string {
  const currentDateKey = toVietnamDateKey(new Date());
  const currentDate = parseVietnamDateKey(currentDateKey);

  if (!currentDate) {
    return currentDateKey;
  }

  const dayOfWeek = getVietnamDayOfWeek(currentDate);

  return toVietnamDateKey(addDays(currentDate, -(dayOfWeek - 1)));
}

function getWeekStartKey(dateKey: string): string {
  const date = parseVietnamDateKey(dateKey);

  if (!date) {
    return getCurrentWeekStartKey();
  }

  const dayOfWeek = getVietnamDayOfWeek(date);

  return toVietnamDateKey(addDays(date, -(dayOfWeek - 1)));
}

function addDaysToDateKey(dateKey: string, days: number): string {
  const date = parseVietnamDateKey(dateKey);

  if (!date) {
    return getCurrentWeekStartKey();
  }

  return toVietnamDateKey(addDays(date, days));
}

function isToday(dateKey: string) {
  return dateKey === toVietnamDateKey(new Date());
}

function parseVietnamDateKey(value: string) {
  const match = DATE_ONLY_PATTERN.exec(value.trim());

  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const utcDate = new Date(Date.UTC(year, month - 1, day));

  if (
    utcDate.getUTCFullYear() !== year ||
    utcDate.getUTCMonth() !== month - 1 ||
    utcDate.getUTCDate() !== day
  ) {
    return null;
  }

  return new Date(
    Date.UTC(year, month - 1, day) - VIETNAM_TIMEZONE_OFFSET_MS,
  );
}

function getVietnamDayOfWeek(date: Date) {
  const vietnamDate = new Date(date.getTime() + VIETNAM_TIMEZONE_OFFSET_MS);
  const utcDay = vietnamDate.getUTCDay();

  return utcDay === 0 ? 7 : utcDay;
}

function toVietnamDateKey(date: Date) {
  const vietnamDate = new Date(date.getTime() + VIETNAM_TIMEZONE_OFFSET_MS);
  const year = vietnamDate.getUTCFullYear();
  const month = String(vietnamDate.getUTCMonth() + 1).padStart(2, "0");
  const day = String(vietnamDate.getUTCDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * DAY_MS);
}

function normalizeTimeInput(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 4);

  if (digits.length <= 2) {
    return digits;
  }

  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

function normalizeTimeOnBlur(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 4);

  if (digits.length === 3) {
    return `0${digits.slice(0, 1)}:${digits.slice(1)}`;
  }

  if (digits.length === 4) {
    return `${digits.slice(0, 2)}:${digits.slice(2)}`;
  }

  return value;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Không thể tải thời khóa biểu.";
}
