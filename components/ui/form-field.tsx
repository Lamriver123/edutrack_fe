import type { InputHTMLAttributes, ReactNode } from "react";

type FormFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  leadingIcon?: ReactNode;
  trailing?: ReactNode;
  variant?: "default" | "auth";
};

export function FormField({
  label,
  error,
  id,
  className = "",
  leadingIcon,
  trailing,
  variant = "default",
  ...props
}: FormFieldProps) {
  const isAuthVariant = variant === "auth";

  return (
    <div className="grid gap-2">
      <label
        className={
          isAuthVariant
            ? "text-[13px] font-bold text-[var(--neutral-700)]"
            : "text-[14px] font-bold text-[var(--neutral-600)]"
        }
        htmlFor={id}
      >
        {label}
      </label>
      <div className="group relative">
        {leadingIcon ? (
          <span
            className={
              isAuthVariant
                ? "pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-[var(--brand-500)] transition-colors duration-200 group-focus-within:text-[var(--brand-600)] sm:left-4"
                : "pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-[var(--neutral-400)] transition-colors duration-200 group-focus-within:text-[var(--brand-500)]"
            }
          >
            {leadingIcon}
          </span>
        ) : null}
        <input
          id={id}
          className={`${
            isAuthVariant
              ? "h-[50px] w-full rounded-[12px] border border-[var(--neutral-200)] bg-[var(--neutral-50)]/80 px-3 text-[15px] font-medium text-[var(--foreground)] outline-none transition-all duration-200 placeholder:font-normal placeholder:text-[var(--neutral-400)] hover:border-[var(--brand-200)] hover:bg-white focus:border-[var(--brand-500)] focus:bg-white focus:shadow-[0_0_0_4px_rgba(99,102,241,0.11)] sm:h-[56px] sm:rounded-[14px] sm:px-4 sm:text-[16px]"
              : "h-[56px] w-full rounded-[var(--radius-md)] border border-[var(--neutral-200)] bg-white/70 px-4 text-[15px] font-semibold text-[var(--foreground)] outline-none transition-all duration-200 placeholder:font-normal placeholder:text-[var(--neutral-400)] hover:border-[var(--brand-300)] hover:bg-white focus:border-[var(--brand-500)] focus:bg-white focus:shadow-[0_0_0_4px_rgba(99,102,241,0.1)]"
          } ${leadingIcon ? (isAuthVariant ? "pl-11 sm:pl-12" : "pl-11") : ""} ${
            trailing ? (isAuthVariant ? "pr-11 sm:pr-12" : "pr-12") : ""
          } ${error ? "border-[var(--error-text)] focus:shadow-[0_0_0_4px_rgba(185,28,28,0.08)]" : ""} ${className}`}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          {...props}
        />
        {trailing ? (
          <span
            className={`absolute inset-y-0 flex items-center ${
              isAuthVariant ? "right-2.5 sm:right-3" : "right-1.5"
            }`}
          >
            {trailing}
          </span>
        ) : null}
      </div>
      {error ? (
        <span
          className="text-[14px] font-semibold text-[var(--error-text)]"
          id={`${id}-error`}
        >
          {error}
        </span>
      ) : null}
    </div>
  );
}
