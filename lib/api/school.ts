import { tokenStorage } from "@/lib/auth/token-storage";
import type {
  Classroom,
  ClassroomDetail,
  ClassScheduleOverview,
  ClassSessionContent,
  ClassTemporarySchedule,
  CreateClassPayload,
  CreateStudentPayload,
  CreateTemporarySchedulePayload,
  DeleteStudentMode,
  EnrollmentResponse,
  LatestFixedSchedule,
  SaveClassSessionContentPayload,
  SaveFixedSchedulePayload,
  Student,
  TeacherWeekSchedule,
  UpdateClassPayload,
  UpdateStudentPayload,
  UpdateTemporarySchedulePayload,
} from "@/types/school";
import { apiRequest } from "./client";

function getToken() {
  return tokenStorage.getAccessToken();
}

export const schoolApi = {
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
    const params = new URLSearchParams({
      limit: "12",
    });

    if (search.trim()) {
      params.set("search", search.trim());
    }

    return apiRequest<Student[]>(`/students?${params.toString()}`, {
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
};
