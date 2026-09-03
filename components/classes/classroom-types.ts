import type {
  ClassStatus,
  CreateStudentPayload,
  Gender,
  Student,
  StudentStatus,
} from "@/types/school";

export type Notice = {
  type: "success" | "error";
  text: string;
};

export type ClassFormState = {
  name: string;
  description: string;
  imageUrl: string;
  colorIndex: number;
  regularPrice: string;
  makeupPrice: string;
  status: ClassStatus;
};

export type StudentFormState = {
  studentCode: string;
  fullName: string;
  gender: Gender;
  avatarUrl: string;
  dateOfBirth: string;
  phone: string;
  parentFullName: string;
  parentPhone: string;
  parentRelation: string;
  parentNote: string;
  address: string;
  note: string;
  status: StudentStatus;
};

export const initialClassForm: ClassFormState = {
  name: "",
  description: "",
  imageUrl: "",
  colorIndex: 0,
  regularPrice: "",
  makeupPrice: "",
  status: "active",
};

export const initialStudentForm: StudentFormState = {
  studentCode: "",
  fullName: "",
  gender: "male",
  avatarUrl: "",
  dateOfBirth: "",
  phone: "",
  parentFullName: "",
  parentPhone: "",
  parentRelation: "",
  parentNote: "",
  address: "",
  note: "",
  status: "active",
};

export function buildStudentPayload(
  form: StudentFormState,
): CreateStudentPayload {
  const parent = {
    fullName: form.parentFullName.trim() || undefined,
    phone: form.parentPhone.trim() || undefined,
    relation: form.parentRelation.trim() || undefined,
    note: form.parentNote.trim() || undefined,
  };
  const hasParentInfo = Object.values(parent).some(Boolean);

  return {
    studentCode: form.studentCode.trim() || undefined,
    fullName: form.fullName.trim(),
    gender: form.gender,
    avatarUrl: form.avatarUrl.trim() || undefined,
    dateOfBirth: form.dateOfBirth || undefined,
    phone: form.phone.trim() || undefined,
    parent: hasParentInfo ? parent : undefined,
    address: form.address.trim() || undefined,
    note: form.note.trim() || undefined,
    status: form.status,
  };
}

export function buildStudentFormFromStudent(student: Student): StudentFormState {
  return {
    studentCode: student.studentCode,
    fullName: student.fullName,
    gender: student.gender ?? "male",
    avatarUrl: student.avatarUrl ?? "",
    dateOfBirth: toDateInputValue(student.dateOfBirth),
    phone: student.phone ?? "",
    parentFullName: student.parent?.fullName ?? "",
    parentPhone: student.parent?.phone ?? "",
    parentRelation: student.parent?.relation ?? "",
    parentNote: student.parent?.note ?? "",
    address: student.address ?? "",
    note: student.note ?? "",
    status: student.status,
  };
}

function toDateInputValue(value?: string) {
  if (!value) {
    return "";
  }

  return value.slice(0, 10);
}
