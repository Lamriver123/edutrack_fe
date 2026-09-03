import type { InputHTMLAttributes, ReactNode } from "react";

type FormFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  leadingIcon?: ReactNode;
  trailing?: ReactNode;
};

export function FormField({
  label,
  error,
  id,
  className = "",
  leadingIcon,
  trailing,
  ...props
}: FormFieldProps) {
  return (
    <div className="grid gap-2">
      <label className="text-[14px] font-bold text-[var(--neutral-600)]" htmlFor={id}>
        {label}
      </label>
      <div className="group relative">
        {leadingIcon ? (
          <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-[var(--neutral-400)] transition-colors duration-200 group-focus-within:text-[var(--brand-500)]">
            {leadingIcon}
          </span>
        ) : null}
        <input
          id={id}
          className={`h-[56px] w-full rounded-[var(--radius-md)] border border-[var(--neutral-200)] bg-white/70 px-4 text-[15px] font-semibold text-[var(--foreground)] outline-none transition-all duration-200 placeholder:font-normal placeholder:text-[var(--neutral-400)] hover:border-[var(--brand-300)] hover:bg-white focus:border-[var(--brand-500)] focus:bg-white focus:shadow-[0_0_0_4px_rgba(99,102,241,0.1)] ${
            leadingIcon ? "pl-11" : ""
          } ${trailing ? "pr-12" : ""} ${error ? "border-[var(--error-text)] focus:shadow-[0_0_0_4px_rgba(185,28,28,0.08)]" : ""} ${className}`}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          {...props}
        />
        {trailing ? (
          <span className="absolute inset-y-0 right-1.5 flex items-center">
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
