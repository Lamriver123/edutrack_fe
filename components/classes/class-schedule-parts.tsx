"use client";

import {
  Ban,
  CalendarCheck,
  CalendarDays,
  CalendarPlus,
  Check,
  ChevronDown,
  Clock,
  FileText,
  LoaderCircle,
  Moon,
  RefreshCw,
  Save,
  Sun,
  Sunrise,
  Undo2,
  UserRound,
} from "lucide-react";
import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties, Dispatch, ReactNode, SetStateAction } from "react";
import { createPortal } from "react-dom";
import type {
  ClassScheduleSlot,
  ClassTemporarySchedule,
  CreateTemporarySchedulePayload,
  LatestFixedSchedule,
  ScheduleOverrideAction,
  TeacherScheduleDay,
  TeacherScheduleEvent,
  TeacherScheduleEventType,
} from "@/types/school";
import {
  EmptyState,
  PrimaryAction,
  SecondaryAction,
  TextArea,
} from "./classroom-ui";
import { getClassColorTheme } from "./classroom-utils";
import formStyles from "./classroom-manager.module.css";
import styles from "./class-schedule-tab.module.css";
export type FixedScheduleForm = {
  effectiveFrom: string;
  schedules: ClassScheduleSlot[];
};

export type TemporaryScheduleForm = {
  action: ScheduleOverrideAction;
  originalDate: string;
  originalStartTime?: string;
  originalEndTime?: string;
  newDate: string;
  startTime: string;
  endTime: string;
  reason: string;
};

export type LessonContentForm = {
  topic: string;
  content: string;
};

export type ScheduleConfirmAction =
  | { type: "fixed" }
  | { type: "temporary" }
  | { scheduleId: string; type: "revoke" }
  | { type: "lessonContent" }
  | { type: "lessonAdjustment" };

export type SelectOption = {
  icon?: ReactNode;
  label: string;
  value: string;
};

export type SessionPeriodValue =
  "morning" | "afternoon" | "evening" | "unknown";

export type SchedulePeriod = {
  label: string;
  timeHint: string;
  value: SessionPeriodValue;
};

export const emptySlot: ClassScheduleSlot = {
  dayOfWeek: 1,
  startTime: "",
  endTime: "",
};

export const initialFixedForm: FixedScheduleForm = {
  effectiveFrom: "",
  schedules: [emptySlot],
};

export const initialTemporaryForm: TemporaryScheduleForm = {
  action: "extra",
  originalDate: "",
  newDate: "",
  startTime: "",
  endTime: "",
  reason: "",
};

export const initialLessonForm: LessonContentForm = {
  topic: "",
  content: "",
};

export const dayOptions: SelectOption[] = [
  { label: "Thứ 2", value: "1" },
  { label: "Thứ 3", value: "2" },
  { label: "Thứ 4", value: "3" },
  { label: "Thứ 5", value: "4" },
  { label: "Thứ 6", value: "5" },
  { label: "Thứ 7", value: "6" },
  { label: "Chủ nhật", value: "7" },
];

export const actionOptions: SelectOption[] = [
  { icon: <CalendarPlus size={15} />, label: "Buổi học thêm", value: "extra" },
  {
    icon: <UserRound size={15} />,
    label: "Học kèm 1:1",
    value: "one_on_one",
  },
  { icon: <RefreshCw size={15} />, label: "Dời lịch", value: "reschedule" },
  { icon: <Ban size={15} />, label: "Hủy buổi", value: "cancel" },
];

