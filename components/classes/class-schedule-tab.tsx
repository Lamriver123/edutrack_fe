/* eslint-disable react-hooks/set-state-in-effect */

"use client";

import {
  Ban,
  BookOpenCheck,
  CalendarCheck,
  CalendarDays,
  CalendarPlus,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileText,
  Layers,
  LoaderCircle,
  Moon,
  Plus,
  RefreshCw,
  Save,
  Sun,
  Sunrise,
  Trash2,
  Undo2,
} from "lucide-react";
import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  CSSProperties,
  Dispatch,
  FormEvent,
  ReactNode,
  SetStateAction,
} from "react";
import { createPortal } from "react-dom";
import { schoolApi } from "@/lib/api/school";
import type {
  ClassScheduleOverview,
  ClassScheduleSlot,
  ClassTemporarySchedule,
  ClassroomDetail,
  CreateTemporarySchedulePayload,
  LatestFixedSchedule,
  ScheduleOverrideAction,
  TeacherScheduleDay,
  TeacherScheduleEvent,
  TeacherScheduleEventType,
  TeacherWeekSchedule,
} from "@/types/school";
import type { Notice } from "./classroom-types";
import {
  ConfirmDialog,
  EmptyState,
  InlineLoading,
  Modal,
  NoticeBanner,
  PrimaryAction,
  SecondaryAction,
  TextArea,
  TextInput,
} from "./classroom-ui";
import { getClassColorTheme, getErrorMessage } from "./classroom-utils";
import formStyles from "./classroom-manager.module.css";
import styles from "./class-schedule-tab.module.css";

type FixedScheduleForm = {
  effectiveFrom: string;
  schedules: ClassScheduleSlot[];
};

type TemporaryScheduleForm = {
  action: ScheduleOverrideAction;
  originalDate: string;
  newDate: string;
  startTime: string;
  endTime: string;
  reason: string;
};

type LessonContentForm = {
  topic: string;
  content: string;
};

type ScheduleConfirmAction =
  | { type: "fixed" }
  | { type: "temporary" }
  | { scheduleId: string; type: "revoke" }
  | { type: "lessonContent" }
  | { type: "lessonAdjustment" };

type SelectOption = {
  icon?: ReactNode;
  label: string;
  value: string;
};

type SessionPeriodValue = "morning" | "afternoon" | "evening" | "unknown";

type SchedulePeriod = {
  label: string;
  timeHint: string;
  value: SessionPeriodValue;
};

const emptySlot: ClassScheduleSlot = {
  dayOfWeek: 1,
  startTime: "",
  endTime: "",
};

const initialFixedForm: FixedScheduleForm = {
  effectiveFrom: "",
  schedules: [emptySlot],
};

const initialTemporaryForm: TemporaryScheduleForm = {
  action: "extra",
  originalDate: "",
  newDate: "",
  startTime: "",
  endTime: "",
  reason: "",
};

const initialLessonForm: LessonContentForm = {
  topic: "",
  content: "",
};

const dayOptions: SelectOption[] = [
  { label: "Thứ 2", value: "1" },
  { label: "Thứ 3", value: "2" },
  { label: "Thứ 4", value: "3" },
  { label: "Thứ 5", value: "4" },
  { label: "Thứ 6", value: "5" },
  { label: "Thứ 7", value: "6" },
  { label: "Chủ nhật", value: "7" },
];

const actionOptions: SelectOption[] = [
  { icon: <CalendarPlus size={15} />, label: "Buổi học thêm", value: "extra" },
  { icon: <RefreshCw size={15} />, label: "Dời lịch", value: "reschedule" },
  { icon: <Ban size={15} />, label: "Hủy buổi", value: "cancel" },
];

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

