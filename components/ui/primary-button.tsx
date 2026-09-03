import type { ButtonHTMLAttributes, ReactNode } from "react";

type PrimaryButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  icon?: ReactNode;
};

export function PrimaryButton({
  children,
  icon,
  className = "",
  disabled,
  ...props
}: PrimaryButtonProps) {
  return (
    <button
      className={`group relative inline-flex h-[56px] w-full items-center justify-center gap-2.5 overflow-hidden rounded-[var(--radius-md)] bg-gradient-to-b from-[var(--brand-400)] to-[var(--brand-600)] px-6 text-[15px] font-bold text-white shadow-[var(--shadow-brand)] transition-all duration-300 hover:from-[var(--brand-300)] hover:to-[var(--brand-500)] hover:shadow-[var(--shadow-brand-lg)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-300)] focus-visible:ring-offset-2 active:scale-[0.97] disabled:pointer-events-none disabled:from-[var(--neutral-300)] disabled:to-[var(--neutral-400)] disabled:shadow-none disabled:text-[var(--neutral-100)] ${className}`}
      disabled={disabled}
      {...props}
    >
      {/* Shimmer overlay on hover */}
      <span className="pointer-events-none absolute inset-0 -translate-x-full bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.15),transparent)] transition-transform duration-700 ease-out group-hover:translate-x-full" />
      {icon}
      <span className="relative">{children}</span>
    </button>
  );
}