export const calendarPeriods: SchedulePeriod[] = [
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

export const unknownPeriod: SchedulePeriod = {
  label: "Chưa rõ",
  timeHint: "Chưa có giờ",
  value: "unknown",
};

const eventPalettes: Record<
  TeacherScheduleEventType,
  {
    accent: string;
    background: string;
    border: string;
    text: string;
  }
> = {
  cancel: {
    accent: "#ef4444",
    background: "#fff1f2",
    border: "#fecdd3",
    text: "#991b1b",
  },
  extra: {
    accent: "#0f766e",
    background: "#ecfdf5",
    border: "#99f6e4",
    text: "#134e4a",
  },
  fixed: {
    accent: "#4f46e5",
    background: "#eef2ff",
    border: "#c7d2fe",
    text: "#312e81",
  },
  manual: {
    accent: "#475569",
    background: "#f8fafc",
    border: "#cbd5e1",
    text: "#1e293b",
  },
  one_on_one: {
    accent: "#db2777",
    background: "#fdf2f8",
    border: "#fbcfe8",
    text: "#831843",
  },
  reschedule: {
    accent: "#f59e0b",
    background: "#fffbeb",
    border: "#fde68a",
    text: "#78350f",
  },
};

const VIETNAM_TIMEZONE_OFFSET_MS = 7 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const SELECT_MENU_GAP = 8;
const SELECT_MENU_MAX_HEIGHT = 252;
const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

const dateFormatter = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  timeZone: "Asia/Ho_Chi_Minh",
  year: "numeric",
});

const dateInputFormatter = new Intl.DateTimeFormat("en-US", {
  day: "2-digit",
  month: "2-digit",
  timeZone: "Asia/Ho_Chi_Minh",
  year: "numeric",
});
export function SummaryItem({
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

export function CurrentFixedSchedule({
  schedule,
  isSuspended,
  onSuspend,
  onResume,
}: {
  schedule: LatestFixedSchedule | null;
  isSuspended?: boolean;
  onSuspend?: () => void;
  onResume?: () => void;
}) {
  if (!schedule?.schedules.length) {
    return (
      <EmptyState
        icon={<CalendarDays size={22} />}
        text="Chưa có ca học cố định."
      />
    );
  }

  return (
    <section className={styles.fixedPreview}>
      <div>
        <span className={styles.previewLabel}>Lịch cố định hiện tại</span>
        <strong>
          Phiên bản {schedule.version}, áp dụng từ{" "}
          {formatDate(schedule.effectiveFrom)}
        </strong>
      </div>
      <div className={styles.fixedSlotPills}>
        {schedule.schedules.map((slot, index) => (
          <span
            className={styles.fixedSlotPill}
            key={`${slot.dayOfWeek}-${slot.startTime}-${slot.endTime}-${index}`}
          >
            <Clock size={14} />
            {getDayLabel(slot.dayOfWeek)} {slot.startTime} - {slot.endTime}
          </span>
        ))}
      </div>
      {(onSuspend || onResume) && (
        <div className={styles.fixedSlotActions} style={{ marginTop: "1rem", display: "flex", gap: "0.5rem" }}>
          {isSuspended ? (
            <>
              <span className={styles.previewLabel} style={{ color: "var(--red-600)", alignSelf: "center", marginRight: "1rem" }}>
                Đang tạm hoãn
              </span>
              <PrimaryAction onClick={onResume} type="button">
                Khôi phục lịch
              </PrimaryAction>
            </>
          ) : (
            <SecondaryAction className={styles.dangerButton} onClick={onSuspend} type="button">
              Tạm hoãn lịch
            </SecondaryAction>
          )}
        </div>
      )}
    </section>
  );
}

export function WeekCalendar({
  days,
  eventsByDateAndPeriod,
  onEventSelect,
  periods,
}: {
  days: TeacherScheduleDay[];
  eventsByDateAndPeriod: Map<string, TeacherScheduleEvent[]>;
  onEventSelect: (event: TeacherScheduleEvent) => void;
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
                onEventSelect={onEventSelect}
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
                <section
                  className={styles.mobilePeriodBlock}
                  key={period.value}
                >
                  <PeriodHeader period={period} />
                  <CalendarCell
                    day={day}
                    events={
                      eventsByDateAndPeriod.get(
                        getCalendarCellKey(day.date, period.value),
                      ) ?? []
                    }
                    onEventSelect={onEventSelect}
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
  onEventSelect,
  period,
}: {
  day: TeacherScheduleDay;
  events: TeacherScheduleEvent[];
  onEventSelect: (event: TeacherScheduleEvent) => void;
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
            onSelect={() => onEventSelect(event)}
          />
        ))
      ) : (
        <div
          aria-label={`Không có lịch ${period.label.toLowerCase()} ngày ${formatDate(
            day.date,
          )}`}
          className={styles.emptySlot}
        >
          Trống
        </div>
      )}
    </div>
  );
}