export function ClassScheduleTab({
  classroom,
  onScheduleChanged,
}: {
  classroom: ClassroomDetail;
  onScheduleChanged?: () => Promise<void> | void;
}) {
  const [overview, setOverview] = useState<ClassScheduleOverview | null>(null);
  const [weekSchedule, setWeekSchedule] = useState<TeacherWeekSchedule | null>(
    null,
  );
  const [selectedWeekStart, setSelectedWeekStart] = useState<string>(() =>
    getCurrentWeekStartKey(),
  );
  const [fixedForm, setFixedForm] =
    useState<FixedScheduleForm>(initialFixedForm);
  const [temporaryForm, setTemporaryForm] =
    useState<TemporaryScheduleForm>(initialTemporaryForm);
  const [lessonForm, setLessonForm] =
    useState<LessonContentForm>(initialLessonForm);
  const [lessonAdjustmentMode, setLessonAdjustmentMode] = useState<
    ScheduleOverrideAction | ""
  >("");
  const [editingTemporarySchedule, setEditingTemporarySchedule] =
    useState<ClassTemporarySchedule | null>(null);
  const [selectedEvent, setSelectedEvent] =
    useState<TeacherScheduleEvent | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFixedModalOpen, setIsFixedModalOpen] = useState(false);
  const [isTemporaryModalOpen, setIsTemporaryModalOpen] = useState(false);
  const [isSavingFixed, setIsSavingFixed] = useState(false);
  const [isSavingTemporary, setIsSavingTemporary] = useState(false);
  const [isRevokingTemporary, setIsRevokingTemporary] = useState(false);
  const [isSavingLesson, setIsSavingLesson] = useState(false);
  const [confirmAction, setConfirmAction] =
    useState<ScheduleConfirmAction | null>(null);

  const loadSchedules = useCallback(async () => {
    setIsLoading(true);

    try {
      const [scheduleOverview, teacherWeekSchedule] = await Promise.all([
        schoolApi.getClassSchedules(classroom.id),
        schoolApi.getTeacherWeekSchedule(selectedWeekStart),
      ]);

      setOverview(scheduleOverview);
      setWeekSchedule(teacherWeekSchedule);
      setFixedForm(
        buildFixedFormFromSchedule(scheduleOverview.latestFixedSchedule),
      );
    } catch (error) {
      setNotice({ type: "error", text: getErrorMessage(error) });
    } finally {
      setIsLoading(false);
    }
  }, [classroom.id, selectedWeekStart]);

  useEffect(() => {
    void loadSchedules();
  }, [loadSchedules]);

  const classEvents = useMemo(
    () =>
      (weekSchedule?.events ?? []).filter(
        (event) => event.classId === classroom.id,
      ),
    [classroom.id, weekSchedule?.events],
  );
  const days = weekSchedule?.days ?? buildWeekDays(selectedWeekStart);
  const eventsByDateAndPeriod = useMemo(() => {
    const eventMap = new Map<string, TeacherScheduleEvent[]>();

    for (const event of classEvents) {
      const period = getSessionPeriod(event.startTime).value;
      const key = getCalendarCellKey(event.date, period);

      eventMap.set(key, [...(eventMap.get(key) ?? []), event]);
    }

    for (const events of eventMap.values()) {
      events.sort(compareEventsByStartTime);
    }

    return eventMap;
  }, [classEvents]);
  const visiblePeriods = useMemo(() => {
    const hasUnknownEvent = classEvents.some(
      (event) => getSessionPeriod(event.startTime).value === "unknown",
    );

    return hasUnknownEvent
      ? [...calendarPeriods, unknownPeriod]
      : calendarPeriods;
  }, [classEvents]);
  const temporarySchedulesInWeek = useMemo(
    () =>
      (overview?.temporarySchedules ?? []).filter((schedule) =>
        isTemporaryScheduleInWeek(schedule, selectedWeekStart),
      ),
    [overview?.temporarySchedules, selectedWeekStart],
  );
  const fixedSlotCount = overview?.latestFixedSchedule?.schedules.length ?? 0;
  const activeEventCount = classEvents.filter(
    (event) => event.type !== "cancel",
  ).length;
  const weekRange = weekSchedule
    ? `${formatDate(weekSchedule.weekStart)} - ${formatDate(
        weekSchedule.weekEnd,
      )}`
    : `${formatDate(selectedWeekStart)} - ${formatDate(
        addDaysToDateKey(selectedWeekStart, 6),
      )}`;

  function openFixedScheduleModal() {
    setFixedForm(
      buildFixedFormFromSchedule(overview?.latestFixedSchedule ?? null),
    );
    setIsFixedModalOpen(true);
  }

  function openCreateTemporaryScheduleModal() {
    setLessonAdjustmentMode("");
    setEditingTemporarySchedule(null);
    setTemporaryForm({
      ...initialTemporaryForm,
      newDate: selectedWeekStart,
    });
    setIsTemporaryModalOpen(true);
  }

  function openEditTemporaryScheduleModal(schedule: ClassTemporarySchedule) {
    setLessonAdjustmentMode("");
    setEditingTemporarySchedule(schedule);
    setTemporaryForm(buildTemporaryFormFromSchedule(schedule));
    setIsTemporaryModalOpen(true);
  }

  function openLessonContentModal(event: TeacherScheduleEvent) {
    if (!event.startTime || !event.endTime) {
      setNotice({
        type: "error",
        text: "Buổi học này chưa có đủ giờ bắt đầu và kết thúc.",
      });
      return;
    }

    setSelectedEvent(event);
    setLessonAdjustmentMode("");
    setEditingTemporarySchedule(null);
    setLessonForm({
      topic: event.topic ?? "",
      content: event.content ?? event.lessonContent ?? "",
    });
  }

  function beginLessonAdjustment(action: ScheduleOverrideAction) {
    if (!selectedEvent) {
      return;
    }

    setLessonAdjustmentMode(action);
    setEditingTemporarySchedule(findTemporaryScheduleForEvent(selectedEvent));
    setTemporaryForm(buildTemporaryFormFromEvent(selectedEvent, action));
  }

  function cancelLessonAdjustment() {
    setLessonAdjustmentMode("");
    setEditingTemporarySchedule(null);
    setTemporaryForm(initialTemporaryForm);
  }

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

  async function handleSaveFixedSchedule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(null);

    const validationError = validateFixedSchedule(fixedForm);

    if (validationError) {
      setNotice({ type: "error", text: validationError });
      return;
    }

    setConfirmAction({ type: "fixed" });
  }

  async function executeSaveFixedSchedule() {
    setNotice(null);

    const validationError = validateFixedSchedule(fixedForm);

    if (validationError) {
      setNotice({ type: "error", text: validationError });
      setConfirmAction(null);
      return;
    }

    setIsSavingFixed(true);

    try {
      await schoolApi.saveFixedSchedule(classroom.id, fixedForm);
      setNotice({ type: "success", text: "Đã lưu thời khóa biểu cố định." });
      setIsFixedModalOpen(false);
      setConfirmAction(null);
      await loadSchedules();
      await onScheduleChanged?.();
    } catch (error) {
      setNotice({ type: "error", text: getErrorMessage(error) });
      setConfirmAction(null);
    } finally {
      setIsSavingFixed(false);
    }
  }

  async function handleSaveTemporarySchedule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(null);

    const payload = buildTemporaryPayload(temporaryForm);

    if (typeof payload === "string") {
      setNotice({ type: "error", text: payload });
      return;
    }

    setConfirmAction({ type: "temporary" });
  }

  async function executeSaveTemporarySchedule() {
    setNotice(null);

    const payload = buildTemporaryPayload(temporaryForm);

    if (typeof payload === "string") {
      setNotice({ type: "error", text: payload });
      setConfirmAction(null);
      return;
    }

    setIsSavingTemporary(true);

    try {
      if (editingTemporarySchedule) {
        await schoolApi.updateTemporarySchedule(
          classroom.id,
          editingTemporarySchedule.id,
          payload,
        );
        setNotice({ type: "success", text: "Đã cập nhật lịch tạm thời." });
      } else {
        await schoolApi.createTemporarySchedule(classroom.id, payload);
        setNotice({ type: "success", text: "Đã tạo lịch tạm thời." });
      }

      setIsTemporaryModalOpen(false);
      setEditingTemporarySchedule(null);
      setTemporaryForm(initialTemporaryForm);
      setConfirmAction(null);
      await loadSchedules();
    } catch (error) {
      setNotice({ type: "error", text: getErrorMessage(error) });
      setConfirmAction(null);
    } finally {
      setIsSavingTemporary(false);
    }
  }

  function handleRevokeTemporarySchedule(scheduleId: string) {
    setNotice(null);
    setConfirmAction({ scheduleId, type: "revoke" });
  }

  async function executeRevokeTemporarySchedule(scheduleId: string) {
    setNotice(null);
    setIsRevokingTemporary(true);

    try {
      await schoolApi.revokeTemporarySchedule(classroom.id, scheduleId);
      setNotice({ type: "success", text: "Đã thu hồi lịch tạm thời." });

      if (editingTemporarySchedule?.id === scheduleId) {
        setIsTemporaryModalOpen(false);
        setEditingTemporarySchedule(null);
        setTemporaryForm(initialTemporaryForm);
      }

      setConfirmAction(null);
      await loadSchedules();
    } catch (error) {
      setNotice({ type: "error", text: getErrorMessage(error) });
      setConfirmAction(null);
    } finally {
      setIsRevokingTemporary(false);
    }
  }

  async function handleSaveLessonContent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(null);

    if (!selectedEvent?.startTime || !selectedEvent.endTime) {
      setNotice({
        type: "error",
        text: "Buổi học này chưa có đủ giờ bắt đầu và kết thúc.",
      });
      return;
    }

    setConfirmAction({ type: "lessonContent" });
  }

  async function executeSaveLessonContent() {
    setNotice(null);

    if (!selectedEvent?.startTime || !selectedEvent.endTime) {
      setNotice({
        type: "error",
        text: "Buổi học này chưa có đủ giờ bắt đầu và kết thúc.",
      });
      setConfirmAction(null);
      return;
    }

    setIsSavingLesson(true);

    try {
      await schoolApi.saveClassSessionContent(classroom.id, {
        content: lessonForm.content.trim() || undefined,
        date: selectedEvent.date,
        endTime: selectedEvent.endTime,
        scheduleType: mapEventTypeToScheduleType(selectedEvent.type),
        startTime: selectedEvent.startTime,
        topic: lessonForm.topic.trim() || undefined,
      });
      setNotice({ type: "success", text: "Đã lưu nội dung buổi học." });
      setSelectedEvent(null);
      setLessonForm(initialLessonForm);
      setConfirmAction(null);
      await loadSchedules();
    } catch (error) {
      setNotice({ type: "error", text: getErrorMessage(error) });
      setConfirmAction(null);
    } finally {
      setIsSavingLesson(false);
    }
  }

  async function handleSaveLessonAdjustment() {
    if (!selectedEvent || !lessonAdjustmentMode) {
      return;
    }

    setNotice(null);

    const payload = buildTemporaryPayload(temporaryForm);

    if (typeof payload === "string") {
      setNotice({ type: "error", text: payload });
      return;
    }

    setConfirmAction({ type: "lessonAdjustment" });
  }

  async function executeSaveLessonAdjustment() {
    if (!selectedEvent || !lessonAdjustmentMode) {
      setConfirmAction(null);
      return;
    }

    setNotice(null);

    const payload = buildTemporaryPayload(temporaryForm);

    if (typeof payload === "string") {
      setNotice({ type: "error", text: payload });
      setConfirmAction(null);
      return;
    }

    setIsSavingTemporary(true);

    try {
      if (editingTemporarySchedule) {
        await schoolApi.updateTemporarySchedule(
          classroom.id,
          editingTemporarySchedule.id,
          payload,
        );
        setNotice({ type: "success", text: "Đã cập nhật lịch tạm thời." });
      } else {
        await schoolApi.createTemporarySchedule(classroom.id, payload);
        setNotice({ type: "success", text: "Đã tạo lịch tạm thời." });
      }

      setSelectedEvent(null);
      setLessonAdjustmentMode("");
      setEditingTemporarySchedule(null);
      setTemporaryForm(initialTemporaryForm);
      setConfirmAction(null);
      await loadSchedules();
    } catch (error) {
      setNotice({ type: "error", text: getErrorMessage(error) });
      setConfirmAction(null);
    } finally {
      setIsSavingTemporary(false);
    }
  }

  function findTemporaryScheduleForEvent(event: TeacherScheduleEvent) {
    if (event.type === "fixed") {
      return null;
    }

    const scheduleId = getTemporaryScheduleIdFromEvent(event);

    if (!scheduleId) {
      return null;
    }

    return (
      overview?.temporarySchedules.find((schedule) => schedule.id === scheduleId) ??
      null
    );
  }

  function updateFixedSlot(
    index: number,
    field: keyof ClassScheduleSlot,
    value: string | number,
  ) {
    setFixedForm((current) => ({
      ...current,
      schedules: current.schedules.map((slot, slotIndex) =>
        slotIndex === index
          ? {
              ...slot,
              [field]: value,
            }
          : slot,
      ),
    }));
  }

  function addFixedSlot() {
    setFixedForm((current) => ({
      ...current,
      schedules: [...current.schedules, { ...emptySlot }],
    }));
  }

  function removeFixedSlot(index: number) {
    setFixedForm((current) => ({
      ...current,
      schedules:
        current.schedules.length === 1
          ? current.schedules
          : current.schedules.filter((_, slotIndex) => slotIndex !== index),
    }));
  }

  function getConfirmCopy(action: ScheduleConfirmAction) {
    if (action.type === "fixed") {
      return {
        confirmText: "Lưu lịch",
        description: `Bạn sắp lưu thời khóa biểu cố định cho lớp ${classroom.name}. Lịch mới sẽ áp dụng từ ngày ${formatDate(fixedForm.effectiveFrom)}.`,
        title: "Xác nhận lưu lịch cố định",
        tone: "default" as const,
      };
    }

    if (action.type === "temporary") {
      const isCancel = temporaryForm.action === "cancel";

      return {
        confirmText: editingTemporarySchedule
          ? "Lưu thay đổi"
          : "Tạo lịch tạm",
        description: `Bạn sắp ${
          editingTemporarySchedule ? "cập nhật" : "tạo"
        } lịch tạm "${getActionLabel(temporaryForm.action)}" cho lớp ${
          classroom.name
        }.`,
        title: editingTemporarySchedule
          ? "Xác nhận sửa lịch tạm"
          : "Xác nhận tạo lịch tạm",
        tone: isCancel ? ("danger" as const) : ("default" as const),
      };
    }

    if (action.type === "revoke") {
      return {
        confirmText: "Thu hồi",
        description:
          "Bạn sắp thu hồi lịch tạm này. Sau khi thu hồi, lịch sẽ quay về theo lịch cố định hoặc trạng thái trước đó.",
        title: "Xác nhận thu hồi lịch tạm",
        tone: "danger" as const,
      };
    }

    if (action.type === "lessonAdjustment") {
      const isCancel = lessonAdjustmentMode === "cancel";

      return {
        confirmText: isCancel ? "Cho nghỉ" : "Lưu lịch dời",
        description: `Bạn sắp ${isCancel ? "cho nghỉ" : "dời lịch"} buổi học ${
          selectedEvent ? formatDate(selectedEvent.date) : "đang chọn"
        } của lớp ${classroom.name}.`,
        title: isCancel ? "Xác nhận cho nghỉ" : "Xác nhận dời lịch",
        tone: isCancel ? ("danger" as const) : ("default" as const),
      };
    }

    return {
      confirmText: "Lưu nội dung",
      description: `Bạn sắp cập nhật nội dung buổi học ${
        selectedEvent ? formatDate(selectedEvent.date) : "đang chọn"
      } của lớp ${classroom.name}.`,
      title: "Xác nhận lưu nội dung",
      tone: "default" as const,
    };
  }

  function getConfirmLoading(action: ScheduleConfirmAction) {
    if (action.type === "fixed") {
      return isSavingFixed;
    }

    if (action.type === "revoke") {
      return isRevokingTemporary;
    }

    if (action.type === "lessonContent") {
      return isSavingLesson;
    }

    return isSavingTemporary;
  }

  function handleConfirmScheduleAction() {
    if (!confirmAction) {
      return;
    }

    if (confirmAction.type === "fixed") {
      void executeSaveFixedSchedule();
      return;
    }

    if (confirmAction.type === "temporary") {
      void executeSaveTemporarySchedule();
      return;
    }

    if (confirmAction.type === "revoke") {
      void executeRevokeTemporarySchedule(confirmAction.scheduleId);
      return;
    }

    if (confirmAction.type === "lessonContent") {
      void executeSaveLessonContent();
      return;
    }

    void executeSaveLessonAdjustment();
  }

  if (isLoading && !overview && !weekSchedule) {
    return <InlineLoading text="Đang tải thời khóa biểu..." />;
  }

  const confirmCopy = confirmAction ? getConfirmCopy(confirmAction) : null;

  return (
    <div className={styles.scheduleWorkspace}>
      {notice ? (
        <NoticeBanner notice={notice} onClose={() => setNotice(null)} />
      ) : null}

      <section className={styles.scheduleHero}>
        <div className={styles.scheduleHeroMain}>
          <span className={styles.eyebrow}>
            <CalendarDays size={15} />
            Thời khóa biểu
          </span>
          <h3>Lịch học của lớp</h3>
          <p>{weekRange}</p>
        </div>

        <div className={styles.scheduleHeroActions}>
          <div className={styles.weekControls}>
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
          </div>

          <div className={styles.actionGroup}>
            <SecondaryAction
              icon={
                isLoading ? (
                  <LoaderCircle className="animate-spin" size={16} />
                ) : (
                  <RefreshCw size={16} />
                )
              }
              onClick={() => void loadSchedules()}
              type="button"
            >
              Tải lại
            </SecondaryAction>
            <SecondaryAction
              icon={<CalendarCheck size={16} />}
              onClick={openFixedScheduleModal}
              type="button"
            >
              Lịch cố định
            </SecondaryAction>
            <PrimaryAction
              icon={<CalendarPlus size={16} />}
              onClick={openCreateTemporaryScheduleModal}
              type="button"
            >
              Tạo lịch tạm
            </PrimaryAction>
          </div>
        </div>
      </section>

      <div className={styles.summaryGrid}>
        <SummaryItem
          icon={<BookOpenCheck size={19} />}
          label="Ca cố định"
          value={String(fixedSlotCount)}
        />
        <SummaryItem
          icon={<Clock size={19} />}
          label="Buổi trong tuần"
          value={String(activeEventCount)}
        />
        <SummaryItem
          icon={<Layers size={19} />}
          label="Lịch tạm"
          value={String(temporarySchedulesInWeek.length)}
        />
      </div>

      <CurrentFixedSchedule schedule={overview?.latestFixedSchedule ?? null} />

      <section className={styles.calendarFrame}>
        {isLoading ? (
          <CalendarSkeleton days={days} periods={visiblePeriods} />
        ) : (
          <WeekCalendar
            days={days}
            eventsByDateAndPeriod={eventsByDateAndPeriod}
            onEventSelect={openLessonContentModal}
            periods={visiblePeriods}
          />
        )}
      </section>

      <TemporarySchedulePanel
        isRevoking={isRevokingTemporary}
        onEdit={openEditTemporaryScheduleModal}
        onRevoke={(scheduleId) => void handleRevokeTemporarySchedule(scheduleId)}
        schedules={temporarySchedulesInWeek}
      />

      {isFixedModalOpen ? (
        <Modal
          onClose={() => setIsFixedModalOpen(false)}
          title="Sửa lịch cố định"
        >
          <form className={styles.modalForm} onSubmit={handleSaveFixedSchedule}>
            <DateField
              label="Ngày áp dụng"
              onChange={(value) =>
                setFixedForm((current) => ({
                  ...current,
                  effectiveFrom: value,
                }))
              }
              value={fixedForm.effectiveFrom}
            />

            <div className={styles.fixedSlotList}>
              {fixedForm.schedules.map((slot, index) => (
                <div className={formStyles.scheduleSlotRow} key={index}>
                  <SelectField
                    label="Thứ"
                    onChange={(value) =>
                      updateFixedSlot(index, "dayOfWeek", Number(value))
                    }
                    options={dayOptions}
                    value={String(slot.dayOfWeek)}
                  />
                  <TimeField
                    label="Bắt đầu"
                    onChange={(value) =>
                      updateFixedSlot(index, "startTime", value)
                    }
                    value={slot.startTime}
                  />
                  <TimeField
                    label="Kết thúc"
                    onChange={(value) =>
                      updateFixedSlot(index, "endTime", value)
                    }
                    value={slot.endTime}
                  />
                  <button
                    aria-label="Xóa ca học"
                    className={formStyles.scheduleIconButton}
                    disabled={fixedForm.schedules.length === 1}
                    onClick={() => removeFixedSlot(index)}
                    type="button"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>

            <div className={styles.modalActions}>
              <SecondaryAction
                icon={<Plus size={15} />}
                onClick={addFixedSlot}
                type="button"
              >
                Thêm ca học
              </SecondaryAction>
              <div className={styles.modalActionsEnd}>
                <SecondaryAction
                  onClick={() => setIsFixedModalOpen(false)}
                  type="button"
                >
                  Hủy
                </SecondaryAction>
                <PrimaryAction
                  disabled={isSavingFixed}
                  icon={
                    isSavingFixed ? (
                      <LoaderCircle className="animate-spin" size={16} />
                    ) : (
                      <Save size={16} />
                    )
                  }
                  type="submit"
                >
                  Lưu lịch
                </PrimaryAction>
              </div>
            </div>
          </form>
        </Modal>
      ) : null}

      {isTemporaryModalOpen ? (
        <Modal
          onClose={() => {
            setIsTemporaryModalOpen(false);
            setEditingTemporarySchedule(null);
          }}
          title={editingTemporarySchedule ? "Sửa lịch tạm" : "Tạo lịch tạm"}
        >
          <form
            className={styles.modalForm}
            onSubmit={handleSaveTemporarySchedule}
          >
            <div className={styles.temporaryFormGrid}>
              <SelectField
                label="Loại lịch tạm"
                onChange={(value) =>
                  setTemporaryForm((current) => ({
                    ...current,
                    action: value as ScheduleOverrideAction,
                  }))
                }
                options={actionOptions}
                value={temporaryForm.action}
              />

              {temporaryForm.action !== "extra" ? (
                <DateField
                  label="Ngày gốc"
                  onChange={(value) =>
                    setTemporaryForm((current) => ({
                      ...current,
                      originalDate: value,
                    }))
                  }
                  value={temporaryForm.originalDate}
                />
              ) : null}

              {temporaryForm.action !== "cancel" ? (
                <DateField
                  label={
                    temporaryForm.action === "extra"
                      ? "Ngày học thêm"
                      : "Ngày học mới"
                  }
                  onChange={(value) =>
                    setTemporaryForm((current) => ({
                      ...current,
                      newDate: value,
                    }))
                  }
                  value={temporaryForm.newDate}
                />
              ) : null}
            </div>

            {temporaryForm.action !== "cancel" ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <TimeField
                  label="Giờ bắt đầu"
                  onChange={(value) =>
                    setTemporaryForm((current) => ({
                      ...current,
                      startTime: value,
                    }))
                  }
                  value={temporaryForm.startTime}
                />
                <TimeField
                  label="Giờ kết thúc"
                  onChange={(value) =>
                    setTemporaryForm((current) => ({
                      ...current,
                      endTime: value,
                    }))
                  }
                  value={temporaryForm.endTime}
                />
              </div>
            ) : null}

            <TextArea
              label="Lý do"
              onChange={(event) =>
                setTemporaryForm((current) => ({
                  ...current,
                  reason: event.target.value,
                }))
              }
              placeholder="Nghỉ lễ, học bù, đổi phòng học..."
              value={temporaryForm.reason}
            />

            <div className={styles.modalActions}>
              {editingTemporarySchedule ? (
                <SecondaryAction
                  className={styles.dangerButton}
                  disabled={isRevokingTemporary}
                  icon={
                    isRevokingTemporary ? (
                      <LoaderCircle className="animate-spin" size={16} />
                    ) : (
                      <Undo2 size={16} />
                    )
                  }
                  onClick={() =>
                    void handleRevokeTemporarySchedule(
                      editingTemporarySchedule.id,
                    )
                  }
                  type="button"
                >
                  Thu hồi
                </SecondaryAction>
              ) : (
                <span />
              )}
              <div className={styles.modalActionsEnd}>
                <SecondaryAction
                  onClick={() => {
                    setIsTemporaryModalOpen(false);
                    setEditingTemporarySchedule(null);
                  }}
                  type="button"
                >
                  Hủy
                </SecondaryAction>
                <PrimaryAction
                  disabled={isSavingTemporary}
                  icon={
                    isSavingTemporary ? (
                      <LoaderCircle className="animate-spin" size={16} />
                    ) : (
                      <CalendarPlus size={16} />
                    )
                  }
                  type="submit"
                >
                  {editingTemporarySchedule ? "Lưu thay đổi" : "Tạo lịch tạm"}
                </PrimaryAction>
              </div>
            </div>
          </form>
        </Modal>
      ) : null}

      {selectedEvent ? (
        <Modal
          onClose={() => {
            setSelectedEvent(null);
            setLessonForm(initialLessonForm);
            cancelLessonAdjustment();
          }}
          title="Nội dung buổi học"
        >
          <form className={styles.modalForm} onSubmit={handleSaveLessonContent}>
            <div className={styles.lessonEventSummary}>
              <span style={getEventStyle(selectedEvent)}>
                {getEventIcon(selectedEvent.type)}
              </span>
              <div>
                <strong>{classroom.name}</strong>
                <p>
                  {formatDate(selectedEvent.date)} -{" "}
                  {formatTimeRange(selectedEvent)}
                </p>
              </div>
            </div>

            <LessonAdjustmentControls
              event={selectedEvent}
              form={temporaryForm}
              isSaving={isSavingTemporary}
              mode={lessonAdjustmentMode}
              onCancel={cancelLessonAdjustment}
              onChange={setTemporaryForm}
              onModeChange={beginLessonAdjustment}
              onSave={() => void handleSaveLessonAdjustment()}
            />

            <TextInput
              label="Chủ đề"
              maxLength={160}
              onChange={(event) =>
                setLessonForm((current) => ({
                  ...current,
                  topic: event.target.value,
                }))
              }
              placeholder="VD: Ôn tập chương 1"
              value={lessonForm.topic}
            />
            <TextArea
              label="Nội dung buổi học"
              maxLength={1200}
              onChange={(event) =>
                setLessonForm((current) => ({
                  ...current,
                  content: event.target.value,
                }))
              }
              placeholder="Nội dung buổi học"
              value={lessonForm.content}
            />

            <div className={styles.modalActionsEnd}>
              <SecondaryAction
                onClick={() => {
                  setSelectedEvent(null);
                  setLessonForm(initialLessonForm);
                  cancelLessonAdjustment();
                }}
                type="button"
              >
                Hủy
              </SecondaryAction>
              <PrimaryAction
                disabled={isSavingLesson}
                icon={
                  isSavingLesson ? (
                    <LoaderCircle className="animate-spin" size={16} />
                  ) : (
                    <Save size={16} />
                  )
                }
                type="submit"
              >
                Lưu nội dung
              </PrimaryAction>
            </div>
          </form>
        </Modal>
      ) : null}

      {confirmAction && confirmCopy ? (
        <ConfirmDialog
          confirmText={confirmCopy.confirmText}
          description={confirmCopy.description}
          isLoading={getConfirmLoading(confirmAction)}
          onCancel={() => setConfirmAction(null)}
          onConfirm={handleConfirmScheduleAction}
          title={confirmCopy.title}
          tone={confirmCopy.tone}
        />
      ) : null}
    </div>
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

function CurrentFixedSchedule({
  schedule,
}: {
  schedule: LatestFixedSchedule | null;
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
    </section>
  );
}

function WeekCalendar({
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
                <section className={styles.mobilePeriodBlock} key={period.value}>
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
      <span className={styles.periodIcon}>{getSessionPeriodIcon(period.value)}</span>
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

function TemporarySchedulePanel({
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

function LessonAdjustmentControls({
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
        <p>
          Dời lịch hoặc cho nghỉ sẽ tạo lịch tạm cho đúng buổi đang chọn.
        </p>
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
            placeholder="Nghỉ lễ, học bù, đổi phòng học..."
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

function CalendarSkeleton({
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
    </>
  );
}

function SelectField({
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
      Math.min(
        SELECT_MENU_MAX_HEIGHT,
        shouldOpenUp ? spaceAbove : spaceBelow,
      ),
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
    <div className="grid gap-2" ref={rootRef}>
      <span className="text-[14px] font-bold text-[var(--neutral-600)]">
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

function buildFixedFormFromSchedule(
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

function buildTemporaryFormFromSchedule(
  schedule: ClassTemporarySchedule,
): TemporaryScheduleForm {
  return {
    action: schedule.action,
    originalDate: toDateInputValue(schedule.originalDate),
    newDate: toDateInputValue(schedule.newDate),
    startTime: schedule.startTime ?? "",
    endTime: schedule.endTime ?? "",
    reason: schedule.reason ?? "",
  };
}

function buildTemporaryFormFromEvent(
  event: TeacherScheduleEvent,
  action: ScheduleOverrideAction,
): TemporaryScheduleForm {
  const originalDate =
    event.type === "reschedule" ? event.originalDate ?? event.date : event.date;

  return {
    action,
    originalDate,
    newDate: action === "cancel" ? "" : event.date,
    startTime: event.startTime ?? "",
    endTime: event.endTime ?? "",
    reason: event.reason ?? "",
  };
}

function validateFixedSchedule(form: FixedScheduleForm) {
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

function buildTemporaryPayload(
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

function getActionLabel(action: ScheduleOverrideAction) {
  if (action === "cancel") {
    return "Hủy buổi";
  }

  if (action === "reschedule") {
    return "Dời lịch";
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

  return <CalendarPlus size={13} />;
}

function getEventStyle(event: TeacherScheduleEvent) {
  const palette =
    event.type === "cancel" || !event.colorHex
      ? eventPalettes[event.type]
      : getClassColorTheme(event.colorHex);

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

function getEventLabel(type: TeacherScheduleEventType) {
  if (type === "cancel") {
    return "Đã hủy";
  }

  if (type === "extra") {
    return "Học thêm";
  }

  if (type === "reschedule") {
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

function getCalendarCellKey(date: string, period: SessionPeriodValue) {
  return `${date}:${period}`;
}

function compareEventsByStartTime(
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

function mapEventTypeToScheduleType(type: TeacherScheduleEventType) {
  if (type === "fixed") {
    return "fixed";
  }

  if (type === "extra") {
    return "extra";
  }

  if (type === "reschedule") {
    return "temporary";
  }

  return "manual";
}

function getTemporaryScheduleIdFromEvent(event: TeacherScheduleEvent) {
  if (event.type === "fixed") {
    return "";
  }

  return event.id.split(":")[1] ?? "";
}

function isTemporaryScheduleInWeek(
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

function buildWeekDays(weekStartKey: string): TeacherScheduleDay[] {
  return Array.from({ length: 7 }, (_, index) => {
    const date = addDaysToDateKey(weekStartKey, index);

    return {
      date,
      dayOfWeek: index === 6 ? 7 : index + 1,
    };
  });
}

function formatDate(value?: string) {
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

function getDayLabel(dayOfWeek: number) {
  if (dayOfWeek === 7) {
    return "Chủ nhật";
  }

  if (dayOfWeek >= 1 && dayOfWeek <= 6) {
    return `Thứ ${dayOfWeek + 1}`;
  }

  return "Ngày học";
}
