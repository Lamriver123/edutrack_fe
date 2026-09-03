import type { Gender, Student } from "@/types/school";

export const DEFAULT_BOY_AVATAR_URL =
  "https://img.magnific.com/premium-psd/student-boy-avatar-3d-icon_1723-409.jpg";
export const DEFAULT_GIRL_AVATAR_URL =
  "https://png.pngtree.com/png-vector/20250709/ourmid/pngtree-adorable-school-girl-cartoon-with-backpack-pointing-up-cute-chibi-vector-png-image_16736310.webp";

export const CLASS_COLOR_OPTIONS = [
  { accent: "#4f46e5", background: "#eef2ff", label: "Tím xanh" },
  { accent: "#0f766e", background: "#ecfdf5", label: "Xanh ngọc" },
  { accent: "#c2410c", background: "#fff7ed", label: "Cam đất" },
  { accent: "#be185d", background: "#fdf2f8", label: "Hồng sen" },
  { accent: "#0369a1", background: "#f0f9ff", label: "Xanh biển" },
  { accent: "#7c3aed", background: "#f5f3ff", label: "Tím đậm" },
  { accent: "#15803d", background: "#f0fdf4", label: "Xanh lá" },
  { accent: "#475569", background: "#f8fafc", label: "Ghi xanh" },
] as const;

const vndSuffix = "VND";

export function formatMoney(value: number) {
  if (!Number.isFinite(value)) {
    return `0${vndSuffix}`;
  }

  return `${formatCurrencyDigits(String(Math.max(0, Math.round(value))))}${vndSuffix}`;
}

export function formatCurrencyInput(value: string) {
  const digits = getCurrencyDigits(value);

  if (!digits) {
    return "";
  }

  return formatCurrencyDigits(digits);
}

export function parseCurrencyInput(value: string) {
  const digits = getCurrencyDigits(value);

  if (!digits) {
    return null;
  }

  const parsedValue = Number(digits);

  return Number.isSafeInteger(parsedValue) ? parsedValue : null;
}

function getCurrencyDigits(value: string) {
  return value.replace(/\D/g, "").replace(/^0+(?=\d)/, "");
}

function formatCurrencyDigits(digits: string) {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

export function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Có lỗi xảy ra. Vui lòng thử lại.";
}

export function getGenderLabel(gender?: Gender) {
  if (gender === "female") {
    return "Nữ";
  }

  if (gender === "male") {
    return "Nam";
  }

  return "Khác";
}

export function getStudentAvatar(student: Student) {
  return (
    student.avatarUrl ||
    (student.gender === "female"
      ? DEFAULT_GIRL_AVATAR_URL
      : DEFAULT_BOY_AVATAR_URL)
  );
}

export function getDefaultAvatarByGender(gender: Gender) {
  return gender === "female" ? DEFAULT_GIRL_AVATAR_URL : DEFAULT_BOY_AVATAR_URL;
}

export function normalizeVisibleText(value?: string) {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d");
}