function ScheduleEventCard({
  event,
  onSelect,
}: {
  event: TeacherScheduleEvent;
  onSelect: () => void;
}) {
  const lessonContent = getLessonContent(event);
  const lessonTitle = event.topic?.trim();

  return (
    <button
      className={styles.eventCard}
      data-type={event.type}
      onClick={onSelect}
      style={getEventStyle(event)}
      type="button"
    >
      <span className={styles.eventTopLine}>
        <span className={styles.eventTime}>
          <Clock size={13} />
          {formatTimeRange(event)}
        </span>
        <span className={styles.eventBadge}>
          {getEventIcon(event.type)}
          {getEventLabel(event.type)}
        </span>
      </span>
      <strong className={styles.eventTitle}>{event.className}</strong>
      <span className={styles.eventLesson}>
        <span className={styles.eventLessonIcon}>
          <FileText size={13} />
        </span>
        <span className={styles.eventLessonText}>
          {lessonTitle ? <strong>{lessonTitle}</strong> : null}
          <span>{lessonContent}</span>
        </span>
      </span>
      {event.type === "reschedule" && event.originalDate ? (
        <span className={styles.eventReason}>
          Dời từ {formatDate(event.originalDate)}
        </span>
      ) : null}
      {event.reason ? (
        <span className={styles.eventReason}>{event.reason}</span>
      ) : null}
    </button>
  );
}

