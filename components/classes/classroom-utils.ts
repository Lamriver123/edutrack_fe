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

export type ClassColorSuggestion = {
  accent: string;
  colorIndex: number;
  label: string;
};

/**
 * Familiar anchor colors are mixed with generated hues when ranking
 * recommendations. The regular palette remains unchanged so existing classes
 * keep their color.
 */
export const CLASS_COLOR_SUGGESTION_OPTIONS: readonly ClassColorSuggestion[] = [
  { accent: "#6366f1", colorIndex: 0, label: "Tím hoa cà" },
  { accent: "#14b8a6", colorIndex: 1, label: "Ngọc lam" },
  { accent: "#f97316", colorIndex: 2, label: "Cam sáng" },
  { accent: "#ec4899", colorIndex: 3, label: "Hồng phấn" },
  { accent: "#0ea5e9", colorIndex: 4, label: "Xanh trời" },
  { accent: "#a855f7", colorIndex: 5, label: "Tím sáng" },
  { accent: "#22c55e", colorIndex: 6, label: "Xanh non" },
  { accent: "#64748b", colorIndex: 7, label: "Ghi lam" },
  { accent: "#a66a3f", colorIndex: 2, label: "Nâu caramel" },
  { accent: "#d97706", colorIndex: 2, label: "Hổ phách" },
  { accent: "#f43f5e", colorIndex: 3, label: "San hô" },
  { accent: "#06b6d4", colorIndex: 4, label: "Xanh cyan" },
  { accent: "#84cc16", colorIndex: 6, label: "Xanh chanh" },
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
  const option = [
    ...CLASS_COLOR_OPTIONS,
    ...CLASS_COLOR_SUGGESTION_OPTIONS,
  ].find(
    (color) => color.accent.toLowerCase() === normalizedColor,
  );

  return option?.label ?? getGeneratedColorLabel(normalizedColor);
}

/**
 * Generates medium-light hues, then picks them greedily by perceptual distance
 * from existing classes and from the other recommendations. `variation`
 * rotates the hue wheel and tone values so the UI can offer another valid set.
 */
export function getSuggestedClassColors(
  usedColorHexes: Array<string | null | undefined>,
  count = 3,
  variation = 0,
) {
  const normalizedVariation = Math.max(0, Math.floor(variation) || 0);
  const remaining = buildAdaptiveClassColorCandidates(normalizedVariation);
  const suggestionCount = Math.max(
    0,
    Math.min(Math.floor(count), remaining.length),
  );
  const usedColors = usedColorHexes
    .map((color) => color?.trim().toLowerCase())
    .filter((color): color is string =>
      Boolean(color && hexColorPattern.test(color)),
    );
  const selected: ClassColorSuggestion[] = [];
  const preferredHue = normalizeHue(
    235 + normalizedVariation * 137.508,
  );

  while (selected.length < suggestionCount && remaining.length) {
    const comparisonColors = [
      ...usedColors,
      ...selected.map((color) => color.accent),
    ];
    let bestIndex = 0;
    let bestScore = Number.NEGATIVE_INFINITY;
    const targetHue = normalizeHue(preferredHue + selected.length * 120);

    remaining.forEach((candidate, candidateIndex) => {
      const normalizedCandidate = candidate.accent.toLowerCase();
      const usedCount = usedColors.filter(
        (color) => color === normalizedCandidate,
      ).length;
      const minimumDistance = comparisonColors.length
        ? Math.min(
            ...comparisonColors.map((color) =>
              getPerceptualColorDistance(normalizedCandidate, color),
            ),
          )
        : 1;
      const candidateHue = rgbToHsl(hexToRgb(normalizedCandidate)).hue;
      const preferredHueDistance = getCircularHueDistance(
        candidateHue,
        targetHue,
      );
      const preferenceBonus =
        (1 - preferredHueDistance / 180) *
        (comparisonColors.length ? 0.12 : 0.2);
      const score = minimumDistance + preferenceBonus - usedCount * 10;

      if (score > bestScore) {
        bestIndex = candidateIndex;
        bestScore = score;
      }
    });

    selected.push(remaining.splice(bestIndex, 1)[0]);
  }

  return selected;
}

function buildAdaptiveClassColorCandidates(variation: number) {
  const huePhase = (variation * 7) % 10;
  const generatedColors = Array.from({ length: 36 }, (_, index) => {
    const hue = normalizeHue(huePhase + index * 10);
    const isBrownHue = hue >= 20 && hue < 40;
    const saturation = isBrownHue
      ? 46 + ((index + variation) % 2) * 4
      : 62 + ((index + variation) % 3) * 4;
    const lightness = isBrownHue
      ? 45 + ((index + variation) % 2) * 3
      : 52 + ((index + variation) % 3) * 3;
    const accent = hslToHex({ hue, lightness, saturation });

    return {
      accent,
      colorIndex: getClassColorIndexForHue(hue),
      label: getGeneratedColorLabel(accent),
    } satisfies ClassColorSuggestion;
  });
  const seenColors = new Set<string>();

  return [...generatedColors, ...CLASS_COLOR_SUGGESTION_OPTIONS].filter(
    (color) => {
      const normalizedColor = color.accent.toLowerCase();

      if (seenColors.has(normalizedColor)) {
        return false;
      }

      seenColors.add(normalizedColor);
      return true;
    },
  );
}

