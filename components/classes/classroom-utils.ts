import type { Gender, Student } from "@/types/school";

export const DEFAULT_BOY_AVATAR_URL =
  "https://img.magnific.com/premium-psd/student-boy-avatar-3d-icon_1723-409.jpg";
export const DEFAULT_GIRL_AVATAR_URL =
  "https://png.pngtree.com/png-vector/20250709/ourmid/pngtree-adorable-school-girl-cartoon-with-backpack-pointing-up-cute-chibi-vector-png-image_16736310.webp";
export const DEFAULT_CLASS_IMAGE_URL =
  "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTR-qRE8Ud2H3MA_umzUwRTCefEIGGjOmnsi5hsMnPdrg&s=10";

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

export const DEFAULT_CLASS_COLOR_HEX = CLASS_COLOR_OPTIONS[0].accent;
const hexColorPattern = /^#([0-9a-f]{6})$/i;
const vndSuffix = "VND";
const vietnamDateInputFormatter = new Intl.DateTimeFormat("en-CA", {
  day: "2-digit",
  month: "2-digit",
  timeZone: "Asia/Ho_Chi_Minh",
  year: "numeric",
});

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

export function getVietnamTodayInputDate() {
  const parts = vietnamDateInputFormatter.formatToParts(new Date());
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  return `${year}-${month}-${day}`;
}

export function toVietnamDateInputValue(value?: string | Date | null) {
  if (!value) {
    return "";
  }

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const parts = vietnamDateInputFormatter.formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  return year && month && day ? `${year}-${month}-${day}` : "";
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

export function normalizeClassColorHex(value?: string | null) {
  const colorHex = value?.trim().toLowerCase();

  if (!colorHex || !hexColorPattern.test(colorHex)) {
    return DEFAULT_CLASS_COLOR_HEX;
  }

  return colorHex;
}

export function getClassColorHex({
  colorHex,
  colorIndex,
}: {
  colorHex?: string | null;
  colorIndex?: number | null;
}) {
  return normalizeClassColorHex(
    colorHex || CLASS_COLOR_OPTIONS[colorIndex ?? -1]?.accent,
  );
}

export function getClassColorLabel(colorHex?: string | null) {
  const normalizedColor = normalizeClassColorHex(colorHex);
  const option = CLASS_COLOR_OPTIONS.find(
    (color) => color.accent.toLowerCase() === normalizedColor,
  );

  return option?.label ?? normalizedColor.toUpperCase();
}

export function getClassColorTheme(colorHex?: string | null) {
  const accent = normalizeClassColorHex(colorHex);

  return {
    accent,
    background: mixHexColor(accent, "#ffffff", 0.9),
    border: mixHexColor(accent, "#ffffff", 0.64),
    text: mixHexColor(accent, "#0f172a", 0.42),
  };
}

function mixHexColor(color: string, target: string, targetWeight: number) {
  const sourceRgb = hexToRgb(normalizeClassColorHex(color));
  const targetRgb = hexToRgb(target);
  const sourceWeight = 1 - targetWeight;

  return rgbToHex({
    r: Math.round(sourceRgb.r * sourceWeight + targetRgb.r * targetWeight),
    g: Math.round(sourceRgb.g * sourceWeight + targetRgb.g * targetWeight),
    b: Math.round(sourceRgb.b * sourceWeight + targetRgb.b * targetWeight),
  });
}

function hexToRgb(color: string) {
  const normalizedColor = normalizeClassColorHex(color).slice(1);

  return {
    r: Number.parseInt(normalizedColor.slice(0, 2), 16),
    g: Number.parseInt(normalizedColor.slice(2, 4), 16),
    b: Number.parseInt(normalizedColor.slice(4, 6), 16),
  };
}

function rgbToHex({ r, g, b }: { r: number; g: number; b: number }) {
  return `#${[r, g, b]
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("")}`;
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
