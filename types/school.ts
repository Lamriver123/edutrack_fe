export type Gender = "male" | "female" | "other";

export type StudentStatus = "active" | "inactive";

export type ClassStatus = "active" | "inactive" | "archived";

export type EnrollmentStatus = "active" | "inactive";

export type ClassScheduleSlot = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
};

export type ScheduleOverrideAction = "reschedule" | "cancel" | "extra";

export type LatestFixedSchedule = {
  id: string;
  version: number;
  effectiveFrom: string;
  effectiveTo?: string | null;
  schedules: ClassScheduleSlot[];
};

export type ClassScheduleOverview = {
  fixedSchedules: LatestFixedSchedule[];
  latestFixedSchedule: LatestFixedSchedule | null;
  temporarySchedules: ClassTemporarySchedule[];
};

export type ClassTemporarySchedule = {
  id: string;
  classId: string;
  action: ScheduleOverrideAction;
  originalDate?: string;
  newDate?: string;
  startTime?: string;
  endTime?: string;
  reason?: string;
};

export type StudentParent = {
  fullName?: string;
  phone?: string;
  relation?: string;
  note?: string;
};

export type Student = {
  id: string;
  teacherId: string;
  studentCode: string;
  fullName: string;
  avatarUrl?: string;
  dateOfBirth?: string;
  gender?: Gender;
  phone?: string;
  parent?: StudentParent;
  address?: string;
  note?: string;
  status: StudentStatus;
};

export type CreateStudentPayload = {
  studentCode?: string;
  fullName: string;
  gender: Gender;
  avatarUrl?: string;
  dateOfBirth?: string;
  phone?: string;
  parent?: StudentParent;
  address?: string;
  note?: string;
  status?: StudentStatus;
};

export type UpdateStudentPayload = Partial<CreateStudentPayload> & {
  status?: StudentStatus;
};

export type DeleteStudentMode = "deactivate" | "delete";

export type Classroom = {
  id: string;
  teacherId: string;
  name: string;
  description?: string;
  imageUrl: string;
  colorIndex: number;
  regularPrice: number;
  makeupPrice: number;
  status: ClassStatus;
  studentCount: number;
  latestFixedSchedule: LatestFixedSchedule | null;
};

export type ClassroomDetail = Classroom & {
  students: Student[];
};

export type CreateClassPayload = {
  name: string;
  description?: string;
  imageUrl?: string;
  colorIndex?: number;
  regularPrice: number;
  makeupPrice: number;
};

export type UpdateClassPayload = Partial<CreateClassPayload> & {
  status?: ClassStatus;
};

export type SaveFixedSchedulePayload = {
  effectiveFrom: string;
  schedules: ClassScheduleSlot[];
};

export type CreateTemporarySchedulePayload = {
  action: ScheduleOverrideAction;
  originalDate?: string;
  newDate?: string;
  startTime?: string;
  endTime?: string;
  reason?: string;
};

export type UpdateTemporarySchedulePayload = CreateTemporarySchedulePayload;

export type ClassSessionScheduleType =
  | "fixed"
  | "temporary"
  | "extra"
  | "manual";

export type SaveClassSessionContentPayload = {
  date: string;
  startTime: string;
  endTime: string;
  scheduleType?: ClassSessionScheduleType;
  topic?: string;
  content?: string;
};

export type ClassSessionContent = {
  id: string;
  classId: string;
  date: string;
  startTime: string;
  endTime: string;
  scheduleType: ClassSessionScheduleType;
  status: "scheduled" | "completed" | "cancelled";
  topic?: string;
  content?: string;
};

export type TeacherScheduleEventType =
  | "fixed"
  | "extra"
  | "reschedule"
  | "cancel";

export type TeacherScheduleClass = {
  id: string;
  name: string;
  imageUrl: string;
  colorIndex: number;
};

export type TeacherScheduleDay = {
  date: string;
  dayOfWeek: number;
};

export type TeacherScheduleEvent = {
  id: string;
  classId: string;
  className: string;
  classImageUrl: string;
  colorIndex: number;
  date: string;
  dayOfWeek: number;
  startTime?: string;
  endTime?: string;
  type: TeacherScheduleEventType;
  reason?: string;
  originalDate?: string;
  topic?: string;
  content?: string;
  lessonContent?: string;
};

export type TeacherWeekSchedule = {
  weekStart: string;
  weekEnd: string;
  days: TeacherScheduleDay[];
  classes: TeacherScheduleClass[];
  events: TeacherScheduleEvent[];
};

export type EnrollmentResponse = {
  id: string;
  classId: string;
  studentId: string;
  status: EnrollmentStatus;
  joinedAt: string;
  leftAt?: string | null;
  student: Student;
};