function getClassColorIndexForHue(hue: number) {
  if (hue < 18 || hue >= 340) {
    return 3;
  }

  if (hue < 72) {
    return 2;
  }

  if (hue < 165) {
    return 6;
  }

  if (hue < 195) {
    return 1;
  }

  if (hue < 225) {
    return 4;
  }

  if (hue < 260) {
    return 0;
  }

  if (hue < 305) {
    return 5;
  }

  return 3;
}

function getGeneratedColorLabel(colorHex: string) {
  const { hue, lightness, saturation } = rgbToHsl(hexToRgb(colorHex));

  if (saturation < 0.18) {
    return "Ghi sáng";
  }

  if (hue < 15 || hue >= 345) {
    return "Đỏ san hô";
  }

  if (hue < 42) {
    return lightness < 0.51 && saturation < 0.62
      ? "Nâu caramel"
      : "Cam ấm";
  }

  if (hue < 72) {
    return "Vàng mật ong";
  }

  if (hue < 155) {
    return "Xanh lá";
  }

  if (hue < 190) {
    return "Xanh ngọc";
  }

  if (hue < 220) {
    return "Xanh trời";
  }

  if (hue < 255) {
    return "Xanh tím";
  }

  if (hue < 295) {
    return "Tím hoa cà";
  }

  return "Hồng phấn";
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

function getPerceptualColorDistance(firstColor: string, secondColor: string) {
  const first = rgbToOklab(hexToRgb(firstColor));
  const second = rgbToOklab(hexToRgb(secondColor));

  return Math.hypot(
    first.lightness - second.lightness,
    first.greenRed - second.greenRed,
    first.blueYellow - second.blueYellow,
  );
}

function rgbToOklab({ r, g, b }: { r: number; g: number; b: number }) {
  const toLinearChannel = (channel: number) => {
    const normalizedChannel = channel / 255;

    return normalizedChannel <= 0.04045
      ? normalizedChannel / 12.92
      : ((normalizedChannel + 0.055) / 1.055) ** 2.4;
  };
  const linearRed = toLinearChannel(r);
  const linearGreen = toLinearChannel(g);
  const linearBlue = toLinearChannel(b);
  const long = Math.cbrt(
    0.4122214708 * linearRed +
      0.5363325363 * linearGreen +
      0.0514459929 * linearBlue,
  );
  const medium = Math.cbrt(
    0.2119034982 * linearRed +
      0.6806995451 * linearGreen +
      0.1073969566 * linearBlue,
  );
  const short = Math.cbrt(
    0.0883024619 * linearRed +
      0.2817188376 * linearGreen +
      0.6299787005 * linearBlue,
  );

  return {
    lightness: 0.2104542553 * long + 0.793617785 * medium - 0.0040720468 * short,
    greenRed: 1.9779984951 * long - 2.428592205 * medium + 0.4505937099 * short,
    blueYellow:
      0.0259040371 * long + 0.7827717662 * medium - 0.808675766 * short,
  };
}

function rgbToHsl({ r, g, b }: { r: number; g: number; b: number }) {
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;
  const maximum = Math.max(red, green, blue);
  const minimum = Math.min(red, green, blue);
  const delta = maximum - minimum;
  const lightness = (maximum + minimum) / 2;
  let hue = 0;

  if (delta) {
    if (maximum === red) {
      hue = 60 * (((green - blue) / delta) % 6);
    } else if (maximum === green) {
      hue = 60 * ((blue - red) / delta + 2);
    } else {
      hue = 60 * ((red - green) / delta + 4);
    }
  }

  return {
    hue: normalizeHue(hue),
    lightness,
    saturation:
      delta === 0 ? 0 : delta / (1 - Math.abs(2 * lightness - 1)),
  };
}

function hslToHex({
  hue,
  lightness,
  saturation,
}: {
  hue: number;
  lightness: number;
  saturation: number;
}) {
  const normalizedLightness = lightness / 100;
  const normalizedSaturation = saturation / 100;
  const chroma =
    (1 - Math.abs(2 * normalizedLightness - 1)) * normalizedSaturation;
  const hueSection = normalizeHue(hue) / 60;
  const secondary = chroma * (1 - Math.abs((hueSection % 2) - 1));
  let red = 0;
  let green = 0;
  let blue = 0;

  if (hueSection < 1) {
    [red, green] = [chroma, secondary];
  } else if (hueSection < 2) {
    [red, green] = [secondary, chroma];
  } else if (hueSection < 3) {
    [green, blue] = [chroma, secondary];
  } else if (hueSection < 4) {
    [green, blue] = [secondary, chroma];
  } else if (hueSection < 5) {
    [red, blue] = [secondary, chroma];
  } else {
    [red, blue] = [chroma, secondary];
  }

  const match = normalizedLightness - chroma / 2;

  return rgbToHex({
    r: Math.round((red + match) * 255),
    g: Math.round((green + match) * 255),
    b: Math.round((blue + match) * 255),
  });
}

function normalizeHue(hue: number) {
  return ((hue % 360) + 360) % 360;
}

function getCircularHueDistance(firstHue: number, secondHue: number) {
  const difference = Math.abs(normalizeHue(firstHue) - normalizeHue(secondHue));

  return Math.min(difference, 360 - difference);
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
