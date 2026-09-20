/* eslint-disable react-hooks/set-state-in-effect */

"use client";

import {
  BookOpenCheck,
  CalendarCheck,
  CalendarDays,
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
  Clock,
  Layers,
  LoaderCircle,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  Undo2,
} from "lucide-react";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { schoolApi } from "@/lib/api/school";
import type {
  ClassScheduleOverview,
  ClassScheduleSlot,
  ClassTemporarySchedule,
  ClassroomDetail,
  ScheduleOverrideAction,
  TeacherScheduleEvent,
  TeacherWeekSchedule,
} from "@/types/school";

import {
  ConfirmDialog,
  InlineLoading,
  Modal,
  PrimaryAction,
  SecondaryAction,
  TextArea,
  TextInput,
} from "./classroom-ui";
import { getErrorMessage } from "./classroom-utils";
import formStyles from "./classroom-manager.module.css";
import styles from "./class-schedule-tab.module.css";
import { ScheduleAvailabilityPicker } from "../schedule/schedule-availability-picker";
import { ScheduleSourcePicker } from "../schedule/schedule-source-picker";
import {
  ScheduleConflictFeedback,
  useScheduleCheck,
} from "../schedule/schedule-conflict-feedback";
import { useNotice } from "@/components/ui/notice-provider";
import {
  CalendarSkeleton,
  CurrentFixedSchedule,
  DateField,
  LessonAdjustmentControls,
  SelectField,
  SummaryItem,
  TemporarySchedulePanel,
  TimeField,
  WeekCalendar,
  actionOptions,
  addDaysToDateKey,
  buildFixedFormFromSchedule,
  buildTemporaryFormFromEvent,
  buildTemporaryFormFromSchedule,
  buildTemporaryPayload,
  buildWeekDays,
  calendarPeriods,
  compareEventsByStartTime,
  dayOptions,
  emptySlot,
  formatDate,
  formatTimeRange,
  getActionLabel,
  getCalendarCellKey,
  getCurrentWeekStartKey,
  getEventIcon,
  getEventStyle,
  getSessionPeriod,
  getTemporaryScheduleIdFromEvent,
  getWeekStartKey,
  initialFixedForm,
  initialLessonForm,
  initialTemporaryForm,
  isStandaloneTemporaryAction,
  isTemporaryScheduleInWeek,
  mapEventTypeToScheduleType,
  unknownPeriod,
  validateFixedSchedule,
  type FixedScheduleForm,
  type LessonContentForm,
  type ScheduleConfirmAction,
  type TemporaryScheduleForm,
} from "./class-schedule-parts";


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
  const { setNotice } = useNotice();
  const [isLoading, setIsLoading] = useState(true);
  const [isFixedModalOpen, setIsFixedModalOpen] = useState(false);
  const [isTemporaryModalOpen, setIsTemporaryModalOpen] = useState(false);
  const [isSavingFixed, setIsSavingFixed] = useState(false);
  const [isSavingTemporary, setIsSavingTemporary] = useState(false);
  const [isRevokingTemporary, setIsRevokingTemporary] = useState(false);
  const [isSavingLesson, setIsSavingLesson] = useState(false);
  const [confirmAction, setConfirmAction] =
    useState<ScheduleConfirmAction | null>(null);
  const fixedCheck = useScheduleCheck();
  const temporaryCheck = useScheduleCheck();

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
  }, [classroom.id, selectedWeekStart, setNotice]);

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
    fixedCheck.clear();
    setFixedForm(
      buildFixedFormFromSchedule(overview?.latestFixedSchedule ?? null),
    );
    setIsFixedModalOpen(true);
  }

  function openCreateTemporaryScheduleModal() {
    temporaryCheck.clear();
    setLessonAdjustmentMode("");
    setEditingTemporarySchedule(null);
    setTemporaryForm({
      ...initialTemporaryForm,
      newDate: selectedWeekStart,
    });
    setIsTemporaryModalOpen(true);
  }

  function openEditTemporaryScheduleModal(schedule: ClassTemporarySchedule) {
    temporaryCheck.clear();
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

    temporaryCheck.clear();
    setLessonAdjustmentMode(action);
    setEditingTemporarySchedule(findTemporaryScheduleForEvent(selectedEvent));
    setTemporaryForm(buildTemporaryFormFromEvent(selectedEvent, action));
  }

  function cancelLessonAdjustment() {
    temporaryCheck.clear();
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

    const result = await fixedCheck.check(() =>
      schoolApi.checkFixedSchedule(classroom.id, fixedForm),
    );
    if (result) setConfirmAction({ type: "fixed" });
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
      const saved = await schoolApi.saveFixedSchedule(classroom.id, fixedForm);
      setNotice({
        type: "success",
        text: saved.warnings?.length
          ? `Đã lưu lịch cố định. Có ${saved.warnings.length} lịch tạm trùng cần điều chỉnh.`
          : "Đã lưu thời khóa biểu cố định.",
      });
      setIsFixedModalOpen(false);
      setConfirmAction(null);
      await loadSchedules();
      await onScheduleChanged?.();
    } catch (error) {
      fixedCheck.captureError(error);
      setNotice({ type: "error", text: getErrorMessage(error) });
      setConfirmAction(null);
    } finally {
      setIsSavingFixed(false);
    }
  }

  async function handleSaveTemporarySchedule(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    setNotice(null);

    const payload = buildTemporaryPayload(temporaryForm);

    if (typeof payload === "string") {
      setNotice({ type: "error", text: payload });
      return;
    }

    const result = await temporaryCheck.check(() =>
      schoolApi.checkTemporarySchedule(
        classroom.id,
        payload,
        editingTemporarySchedule?.id,
      ),
    );
    if (result) setConfirmAction({ type: "temporary" });
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
      temporaryCheck.captureError(error);
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

    const result = await temporaryCheck.check(() =>
      schoolApi.checkTemporarySchedule(
        classroom.id,
        payload,
        editingTemporarySchedule?.id,
      ),
    );
    if (result) setConfirmAction({ type: "lessonAdjustment" });
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
      temporaryCheck.captureError(error);
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
      overview?.temporarySchedules.find(
        (schedule) => schedule.id === scheduleId,
      ) ?? null
    );
  }

  function updateFixedSlot(
    index: number,
    field: keyof ClassScheduleSlot,
    value: string | number,
  ) {
    fixedCheck.clear();
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
    fixedCheck.clear();
    setFixedForm((current) => ({
      ...current,
      schedules: [...current.schedules, { ...emptySlot }],
    }));
  }

  function removeFixedSlot(index: number) {
    fixedCheck.clear();
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
        description: `Bạn sắp lưu thời khóa biểu cố định cho lớp ${classroom.name}. Lịch mới sẽ áp dụng từ ngày ${formatDate(fixedForm.effectiveFrom)}.${fixedCheck.result?.warnings.length ? ` Có lịch tạm trùng cần điều chỉnh: ${fixedCheck.result.warnings.map((item) => item.message).join(" ")} Bạn vẫn muốn lưu?` : ""}`,
        title: "Xác nhận lưu lịch cố định",
        tone: "default" as const,
      };
    }

    if (action.type === "temporary") {
      const isCancel = temporaryForm.action === "cancel";

      return {
        confirmText: editingTemporarySchedule ? "Lưu thay đổi" : "Tạo lịch tạm",
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
                aria-label="Chọn ngày để xem tuần"
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
              aria-label="Tải lại lịch học"
              className={styles.refreshButton}
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
              <span className={styles.refreshLabel}>Tải lại</span>
            </SecondaryAction>
            <SecondaryAction
              className={styles.fixedActionButton}
              icon={<CalendarCheck size={16} />}
              onClick={openFixedScheduleModal}
              type="button"
            >
              Lịch cố định
            </SecondaryAction>
            <PrimaryAction
              className={styles.temporaryActionButton}
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
        onRevoke={(scheduleId) =>
          void handleRevokeTemporarySchedule(scheduleId)
        }
        schedules={temporarySchedulesInWeek}
      />

      {isFixedModalOpen ? (
        <Modal
          onClose={() => {
            fixedCheck.clear();
            setIsFixedModalOpen(false);
          }}
          title="Sửa lịch cố định"
        >
          <form
            className={styles.modalForm}
            onSubmit={handleSaveFixedSchedule}
            onChange={() => fixedCheck.clear()}
          >
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
                <Fragment key={index}>
                  <div className={formStyles.scheduleSlotRow}>
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
                  <ScheduleAvailabilityPicker
                    context={{
                      classId: classroom.id,
                      mode: "fixed",
                      date: fixedForm.effectiveFrom,
                      dayOfWeek: slot.dayOfWeek,
                    }}
                    reservedSlots={fixedForm.schedules.filter(
                      (s, i) => i !== index && s.dayOfWeek === slot.dayOfWeek,
                    )}
                    onSelect={(time) => {
                      fixedCheck.clear();
                      setFixedForm((current) => ({
                        ...current,
                        schedules: current.schedules.map((s, i) =>
                          i === index ? { ...s, ...time } : s,
                        ),
                      }));
                    }}
                  />
                </Fragment>
              ))}
            </div>

            <ScheduleConflictFeedback
              result={fixedCheck.result}
              error={fixedCheck.error}
            />
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
                  onClick={() => {
                    fixedCheck.clear();
                    setIsFixedModalOpen(false);
                  }}
                  type="button"
                >
                  Hủy
                </SecondaryAction>
                <PrimaryAction
                  disabled={isSavingFixed || fixedCheck.isChecking}
                  icon={
                    isSavingFixed ? (
                      <LoaderCircle className="animate-spin" size={16} />
                    ) : (
                      <Save size={16} />
                    )
                  }
                  type="submit"
                >
                  {fixedCheck.isChecking ? "Đang kiểm tra..." : "Lưu lịch"}
                </PrimaryAction>
              </div>
            </div>
          </form>
        </Modal>
      ) : null}

      {isTemporaryModalOpen ? (
        <Modal
          onClose={() => {
            temporaryCheck.clear();
            setIsTemporaryModalOpen(false);
            setEditingTemporarySchedule(null);
          }}
          title={editingTemporarySchedule ? "Sửa lịch tạm" : "Tạo lịch tạm"}
        >
          <form
            className={styles.modalForm}
            onSubmit={handleSaveTemporarySchedule}
            onChange={() => temporaryCheck.clear()}
          >
            <div className={styles.temporaryFormGrid}>
              <SelectField
                label="Loại lịch tạm"
                onChange={(value) => {
                  temporaryCheck.clear();
                  setTemporaryForm((current) => ({
                    ...current,
                    action: value as ScheduleOverrideAction,
                    startTime:
                      value === "cancel"
                        ? (current.originalStartTime ?? "")
                        : current.startTime,
                    endTime:
                      value === "cancel"
                        ? (current.originalEndTime ?? "")
                        : current.endTime,
                  }));
                }}
                options={actionOptions}
                value={temporaryForm.action}
              />

              {!isStandaloneTemporaryAction(temporaryForm.action) ? (
                <DateField
                  label="Ngày gốc"
                  onChange={(value) =>
                    setTemporaryForm((current) => ({
                      ...current,
                      originalDate: value,
                      originalStartTime: undefined,
                      originalEndTime: undefined,
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
                      : temporaryForm.action === "one_on_one"
                        ? "Ngày học kèm 1:1"
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

            {temporaryForm.action === "reschedule" ? (
              <ScheduleSourcePicker
                classId={classroom.id}
                date={temporaryForm.originalDate}
                ignoreOverrideId={editingTemporarySchedule?.id}
                startTime={temporaryForm.originalStartTime}
                endTime={temporaryForm.originalEndTime}
                onChange={(slot) => {
                  temporaryCheck.clear();
                  setTemporaryForm((current) => ({
                    ...current,
                    originalStartTime: slot.startTime,
                    originalEndTime: slot.endTime,
                  }));
                }}
              />
            ) : null}

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

            {temporaryForm.action !== "cancel" ? (
              <ScheduleAvailabilityPicker
                context={{
                  classId: classroom.id,
                  mode: "temporary",
                  date: temporaryForm.newDate,
                  ignoreOverrideId: editingTemporarySchedule?.id,
                  originalDate:
                    temporaryForm.action === "reschedule"
                      ? temporaryForm.originalDate
                      : undefined,
                  originalStartTime: temporaryForm.originalStartTime,
                  originalEndTime: temporaryForm.originalEndTime,
                }}
                onSelect={(slot) => {
                  temporaryCheck.clear();
                  setTemporaryForm((current) => ({ ...current, ...slot }));
                }}
              />
            ) : null}
            <ScheduleConflictFeedback
              result={temporaryCheck.result}
              error={temporaryCheck.error}
            />
            <TextArea
              label="Lý do"
              onChange={(event) =>
                setTemporaryForm((current) => ({
                  ...current,
                  reason: event.target.value,
                }))
              }
              placeholder="Nghỉ lễ, kèm 1:1, đổi phòng học..."
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
                    temporaryCheck.clear();
                    setIsTemporaryModalOpen(false);
                    setEditingTemporarySchedule(null);
                  }}
                  type="button"
                >
                  Hủy
                </SecondaryAction>
                <PrimaryAction
                  disabled={isSavingTemporary || temporaryCheck.isChecking}
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
          <form
            className={styles.modalForm}
            onSubmit={handleSaveLessonContent}
            onChange={() => temporaryCheck.clear()}
          >
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
              isSaving={isSavingTemporary || temporaryCheck.isChecking}
              mode={lessonAdjustmentMode}
              onCancel={cancelLessonAdjustment}
              onChange={setTemporaryForm}
              onModeChange={beginLessonAdjustment}
              onSave={() => void handleSaveLessonAdjustment()}
            />

            {lessonAdjustmentMode ? (
              <ScheduleConflictFeedback
                result={temporaryCheck.result}
                error={temporaryCheck.error}
              />
            ) : null}
            {lessonAdjustmentMode === "reschedule" &&
            temporaryForm.action === "reschedule" &&
            (!temporaryForm.originalStartTime ||
              !temporaryForm.originalEndTime) ? (
              <ScheduleSourcePicker
                classId={classroom.id}
                date={temporaryForm.originalDate}
                ignoreOverrideId={editingTemporarySchedule?.id}
                startTime={temporaryForm.originalStartTime}
                endTime={temporaryForm.originalEndTime}
                onChange={(slot) => {
                  temporaryCheck.clear();
                  setTemporaryForm((current) => ({
                    ...current,
                    originalStartTime: slot.startTime,
                    originalEndTime: slot.endTime,
                  }));
                }}
              />
            ) : null}
            {lessonAdjustmentMode === "reschedule" ? (
              <ScheduleAvailabilityPicker
                context={{
                  classId: classroom.id,
                  mode: "temporary",
                  date: temporaryForm.newDate,
                  ignoreOverrideId: editingTemporarySchedule?.id,
                  originalDate:
                    temporaryForm.action === "reschedule"
                      ? temporaryForm.originalDate
                      : undefined,
                  originalStartTime: temporaryForm.originalStartTime,
                  originalEndTime: temporaryForm.originalEndTime,
                }}
                onSelect={(slot) => {
                  temporaryCheck.clear();
                  setTemporaryForm((current) => ({ ...current, ...slot }));
                }}
              />
            ) : null}
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
