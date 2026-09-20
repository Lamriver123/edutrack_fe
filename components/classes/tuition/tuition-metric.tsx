import type { ReactNode } from "react";

type TuitionMetricTone = "primary" | "info" | "warning" | "success";

const toneClasses: Record<
  TuitionMetricTone,
  { card: string; icon: string; value: string }
> = {
  primary: {
    card: "border-indigo-100 bg-indigo-50",
    icon: "bg-indigo-100 text-indigo-600",
    value: "text-indigo-950",
  },
  info: {
    card: "border-cyan-100 bg-cyan-50",
    icon: "bg-cyan-100 text-cyan-700",
    value: "text-cyan-950",
  },
  warning: {
    card: "border-amber-200 bg-amber-50",
    icon: "bg-amber-100 text-amber-700",
    value: "text-amber-950",
  },
  success: {
    card: "border-emerald-200 bg-emerald-50",
    icon: "bg-emerald-100 text-emerald-700",
    value: "text-emerald-950",
  },
};

export function TuitionMetric({
  icon,
  label,
  tone,
  value,
}: {
  icon: ReactNode;
  label: string;
  tone: TuitionMetricTone;
  value: string;
}) {
  const colors = toneClasses[tone];

  return (
    <div
      className={`grid grid-cols-[44px_1fr] items-center gap-3 rounded-md border p-3 ${colors.card}`}
    >
      <span
        className={`grid size-11 place-items-center rounded-md ${colors.icon}`}
      >
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[13px] font-bold text-[var(--neutral-500)]">
          {label}
        </span>
        <strong
          className={`block truncate text-[18px] font-extrabold ${colors.value}`}
        >
          {value}
        </strong>
      </span>
    </div>
  );
}
