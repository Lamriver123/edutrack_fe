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
  warnings?: ScheduleConflict[];
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
  originalStartTime?: string;
  originalEndTime?: string;
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
  gradeLevel?: string;
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
  gradeLevel?: string;
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

export type StudentBulkDeleteResult = {
  totalCount: number;
  successCount: number;
  failedCount: number;
  mode: DeleteStudentMode;
  affectedStudents: Student[];
  errors: Array<{
    studentId: string;
    studentName?: string;
    message: string;
  }>;
};

export type StudentSortField =
  | "fullName"
  | "gradeLevel"
  | "createdAt"
  | "updatedAt";

export type StudentSortOrder = "asc" | "desc";

export type StudentListFilters = {
  search?: string;
  status?: StudentStatus;
  gradeLevel?: string;
  sortBy?: StudentSortField;
  sortOrder?: StudentSortOrder;
  limit?: string;
};

export type StudentImportResult = {
  totalRows: number;
  successCount: number;
  failedCount: number;
  createdStudents: Student[];
  errors: Array<{
    row: number;
    message: string;
  }>;
};

export type Classroom = {
  id: string;
  teacherId: string;
  name: string;
  description?: string;
  imageUrl: string;
  colorIndex: number;
  colorHex?: string;
  regularPrice: number;
  makeupPrice: number;
  priceEffectiveFrom?: string | null;
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
  colorHex?: string;
  regularPrice: number;
  makeupPrice: number;
  priceEffectiveFrom?: string;
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
  originalStartTime?: string;
  originalEndTime?: string;
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
  | "cancel"
  | "manual";

export type TeacherScheduleClass = {
  id: string;
  name: string;
  imageUrl: string;
  colorIndex: number;
  colorHex?: string;
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
  colorHex?: string;
  date: string;
  dayOfWeek: number;
  startTime?: string;
  endTime?: string;
  type: TeacherScheduleEventType;
  reason?: string;
  originalDate?: string;
  originalStartTime?: string;
  originalEndTime?: string;
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

export type DashboardTodayLesson = TeacherScheduleEvent & {
  displayTitle: string;
  statusLabel: string;
  typeLabel: string;
};

export type DashboardRevenueStats = {
  issuedAmount: number;
  paidAmount: number;
  outstandingAmount: number;
  paidReceiptCount: number;
  pendingReceiptCount: number;
  receiptCount: number;
};

export type DashboardPendingPayment = {
  id: string;
  classId?: string;
  className: string;
  colorHex?: string;
  dueDate?: string | null;
  issuedAt?: string;
  lessonCount: number;
  paidAmount: number;
  parentName: string;
  parentPhone: string;
  paymentStatus: PaymentStatus;
  periodEnd?: string;
  periodStart?: string;
  receiptNumber?: string;
  remainingAmount: number;
  studentCode?: string;
  studentId?: string;
  studentName: string;
  totalAmount: number;
};

export type DashboardOverviewData = {
  generatedAt: string;
  today: string;
  stats: {
    activeClassCount: number;
    activeStudentCount: number;
    todaySessionCount: number;
    unreadNotificationCount: number;
    pendingPaymentCount: number;
  };
  revenue: {
    currentMonth: DashboardRevenueStats;
    collectedThisMonth: number;
    overall: DashboardRevenueStats;
  };
  todayLessons: DashboardTodayLesson[];
  pendingPayments: DashboardPendingPayment[];
};

export type ScheduleConflict = {
  classId: string; className: string; scheduleId: string;
  date: string; startTime: string; endTime: string;
  type: "fixed" | "temporary"; message: string;
};
export type ScheduleConflictResult = {
  blockingConflicts: ScheduleConflict[];
  warnings: ScheduleConflict[];
};
export type ScheduleAvailabilityPayload = {
  classId: string; mode: "fixed" | "temporary"; date: string;
  dayOfWeek?: number; duration: number; startTime: string; endTime: string;
  ignoreOverrideId?: string; originalDate?: string;
  originalStartTime?: string; originalEndTime?: string;
};
export type ScheduleTimeSlot = { startTime: string; endTime: string };
export type ScheduleAvailability = { slots: ScheduleTimeSlot[]; warnings: ScheduleConflict[] };

export type EnrollmentResponse = {
  id: string;
  classId: string;
  studentId: string;
  status: EnrollmentStatus;
  joinedAt: string;
  leftAt?: string | null;
  student: Student;
};

export type EnrollmentBulkResponse = {
  totalCount: number;
  successCount: number;
  failedCount: number;
  enrollments: EnrollmentResponse[];
  errors: Array<{
    studentId: string;
    studentName?: string;
    message: string;
  }>;
};

export type RemoveStudentsBulkResponse = {
  totalCount: number;
  successCount: number;
  failedCount: number;
  removedStudents: Student[];
  errors: Array<{
    studentId: string;
    studentName?: string;
    message: string;
  }>;
};

export type AttendanceStatus = "present" | "absent" | "excused" | "late";

export type AttendanceRecord = {
  id: string;
  studentId: string;
  studentName: string;
  studentCode: string;
  studentAvatar?: string;
  status: AttendanceStatus;
  note?: string;
  isBilled?: boolean;
};

export type AttendanceResponse = {
  sessionId: string | null;
  classId: string;
  date: string;
  startTime: string;
  endTime: string;
  records: AttendanceRecord[];
  summary: {
    total: number;
    present: number;
    absent: number;
    excused: number;
  };
};

export interface TakeAttendanceRecordPayload {
  studentId: string;
  status?: AttendanceStatus | null;
  note?: string;
};

export type TakeAttendancePayload = {
  date: string;
  startTime: string;
  endTime: string;
  scheduleEventType?: Exclude<TeacherScheduleEventType, "cancel"> | "manual";
  records: TakeAttendanceRecordPayload[];
};

export type TakeAttendanceBatchPayload = {
  sessions: TakeAttendancePayload[];
};

export type FlatAttendanceRecord = {
  id: string;
  sessionId: string;
  studentId: string;
  status: AttendanceStatus;
  note: string;
  isBilled?: boolean;
};

export type AttendanceSheetResponse = {
  sessions: TeacherScheduleEvent[];
  records: FlatAttendanceRecord[];
};

export type Exam = {
  id: string;
  title: string;
  testDate: string;
  maxScore: number;
  description?: string;
  fileUrl?: string;
  fileName?: string;
};

export type ExamScore = {
  id: string;
  examId: string;
  studentId: string;
  score: number;
  note?: string;
  evidenceImages?: string[];
};

export type ExamSheetResponse = {
  students: Student[];
  exams: Exam[];
  scores: ExamScore[];
};

export type CreateExamPayload = {
  title: string;
  testDate: string;
  maxScore: number;
  description?: string;
  fileUrl?: string;
  fileName?: string;
};

export type UpdateExamPayload = Partial<CreateExamPayload>;

export type TakeExamScoreEntry = {
  examId: string;
  studentId: string;
  score: number | null;
  note?: string;
  evidenceImages?: string[];
};

export type TakeExamScoresBatchPayload = {
  scores: TakeExamScoreEntry[];
};

export type PaymentStatus =
  | "unpaid"
  | "partially_paid"
  | "paid"
  | "cancelled";

export type ReceiptPdfStatus = "pending" | "generated" | "failed";
export type ReceiptScope = "class" | "multi_class";

export type ReceiptTeacherSnapshot = {
  fullName: string;
  email: string;
  phone?: string;
  address?: string;
  avatarUrl?: string;
  bankAccountName?: string;
  bankAccountNumber?: string;
  hasPaymentQr: boolean;
};

export type ReceiptClassSnapshot = {
  classId?: string;
  className: string;
  colorHex?: string;
  regularPrice: number;
  makeupPrice: number;
};

export type ReceiptStudentSnapshot = {
  studentCode?: string;
  fullName: string;
  phone?: string;
  parentName?: string;
  parentPhone?: string;
};

export type ReceiptSessionSnapshot = {
  tuitionEntryId: string;
  attendanceId?: string;
  sequence: number;
  sessionId?: string;
  classId?: string;
  attendedClassId?: string;
  billingClassId?: string;
  makeupForClassId?: string;
  date: string;
  startTime?: string;
  endTime?: string;
  className: string;
  attendedClassName?: string;
  billingClassName?: string;
  makeupForClassName?: string;
  classColorHex?: string;
  topic?: string;
  content?: string;
  attendanceStatus: AttendanceStatus;
  scheduleType?: ClassSessionScheduleType;
  tuitionType: string;
  unitPrice: number;
  amount: number;
  note?: string;
};

export type ReceiptExamSnapshot = {
  examId?: string;
  examScoreId?: string;
  classId?: string;
  className: string;
  title: string;
  date: string;
  score: number;
  maxScore: number;
  description?: string;
  note?: string;
  evidenceImages?: string[];
  teacherRemark?: string;
};

export type ReceiptDetail = {
  id: string;
  teacherId: string;
  classId: string;
  classIds?: string[];
  primaryClassId?: string;
  scopeType?: ReceiptScope;
  studentId: string;
  billingCycleId?: string | null;
  receiptNumber: string;
  issuedAt: string;
  periodStart: string;
  periodEnd: string;
  dueDate?: string | null;
  reason: "cycle_completed" | "manual_early";
  teacherSnapshot: ReceiptTeacherSnapshot;
  classSnapshot: ReceiptClassSnapshot;
  classSnapshots?: ReceiptClassSnapshot[];
  studentSnapshot: ReceiptStudentSnapshot;
  sessions: ReceiptSessionSnapshot[];
  exams: ReceiptExamSnapshot[];
  lessonCount: number;
  subtotal: number;
  discountAmount: number;
  adjustmentAmount: number;
  totalAmount: number;
  paymentStatus: PaymentStatus;
  paidAmount: number;
  paidAt?: string | null;
  note?: string;
  teacherComment?: string;
  strengthsComment?: string;
  improvementsComment?: string;
  generalComment?: string;
  paymentNote?: string;
  paymentProofUrl?: string;
  pdfStatus: ReceiptPdfStatus;
  pdfUrl?: string | null;
  pdfGeneratedAt?: string | null;
  pdfFailedReason?: string | null;
};

export type ReceiptListItem = {
  id: string;
  classId: string;
  classIds?: string[];
  primaryClassId?: string;
  scopeType?: ReceiptScope;
  studentId: string;
  receiptNumber: string;
  issuedAt: string;
  periodStart: string;
  periodEnd: string;
  studentName: string;
  className: string;
  classSnapshots?: ReceiptClassSnapshot[];
  lessonCount: number;
  totalAmount: number;
  paymentStatus: PaymentStatus;
  paidAmount?: number;
  paidAt?: string | null;
  paymentNote?: string;
  pdfStatus: ReceiptPdfStatus;
  pdfUrl?: string | null;
};

export type BillingOverviewStudent = {
  student: Student;
  unbilledLessonCount: number;
  unbilledAmount: number;
  firstUnbilledSessionDate?: string;
  lastUnbilledSessionDate?: string;
  reachedSuggestedCycle: boolean;
  latestReceipt?: ReceiptListItem | null;
};

export type BillingOverview = {
  classId: string;
  className: string;
  regularPrice: number;
  makeupPrice: number;
  totals: {
    students: number;
    unbilledLessonCount: number;
    unbilledAmount: number;
    readyToIssueCount: number;
  };
  students: BillingOverviewStudent[];
};

export type StudentBillingOverviewClass = {
  class: {
    id: string;
    name: string;
    colorHex?: string;
    regularPrice: number;
    makeupPrice: number;
  };
  unbilledLessonCount: number;
  unbilledAmount: number;
  firstUnbilledSessionDate?: string;
  lastUnbilledSessionDate?: string;
  reachedSuggestedCycle: boolean;
  latestReceipt?: ReceiptListItem | null;
};

export type StudentBillingOverview = {
  student: Student;
  classes: StudentBillingOverviewClass[];
  totals: {
    classes: number;
    unbilledLessonCount: number;
    unbilledAmount: number;
    readyToIssueCount: number;
  };
};

export type BillingClassSummary = {
  id: string;
  name: string;
  colorHex?: string;
  regularPrice: number;
  makeupPrice: number;
};

export type BillingCandidates = {
  class: BillingClassSummary;
  classes?: BillingClassSummary[];
  scopeType?: ReceiptScope;
  student: Student;
  periodStart: string;
  periodEnd: string;
  suggestedTuitionEntryIds: string[];
  tuitionEntries: ReceiptSessionSnapshot[];
  exams: ReceiptExamSnapshot[];
  summary: {
    unbilledLessonCount: number;
    unbilledAmount: number;
    examCount: number;
  };
};

export type IssueReceiptPayload = {
  scopeType?: ReceiptScope;
  classIds?: string[];
  fromDate?: string;
  toDate?: string;
  dueDate?: string;
  tuitionEntryIds?: string[];
  targetSessionCount?: number;
  discountAmount?: number;
  adjustmentAmount?: number;
  note?: string;
  teacherComment?: string;
  strengthsComment?: string;
  improvementsComment?: string;
  generalComment?: string;
  paymentNote?: string;
  examRemarks?: Array<{
    examScoreId: string;
    teacherRemark: string;
  }>;
};

export type ReceiptPreviewResponse = {
  receipt: ReceiptDetail;
  html: string;
};

export type FileDownloadResponse = {
  blob: Blob;
  contentType?: string;
  fileName: string;
};

export type ReceiptDownloadResponse = FileDownloadResponse;

export type ReceiptBulkDownloadPayload = {
  receiptIds: string[];
};

export type UpdateReceiptPaymentPayload = {
  paymentStatus: Exclude<PaymentStatus, "cancelled">;
  paidAmount?: number;
  paidAt?: string;
  paymentNote?: string;
  paymentProofUrl?: string;
  paymentProofPublicId?: string;
};
