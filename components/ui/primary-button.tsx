import type { ButtonHTMLAttributes, ReactNode } from "react";

type PrimaryButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  icon?: ReactNode;
  iconPosition?: "start" | "end";
  variant?: "default" | "auth";
};

export function PrimaryButton({
  children,
  icon,
  iconPosition = "start",
  variant = "default",
  className = "",
  disabled,
  ...props
}: PrimaryButtonProps) {
  const isAuthVariant = variant === "auth";
  const iconElement = icon
    ? isAuthVariant
      ? <span className="relative grid place-items-center">{icon}</span>
      : icon
    : null;

  return (
    <button
      className={`${
        isAuthVariant
          ? "group relative inline-flex h-[56px] w-full items-center justify-center gap-2.5 overflow-hidden rounded-[14px] bg-[linear-gradient(135deg,#6366f1_0%,#4f46e5_55%,#4338ca_100%)] px-6 text-[15px] font-bold text-white shadow-[var(--shadow-brand)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[var(--shadow-brand-lg)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-300)] focus-visible:ring-offset-2 active:translate-y-0 active:scale-[0.98] disabled:pointer-events-none disabled:translate-y-0 disabled:bg-[var(--neutral-300)] disabled:bg-none disabled:shadow-none disabled:text-[var(--neutral-100)]"
          : "group relative inline-flex h-[56px] w-full items-center justify-center gap-2.5 overflow-hidden rounded-[var(--radius-md)] bg-gradient-to-b from-[var(--brand-400)] to-[var(--brand-600)] px-6 text-[15px] font-bold text-white shadow-[var(--shadow-brand)] transition-all duration-300 hover:from-[var(--brand-300)] hover:to-[var(--brand-500)] hover:shadow-[var(--shadow-brand-lg)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-300)] focus-visible:ring-offset-2 active:scale-[0.97] disabled:pointer-events-none disabled:from-[var(--neutral-300)] disabled:to-[var(--neutral-400)] disabled:shadow-none disabled:text-[var(--neutral-100)]"
      } ${className}`}
      disabled={disabled}
      {...props}
    >
      {/* Shimmer overlay on hover */}
      <span className="pointer-events-none absolute inset-0 -translate-x-full bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.15),transparent)] transition-transform duration-700 ease-out group-hover:translate-x-full" />
      {iconPosition === "start" ? iconElement : null}
      <span className="relative">{children}</span>
      {iconPosition === "end" ? iconElement : null}
    </button>
  );
}
