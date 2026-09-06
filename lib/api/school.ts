import { tokenStorage } from "@/lib/auth/token-storage";
import type {
  AttendanceResponse,
  Classroom,
  ClassroomDetail,
  ClassScheduleOverview,
  ClassSessionContent,
  ClassTemporarySchedule,
  CreateClassPayload,
  CreateStudentPayload,
  CreateTemporarySchedulePayload,
  DashboardOverviewData,
  DeleteStudentMode,
  EnrollmentBulkResponse,
  EnrollmentResponse,
  LatestFixedSchedule,
  SaveClassSessionContentPayload,
  SaveFixedSchedulePayload,
  Student,
  StudentImportResult,
  StudentListFilters,
  TakeAttendancePayload,
  TakeAttendanceBatchPayload,
  TeacherWeekSchedule,
  UpdateClassPayload,
  UpdateStudentPayload,
  UpdateTemporarySchedulePayload,
  AttendanceSheetResponse,
  Exam,
  CreateExamPayload,
  UpdateExamPayload,
  ExamSheetResponse,
  FileDownloadResponse,
  TakeExamScoresBatchPayload,
  BillingCandidates,
  BillingOverview,
  IssueReceiptPayload,
  PaymentStatus,
  ReceiptDetail,
  ReceiptBulkDownloadPayload,
  ReceiptDownloadResponse,
  ReceiptListItem,
  ReceiptPreviewResponse,
  RemoveStudentsBulkResponse,
  StudentBillingOverview,
  StudentBulkDeleteResult,
  UpdateReceiptPaymentPayload,
  ScheduleConflictResult,
  ScheduleAvailabilityPayload,
  ScheduleAvailability,
  ScheduleTimeSlot,
} from "@/types/school";
import { apiBlobRequest, apiRequest } from "./client";

function getToken() {
  return tokenStorage.getAccessToken();
}

function buildQuery(params: Record<string, string | string[] | undefined>) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      const normalizedValue = value.map((item) => item.trim()).filter(Boolean);

      if (normalizedValue.length) {
        searchParams.set(key, normalizedValue.join(","));
      }

      return;
    }

    if (value?.trim()) {
      searchParams.set(key, value.trim());
    }
  });

  const queryString = searchParams.toString();

  return queryString ? `?${queryString}` : "";
}