export function TemporarySchedulePanel({
  isRevoking,
  onEdit,
  onRevoke,
  schedules,
}: {
  isRevoking: boolean;
  onEdit: (schedule: ClassTemporarySchedule) => void;
  onRevoke: (scheduleId: string) => void;
  schedules: ClassTemporarySchedule[];
}) {
  return (
    <section className={styles.temporaryPanel}>
      <div className={styles.sectionHeader}>
        <div>
          <span className={styles.previewLabel}>Lịch tạm trong tuần</span>
          <h4>Lịch có thể điều chỉnh</h4>
        </div>
      </div>

      {schedules.length ? (
        <div className={styles.temporaryList}>
          {schedules.map((schedule) => (
            <article className={styles.temporaryItem} key={schedule.id}>
              <div className={styles.temporaryItemMain}>
                <span className={styles.temporaryBadge}>
                  {getTemporaryIcon(schedule.action)}
                  {getActionLabel(schedule.action)}
                </span>
                <strong>{formatTemporarySchedule(schedule)}</strong>
                <p>{schedule.reason || "Chưa có lý do"}</p>
              </div>
              <div className={styles.temporaryActions}>
                <SecondaryAction
                  icon={<RefreshCw size={15} />}
                  onClick={() => onEdit(schedule)}
                  type="button"
                >
                  Sửa
                </SecondaryAction>
                <SecondaryAction
                  className={styles.dangerButton}
                  disabled={isRevoking}
                  icon={
                    isRevoking ? (
                      <LoaderCircle className="animate-spin" size={15} />
                    ) : (
                      <Undo2 size={15} />
                    )
                  }
                  onClick={() => onRevoke(schedule.id)}
                  type="button"
                >
                  Thu hồi
                </SecondaryAction>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<CalendarPlus size={22} />}
          text="Tuần này chưa có lịch tạm thời."
        />
      )}
    </section>
  );
}

export function LessonAdjustmentControls({
  event,
  form,
  isSaving,
  mode,
  onCancel,
  onChange,
  onModeChange,
  onSave,
}: {
  event: TeacherScheduleEvent;
  form: TemporaryScheduleForm;
  isSaving: boolean;
  mode: ScheduleOverrideAction | "";
  onCancel: () => void;
  onChange: Dispatch<SetStateAction<TemporaryScheduleForm>>;
  onModeChange: (mode: ScheduleOverrideAction) => void;
  onSave: () => void;
}) {
  if (event.type === "cancel") {
    return (
      <section className={styles.lessonActionsPanel}>
        <div className={styles.lessonActionsHeader}>
          <strong>Điều chỉnh lịch buổi này</strong>
          <p>Buổi học này đang được đánh dấu nghỉ.</p>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.lessonActionsPanel}>
      <div className={styles.lessonActionsHeader}>
        <strong>Điều chỉnh lịch buổi này</strong>
        <p>Dời lịch hoặc cho nghỉ sẽ tạo lịch tạm cho đúng buổi đang chọn.</p>
      </div>

      <div className={styles.lessonQuickActions}>
        <SecondaryAction
          className={mode === "reschedule" ? styles.activeAdjustButton : ""}
          icon={<RefreshCw size={15} />}
          onClick={() => onModeChange("reschedule")}
          type="button"
        >
          Dời lịch
        </SecondaryAction>
        <SecondaryAction
          className={`${styles.dangerButton} ${
            mode === "cancel" ? styles.activeDangerButton : ""
          }`}
          icon={<Ban size={15} />}
          onClick={() => onModeChange("cancel")}
          type="button"
        >
          Cho nghỉ
        </SecondaryAction>
      </div>

      {mode ? (
        <div className={styles.lessonAdjustmentForm}>
          <div className={styles.adjustmentSource}>
            Áp dụng cho {formatDate(form.originalDate)}
          </div>

          {mode === "reschedule" ? (
            <div className={styles.lessonAdjustmentGrid}>
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
            label={mode === "cancel" ? "Lý do nghỉ" : "Lý do dời lịch"}
            maxLength={300}
            onChange={(inputEvent) =>
              onChange((current) => ({
                ...current,
                reason: inputEvent.target.value,
              }))
            }
            placeholder="Nghỉ lễ, học kèm, đổi phòng học..."
            value={form.reason}
          />

          <div className={styles.lessonAdjustmentFooter}>
            <SecondaryAction onClick={onCancel} type="button">
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
              {mode === "cancel" ? "Cho nghỉ" : "Lưu lịch dời"}
            </PrimaryAction>
          </div>
        </div>
      ) : null}
    </section>
  );
}

export function CalendarSkeleton({
  days,
  periods,
}: {
  days: TeacherScheduleDay[];
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
        {days.map((day) => (
          <article className={styles.mobileDayCard} key={day.date}>
            <DayHeader day={day} />
            <div className={styles.mobilePeriodList}>
              {periods.map((period) => (
                <section
                  className={styles.mobilePeriodBlock}
                  key={period.value}
                >
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
    </>
  );
}

export function SelectField({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  value: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({});
  const menuRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const selectedOption = options.find((option) => option.value === value);
  const updateMenuPosition = useCallback(() => {
    const trigger = rootRef.current?.querySelector("button");

    if (!trigger) {
      return;
    }

    const rect = trigger.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom - SELECT_MENU_GAP;
    const spaceAbove = rect.top - SELECT_MENU_GAP;
    const shouldOpenUp =
      spaceBelow < SELECT_MENU_MAX_HEIGHT && spaceAbove > spaceBelow;
    const availableHeight = Math.max(
      132,
      Math.min(SELECT_MENU_MAX_HEIGHT, shouldOpenUp ? spaceAbove : spaceBelow),
    );

    setMenuStyle({
      left: rect.left,
      maxHeight: availableHeight,
      top: shouldOpenUp
        ? rect.top - SELECT_MENU_GAP - availableHeight
        : rect.bottom + SELECT_MENU_GAP,
      width: rect.width,
    });
  }, []);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node;

      if (
        !rootRef.current?.contains(target) &&
        !menuRef.current?.contains(target)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);

    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    updateMenuPosition();

    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);

    return () => {
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
    };
  }, [isOpen, updateMenuPosition]);

  return (
    <div className="grid min-w-0 gap-2" ref={rootRef}>
      <span className="text-[14px] font-bold text-[var(--neutral-600)] truncate">
        {label}
      </span>
      <div className={formStyles.scheduleSelect}>
        <button
          aria-expanded={isOpen}
          className={formStyles.scheduleSelectButton}
          data-open={isOpen}
          onClick={() => {
            if (!isOpen) {
              updateMenuPosition();
            }

            setIsOpen((current) => !current);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setIsOpen(false);
            }
          }}
          type="button"
        >
          <span className={formStyles.scheduleSelectValue}>
            {selectedOption?.icon}
            <span>{selectedOption?.label ?? "Chọn giá trị"}</span>
          </span>
          <ChevronDown
            className={formStyles.scheduleSelectChevron}
            data-open={isOpen}
            size={17}
          />
        </button>

        {isOpen && typeof document !== "undefined"
          ? createPortal(
              <div
                className={formStyles.scheduleSelectMenu}
                ref={menuRef}
                role="listbox"
                style={menuStyle}
              >
                {options.map((option) => {
                  const isSelected = option.value === value;

                  return (
                    <button
                      aria-selected={isSelected}
                      className={formStyles.scheduleSelectOption}
                      data-selected={isSelected}
                      key={option.value}
                      onClick={() => {
                        onChange(option.value);
                        setIsOpen(false);
                      }}
                      role="option"
                      type="button"
                    >
                      <span className={formStyles.scheduleSelectValue}>
                        {option.icon}
                        <span>{option.label}</span>
                      </span>
                      {isSelected ? <Check size={16} /> : null}
                    </button>
                  );
                })}
              </div>,
              document.body,
            )
          : null}
      </div>
    </div>
  );
}

export function DateField({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="grid min-w-0 gap-2">
      <span className="text-[14px] font-bold text-[var(--neutral-600)] truncate">
        {label}
      </span>
      <input
        className={`${formStyles.scheduleControl} min-w-0`}
        lang="vi-VN"
        onChange={(event) => onChange(event.target.value)}
        type="date"
        value={value}
      />
    </label>
  );
}

export function TimeField({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="grid min-w-0 gap-2">
      <span className="text-[14px] font-bold text-[var(--neutral-600)] truncate">
        {label}
      </span>
      <input
        className={`${formStyles.scheduleControl} min-w-0`}
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

export function buildFixedFormFromSchedule(
  schedule: LatestFixedSchedule | null,
): FixedScheduleForm {
  if (!schedule) {
    return initialFixedForm;
  }

  return {
    effectiveFrom: toDateInputValue(schedule.effectiveFrom),
    schedules: schedule.schedules.length
      ? schedule.schedules
      : [{ ...emptySlot }],
  };
}

export function buildTemporaryFormFromSchedule(
  schedule: ClassTemporarySchedule,
): TemporaryScheduleForm {
  return {
    action: schedule.action,
    originalDate: toDateInputValue(schedule.originalDate),
    originalStartTime: schedule.originalStartTime,
    originalEndTime: schedule.originalEndTime,
    newDate: toDateInputValue(schedule.newDate),
    startTime: schedule.startTime ?? "",
    endTime: schedule.endTime ?? "",
    reason: schedule.reason ?? "",
  };
}

export function buildTemporaryFormFromEvent(
  event: TeacherScheduleEvent,
  action: ScheduleOverrideAction,
): TemporaryScheduleForm {
  const originalDate =
    event.type === "reschedule"
      ? (event.originalDate ?? event.date)
      : event.date;

  return {
    action:
      (event.type === "extra" || event.type === "one_on_one") &&
      action === "reschedule"
        ? event.type
        : action,
    originalDate,
    originalStartTime:
      event.type === "fixed" ? event.startTime : event.originalStartTime,
    originalEndTime:
      event.type === "fixed" ? event.endTime : event.originalEndTime,
    newDate: action === "cancel" ? "" : event.date,
    startTime:
      (action === "cancel"
        ? (event.originalStartTime ?? event.startTime)
        : event.startTime) ?? "",
    endTime:
      (action === "cancel"
        ? (event.originalEndTime ?? event.endTime)
        : event.endTime) ?? "",
    reason: event.reason ?? "",
  };
}

export function validateFixedSchedule(form: FixedScheduleForm) {
  if (!form.effectiveFrom) {
    return "Vui lòng chọn ngày áp dụng lịch cố định.";
  }

  if (!form.schedules.length) {
    return "Vui lòng thêm ít nhất một ca học.";
  }

  for (const slot of form.schedules) {
    if (!slot.startTime || !slot.endTime) {
      return "Vui lòng nhập đầy đủ giờ bắt đầu và giờ kết thúc.";
    }

    if (!timePattern.test(slot.startTime) || !timePattern.test(slot.endTime)) {
      return "Vui lòng nhập giờ theo định dạng 24h HH:mm.";
    }

    if (slot.startTime >= slot.endTime) {
      return "Giờ bắt đầu phải nhỏ hơn giờ kết thúc.";
    }
  }

  return "";
}

export function buildTemporaryPayload(
  form: TemporaryScheduleForm,
): CreateTemporarySchedulePayload | string {
  if (form.action === "cancel") {
    if (!form.originalDate) {
      return "Vui lòng chọn ngày cần hủy.";
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
    if (form.action === "extra") {
      return "Vui lòng chọn ngày học thêm.";
    }

    return form.action === "one_on_one"
      ? "Vui lòng chọn ngày học kèm 1:1."
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
    originalDate: form.action === "reschedule" ? form.originalDate : undefined,
    originalStartTime:
      form.action === "reschedule" ? form.originalStartTime : undefined,
    originalEndTime:
      form.action === "reschedule" ? form.originalEndTime : undefined,
    newDate: form.newDate,
    startTime: form.startTime,
    endTime: form.endTime,
    reason: form.reason.trim() || undefined,
  };
}

function formatTemporarySchedule(schedule: ClassTemporarySchedule) {
  if (schedule.action === "cancel") {
    return `Hủy ${formatDate(schedule.originalDate)}`;
  }

  if (schedule.action === "reschedule") {
    return `${formatDate(schedule.originalDate)} sang ${formatDate(
      schedule.newDate,
    )} ${schedule.startTime}-${schedule.endTime}`;
  }

  return `${formatDate(schedule.newDate)} ${schedule.startTime}-${schedule.endTime}`;
}

export function getActionLabel(action: ScheduleOverrideAction) {
  if (action === "cancel") {
    return "Hủy buổi";
  }

  if (action === "reschedule") {
    return "Dời lịch";
  }

  if (action === "one_on_one") {
    return "Học kèm 1:1";
  }

  return "Học thêm";
}

function getTemporaryIcon(action: ScheduleOverrideAction) {
  if (action === "cancel") {
    return <Ban size={13} />;
  }

  if (action === "reschedule") {
    return <RefreshCw size={13} />;
  }

  if (action === "one_on_one") {
    return <UserRound size={13} />;
  }

  return <CalendarPlus size={13} />;
}

export function getEventStyle(event: TeacherScheduleEvent) {
  const palette =
    event.type === "cancel" || event.type === "one_on_one" || !event.colorHex
      ? eventPalettes[event.type]
      : getClassColorTheme(event.colorHex);

  return {
    "--event-accent": palette.accent,
    "--event-bg": palette.background,
    "--event-border": palette.border,
    "--event-text": palette.text,
  } as CSSProperties;
}

export function getEventIcon(type: TeacherScheduleEventType) {
  if (type === "cancel") {
    return <Ban size={12} />;
  }

  if (type === "extra") {
    return <CalendarPlus size={12} />;
  }

  if (type === "one_on_one") {
    return <UserRound size={12} />;
  }

  if (type === "reschedule") {
    return <RefreshCw size={12} />;
  }

  return <CalendarCheck size={12} />;
}

function getEventLabel(type: TeacherScheduleEventType) {
  if (type === "cancel") {
    return "Đã hủy";
  }

  if (type === "extra") {
    return "Học thêm";
  }

  if (type === "one_on_one") {
    return "Kèm 1:1";
  }

  if (type === "reschedule") {
    return "Dời lịch";
  }

  if (type === "manual") {
    return "Thủ công";
  }

  return "Cố định";
}

export function formatTimeRange(event: TeacherScheduleEvent) {
  if (!event.startTime || !event.endTime) {
    return "Chưa có giờ";
  }

  return `${event.startTime} - ${event.endTime}`;
}

function getLessonContent(event: TeacherScheduleEvent) {
  return (
    event.content?.trim() || event.lessonContent?.trim() || "Nội dung buổi học"
  );
}

export function getCalendarCellKey(date: string, period: SessionPeriodValue) {
  return `${date}:${period}`;
}

export function compareEventsByStartTime(
  firstEvent: TeacherScheduleEvent,
  secondEvent: TeacherScheduleEvent,
) {
  return (
    getTimeOrderValue(firstEvent.startTime) -
    getTimeOrderValue(secondEvent.startTime)
  );
}

function getTimeOrderValue(time?: string) {
  if (!time) {
    return Number.MAX_SAFE_INTEGER;
  }

  const [hour = "0", minute = "0"] = time.split(":");

  return Number(hour) * 60 + Number(minute);
}

export function getSessionPeriod(time?: string): {
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

export function mapEventTypeToScheduleType(type: TeacherScheduleEventType) {
  if (type === "fixed") {
    return "fixed";
  }

  if (type === "extra") {
    return "extra";
  }

  if (type === "one_on_one") {
    return "one_on_one";
  }

  if (type === "reschedule") {
    return "temporary";
  }

  return "manual";
}

export function isStandaloneTemporaryAction(action: ScheduleOverrideAction) {
  return action === "extra" || action === "one_on_one";
}

export function getTemporaryScheduleIdFromEvent(event: TeacherScheduleEvent) {
  if (event.type === "fixed") {
    return "";
  }

  return event.id.split(":")[1] ?? "";
}

export function isTemporaryScheduleInWeek(
  schedule: ClassTemporarySchedule,
  weekStartKey: string,
) {
  const weekEndKey = addDaysToDateKey(weekStartKey, 6);
  const dates = [
    toDateInputValue(schedule.originalDate),
    toDateInputValue(schedule.newDate),
  ].filter(Boolean);

  return dates.some((date) => date >= weekStartKey && date <= weekEndKey);
}

export function buildWeekDays(weekStartKey: string): TeacherScheduleDay[] {
  return Array.from({ length: 7 }, (_, index) => {
    const date = addDaysToDateKey(weekStartKey, index);

    return {
      date,
      dayOfWeek: index === 6 ? 7 : index + 1,
    };
  });
}

export function formatDate(value?: string) {
  if (!value) {
    return "Chưa có";
  }

  const date = parseVietnamDateKey(value) ?? new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Chưa có";
  }

  return dateFormatter.format(date);
}

function toDateInputValue(value?: string) {
  if (!value) {
    return "";
  }

  const date = parseVietnamDateKey(value) ?? new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const parts = dateInputFormatter.formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  return year && month && day ? `${year}-${month}-${day}` : "";
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

export function getCurrentWeekStartKey(): string {
  const currentDateKey = toVietnamDateKey(new Date());
  const currentDate = parseVietnamDateKey(currentDateKey);

  if (!currentDate) {
    return currentDateKey;
  }

  const dayOfWeek = getVietnamDayOfWeek(currentDate);

  return toVietnamDateKey(addDays(currentDate, -(dayOfWeek - 1)));
}

export function getWeekStartKey(dateKey: string): string {
  const date = parseVietnamDateKey(dateKey);

  if (!date) {
    return getCurrentWeekStartKey();
  }

  const dayOfWeek = getVietnamDayOfWeek(date);

  return toVietnamDateKey(addDays(date, -(dayOfWeek - 1)));
}

export function addDaysToDateKey(dateKey: string, days: number): string {
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

  return new Date(Date.UTC(year, month - 1, day) - VIETNAM_TIMEZONE_OFFSET_MS);
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

function getDayLabel(dayOfWeek: number) {
  if (dayOfWeek === 7) {
    return "Chủ nhật";
  }

  if (dayOfWeek >= 1 && dayOfWeek <= 6) {
    return `Thứ ${dayOfWeek + 1}`;
  }

  return "Ngày học";
}