export const schoolApi = {
  getDashboardOverview() {
    return apiRequest<DashboardOverviewData>("/dashboard/overview", {
      token: getToken(),
    });
  },

  checkFixedSchedule(classId: string, payload: SaveFixedSchedulePayload) {
    return apiRequest<ScheduleConflictResult>("/schedules/conflicts/check-fixed", {
      method: "POST", token: getToken(), body: JSON.stringify({ ...payload, classId }),
    });
  },
  checkTemporarySchedule(classId: string, payload: CreateTemporarySchedulePayload, ignoreOverrideId?: string) {
    return apiRequest<ScheduleConflictResult>("/schedules/conflicts/check-temporary", {
      method: "POST", token: getToken(), body: JSON.stringify({ ...payload, classId, ignoreOverrideId }),
    });
  },
  getScheduleAvailability(payload: ScheduleAvailabilityPayload) {
    return apiRequest<ScheduleAvailability>("/schedules/availability", {
      method: "POST", token: getToken(), body: JSON.stringify(payload),
    });
  },
  getScheduleSourceSlots(classId: string, date: string, ignoreOverrideId?: string) {
    return apiRequest<ScheduleTimeSlot[]>(`/schedules/source-slots${buildQuery({ classId, date, ignoreOverrideId })}`, { token: getToken() });
  },

  listStudents(filters: StudentListFilters = {}) {
    return apiRequest<Student[]>(`/students${buildQuery(filters)}`, {
      token: getToken(),
    });
  },

  downloadStudentImportTemplate(): Promise<FileDownloadResponse> {
    return apiBlobRequest("/students/import-template", {
      token: getToken(),
    });
  },

  importStudents(file: File) {
    const formData = new FormData();
    formData.append("file", file);

    return apiRequest<StudentImportResult>("/students/import", {
      method: "POST",
      token: getToken(),
      body: formData,
    });
  },

  listClasses(search?: string) {
    const params = new URLSearchParams();

    if (search?.trim()) {
      params.set("search", search.trim());
    }

    const queryString = params.toString();

    return apiRequest<Classroom[]>(`/classes${queryString ? `?${queryString}` : ""}`, {
      token: getToken(),
    });
  },

  createClass(payload: CreateClassPayload) {
    return apiRequest<Classroom>("/classes", {
      method: "POST",
      token: getToken(),
      body: JSON.stringify(payload),
    });
  },

  updateClass(classId: string, payload: UpdateClassPayload) {
    return apiRequest<Classroom>(`/classes/${classId}`, {
      method: "PATCH",
      token: getToken(),
      body: JSON.stringify(payload),
    });
  },

  deleteClass(classId: string) {
    return apiRequest<{ message: string }>(`/classes/${classId}`, {
      method: "DELETE",
      token: getToken(),
    });
  },

  uploadClassImage(file: File) {
    const formData = new FormData();
    formData.append("file", file);

    return apiRequest<{ url: string; publicId: string }>("/classes/image", {
      method: "POST",
      token: getToken(),
      body: formData,
    });
  },

  getClassDetail(classId: string) {
    return apiRequest<ClassroomDetail>(`/classes/${classId}`, {
      token: getToken(),
    });
  },

  getClassSchedules(classId: string) {
    return apiRequest<ClassScheduleOverview>(`/classes/${classId}/schedules`, {
      token: getToken(),
    });
  },

  saveFixedSchedule(classId: string, payload: SaveFixedSchedulePayload) {
    return apiRequest<LatestFixedSchedule>(`/classes/${classId}/schedules/fixed`, {
      method: "POST",
      token: getToken(),
      body: JSON.stringify(payload),
    });
  },

  createTemporarySchedule(
    classId: string,
    payload: CreateTemporarySchedulePayload,
  ) {
    return apiRequest<ClassTemporarySchedule>(
      `/classes/${classId}/schedules/temporary`,
      {
        method: "POST",
        token: getToken(),
        body: JSON.stringify(payload),
      },
    );
  },

  updateTemporarySchedule(
    classId: string,
    scheduleId: string,
    payload: UpdateTemporarySchedulePayload,
  ) {
    return apiRequest<ClassTemporarySchedule>(
      `/classes/${classId}/schedules/temporary/${scheduleId}`,
      {
        method: "PATCH",
        token: getToken(),
        body: JSON.stringify(payload),
      },
    );
  },

  revokeTemporarySchedule(classId: string, scheduleId: string) {
    return apiRequest<{ message: string }>(
      `/classes/${classId}/schedules/temporary/${scheduleId}`,
      {
        method: "DELETE",
        token: getToken(),
      },
    );
  },

  saveClassSessionContent(
    classId: string,
    payload: SaveClassSessionContentPayload,
  ) {
    return apiRequest<ClassSessionContent>(
      `/classes/${classId}/schedules/session-content`,
      {
        method: "POST",
        token: getToken(),
        body: JSON.stringify(payload),
      },
    );
  },

  searchStudents(search: string) {
    return apiRequest<Student[]>(`/students${buildQuery({ limit: "12", search })}`, {
      token: getToken(),
    });
  },

  createStudent(payload: CreateStudentPayload) {
    return apiRequest<Student>("/students", {
      method: "POST",
      token: getToken(),
      body: JSON.stringify(payload),
    });
  },

  updateStudent(studentId: string, payload: UpdateStudentPayload) {
    return apiRequest<Student>(`/students/${studentId}`, {
      method: "PATCH",
      token: getToken(),
      body: JSON.stringify(payload),
    });
  },

  deleteStudent(studentId: string, mode: DeleteStudentMode) {
    const params = new URLSearchParams({ mode });

    return apiRequest<{ message: string }>(
      `/students/${studentId}?${params.toString()}`,
      {
        method: "DELETE",
        token: getToken(),
      },
    );
  },

  deleteStudents(studentIds: string[], mode: DeleteStudentMode) {
    return apiRequest<StudentBulkDeleteResult>("/students/bulk-delete", {
      method: "POST",
      token: getToken(),
      body: JSON.stringify({ mode, studentIds }),
    });
  },

  uploadStudentAvatar(file: File) {
    const formData = new FormData();
    formData.append("file", file);

    return apiRequest<{ url: string; publicId: string }>("/students/avatar", {
      method: "POST",
      token: getToken(),
      body: formData,
    });
  },

  enrollExistingStudent(classId: string, studentId: string) {
    return apiRequest<EnrollmentResponse>(`/classes/${classId}/students`, {
      method: "POST",
      token: getToken(),
      body: JSON.stringify({ studentId }),
    });
  },

  enrollExistingStudents(classId: string, studentIds: string[]) {
    return apiRequest<EnrollmentBulkResponse>(
      `/classes/${classId}/students/bulk`,
      {
        method: "POST",
        token: getToken(),
        body: JSON.stringify({ studentIds }),
      },
    );
  },

  createStudentAndEnroll(classId: string, payload: CreateStudentPayload) {
    return apiRequest<EnrollmentResponse>(
      `/classes/${classId}/students/new`,
      {
        method: "POST",
        token: getToken(),
        body: JSON.stringify(payload),
      },
    );
  },

  removeStudentFromClass(classId: string, studentId: string) {
    return apiRequest<{ message: string }>(
      `/classes/${classId}/students/${studentId}`,
      {
        method: "DELETE",
        token: getToken(),
      },
    );
  },

  removeStudentsFromClass(classId: string, studentIds: string[]) {
    return apiRequest<RemoveStudentsBulkResponse>(
      `/classes/${classId}/students/bulk-remove`,
      {
        method: "POST",
        token: getToken(),
        body: JSON.stringify({ studentIds }),
      },
    );
  },

  getTeacherWeekSchedule(weekStart?: string) {
    const params = new URLSearchParams();

    if (weekStart) {
      params.set("weekStart", weekStart);
    }

    const queryString = params.toString();

    return apiRequest<TeacherWeekSchedule>(
      `/schedules/week${queryString ? `?${queryString}` : ""}`,
      {
        token: getToken(),
      },
    );
  },

  getAttendance(
    classId: string,
    date: string,
    startTime: string,
    endTime: string,
  ) {
    const params = new URLSearchParams({
      date,
      startTime,
      endTime,
    });

    return apiRequest<AttendanceResponse>(
      `/classes/${classId}/attendance?${params.toString()}`,
      {
        token: getToken(),
      },
    );
  },

  getAttendanceOverview: async (classId: string) => {
    return apiRequest<Record<string, { present: number, absent: number, excused: number, total: number }>>(`/classes/${classId}/attendance-overview`, {
      method: "GET",
      token: getToken(),
    });
  },

  takeAttendance(classId: string, payload: TakeAttendancePayload) {
    return apiRequest<AttendanceResponse>(`/classes/${classId}/attendance`, {
      method: "POST",
      token: getToken(),
      body: JSON.stringify(payload),
    });
  },

  getAttendanceSheet(classId: string) {
    return apiRequest<AttendanceSheetResponse>(`/classes/${classId}/attendance-sheet`, {
      method: "GET",
      token: getToken(),
    });
  },

  takeAttendanceBatch(classId: string, payload: TakeAttendanceBatchPayload) {
    return apiRequest<{ message: string; updatedSessions: number }>(`/classes/${classId}/attendance-batch`, {
      method: "POST",
      token: getToken(),
      body: JSON.stringify(payload),
    });
  },

  // --- Exam Management ---
  getExamSheet(classId: string) {
    return apiRequest<ExamSheetResponse>(`/classes/${classId}/exam-sheet`, {
      method: "GET",
      token: getToken(),
    });
  },

  createExam(classId: string, payload: CreateExamPayload) {
    return apiRequest<Exam>(`/classes/${classId}/exams`, {
      method: "POST",
      token: getToken(),
      body: JSON.stringify(payload),
    });
  },

  updateExam(classId: string, examId: string, payload: UpdateExamPayload) {
    return apiRequest<Exam>(`/classes/${classId}/exams/${examId}`, {
      method: "PATCH",
      token: getToken(),
      body: JSON.stringify(payload),
    });
  },

  deleteExam(classId: string, examId: string) {
    return apiRequest<{ message: string }>(`/classes/${classId}/exams/${examId}`, {
      method: "DELETE",
      token: getToken(),
    });
  },

  uploadExamFile(classId: string, file: File) {
    const formData = new FormData();
    formData.append("file", file);

    return apiRequest<{ url: string; publicId: string }>(`/classes/${classId}/exams/file`, {
      method: "POST",
      token: getToken(),
      body: formData,
    });
  },

  uploadExamEvidenceImage(classId: string, file: File) {
    const formData = new FormData();
    formData.append("file", file);

    return apiRequest<{ url: string; publicId: string }>(`/classes/${classId}/exam-scores/evidence`, {
      method: "POST",
      token: getToken(),
      body: formData,
    });
  },

  takeExamScoresBatch(classId: string, payload: TakeExamScoresBatchPayload) {
    return apiRequest<{ message: string }>(`/classes/${classId}/exam-scores`, {
      method: "POST",
      token: getToken(),
      body: JSON.stringify(payload),
    });
  },

  getBillingOverview(
    classId: string,
    filters: { fromDate?: string; toDate?: string } = {},
  ) {
    return apiRequest<BillingOverview>(
      `/classes/${classId}/billing/overview${buildQuery(filters)}`,
      {
        token: getToken(),
      },
    );
  },

  getBillingCandidates(
    classId: string,
    studentId: string,
    filters: { fromDate?: string; toDate?: string } = {},
  ) {
    return apiRequest<BillingCandidates>(
      `/classes/${classId}/students/${studentId}/billing-candidates${buildQuery(filters)}`,
      {
        token: getToken(),
      },
    );
  },

  getStudentBillingOverview(
    studentId: string,
    filters: { classIds?: string[]; fromDate?: string; toDate?: string } = {},
  ) {
    return apiRequest<StudentBillingOverview>(
      `/students/${studentId}/billing/overview${buildQuery(filters)}`,
      {
        token: getToken(),
      },
    );
  },

  getStudentBillingCandidates(
    studentId: string,
    filters: { classIds?: string[]; fromDate?: string; toDate?: string } = {},
  ) {
    return apiRequest<BillingCandidates>(
      `/students/${studentId}/billing-candidates${buildQuery(filters)}`,
      {
        token: getToken(),
      },
    );
  },

  previewReceipt(
    classId: string,
    studentId: string,
    payload: IssueReceiptPayload,
  ) {
    return apiRequest<ReceiptPreviewResponse>(
      `/classes/${classId}/students/${studentId}/receipts/preview`,
      {
        method: "POST",
        token: getToken(),
        body: JSON.stringify(payload),
      },
    );
  },

  issueReceipt(classId: string, studentId: string, payload: IssueReceiptPayload) {
    return apiRequest<ReceiptDetail>(
      `/classes/${classId}/students/${studentId}/receipts`,
      {
        method: "POST",
        token: getToken(),
        body: JSON.stringify(payload),
      },
    );
  },

  previewStudentReceipt(studentId: string, payload: IssueReceiptPayload) {
    return apiRequest<ReceiptPreviewResponse>(
      `/students/${studentId}/receipts/preview`,
      {
        method: "POST",
        token: getToken(),
        body: JSON.stringify(payload),
      },
    );
  },

  issueStudentReceipt(studentId: string, payload: IssueReceiptPayload) {
    return apiRequest<ReceiptDetail>(`/students/${studentId}/receipts`, {
      method: "POST",
      token: getToken(),
      body: JSON.stringify(payload),
    });
  },

  async listReceipts(
    filters: {
      classId?: string;
      studentId?: string;
      paymentStatus?: PaymentStatus;
      fromDate?: string;
      toDate?: string;
    } = {},
  ) {
    const receipts = await apiRequest<ReceiptListItem[]>(
      `/receipts${buildQuery(filters)}`,
      {
        token: getToken(),
      },
    );

    return receipts.filter((receipt) => receipt.paymentStatus !== "cancelled");
  },

  getReceiptDownload(receiptId: string): Promise<ReceiptDownloadResponse> {
    return apiBlobRequest(
      `/receipts/${receiptId}/download`,
      {
        token: getToken(),
      },
    );
  },

  downloadReceipts(payload: ReceiptBulkDownloadPayload): Promise<ReceiptDownloadResponse> {
    return apiBlobRequest("/receipts/download-bulk", {
      method: "POST",
      token: getToken(),
      body: JSON.stringify(payload),
    });
  },

  retryReceiptPdf(receiptId: string) {
    return apiRequest<ReceiptDetail>(`/receipts/${receiptId}/render-pdf`, {
      method: "POST",
      token: getToken(),
    });
  },

  updateReceiptPayment(
    receiptId: string,
    payload: UpdateReceiptPaymentPayload,
  ) {
    return apiRequest<ReceiptDetail>(`/receipts/${receiptId}/payment`, {
      method: "PATCH",
      token: getToken(),
      body: JSON.stringify(payload),
    });
  },

  cancelReceipt(receiptId: string) {
    return apiRequest<ReceiptDetail>(`/receipts/${receiptId}`, {
      method: "DELETE",
      token: getToken(),
    });
  },

  uploadReceiptPaymentProof(receiptId: string, file: File) {
    const formData = new FormData();
    formData.append("file", file);

    return apiRequest<{ url: string; publicId: string }>(
      `/receipts/${receiptId}/payment-proof`,
      {
        method: "POST",
        token: getToken(),
        body: formData,
      },
    );
  },
};
