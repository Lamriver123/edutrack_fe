"use client";

import {
  type ClipboardEvent,
  type KeyboardEvent,
  useRef,
} from "react";

type OtpCodeInputProps = {
  idPrefix: string;
  label?: string;
  value: string[];
  onChange: (value: string[]) => void;
  disabled?: boolean;
  autoFocus?: boolean;
};

export function OtpCodeInput({
  idPrefix,
  label = "Mã OTP",
  value,
  onChange,
  disabled = false,
  autoFocus = false,
}: OtpCodeInputProps) {
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const length = value.length;

  function focusOtpInput(index: number) {
    inputRefs.current[index]?.focus();
    inputRefs.current[index]?.select();
  }

  function updateOtpDigits(startIndex: number, rawValue: string) {
    const numbers = rawValue.replace(/\D/g, "").slice(0, length - startIndex);

    if (!numbers) {
      const next = [...value];
      next[startIndex] = "";
      onChange(next);
      return;
    }

    const next = [...value];
    numbers.split("").forEach((digit, offset) => {
      next[startIndex + offset] = digit;
    });
    onChange(next);

    const nextIndex = Math.min(startIndex + numbers.length, length - 1);
    focusOtpInput(nextIndex);
  }

  function handleOtpKeyDown(
    event: KeyboardEvent<HTMLInputElement>,
    index: number,
  ) {
    if (event.key === "Backspace" && !value[index] && index > 0) {
      event.preventDefault();
      const next = [...value];
      next[index - 1] = "";
      onChange(next);
      focusOtpInput(index - 1);
    }

    if (event.key === "ArrowLeft" && index > 0) {
      event.preventDefault();
      focusOtpInput(index - 1);
    }

    if (event.key === "ArrowRight" && index < length - 1) {
      event.preventDefault();
      focusOtpInput(index + 1);
    }
  }

  function handleOtpPaste(
    event: ClipboardEvent<HTMLInputElement>,
    index: number,
  ) {
    event.preventDefault();
    updateOtpDigits(index, event.clipboardData.getData("text"));
  }

  return (
    <div className="grid gap-2">
      <label className="text-[14px] font-bold text-[var(--neutral-600)]" htmlFor={`${idPrefix}-0`}>
        {label}
      </label>
      <div className="grid grid-cols-6 gap-2.5 sm:gap-3">
        {value.map((digit, index) => (
          <input
            aria-label={`Số OTP ${index + 1}`}
            autoFocus={autoFocus && index === 0}
            autoComplete={index === 0 ? "one-time-code" : "off"}
            className={`h-[56px] min-w-0 rounded-[var(--radius-md)] border-2 bg-white/70 text-center text-[20px] font-bold tracking-widest text-[var(--foreground)] outline-none transition-all duration-200 placeholder:text-[var(--neutral-300)] hover:border-[var(--brand-300)] hover:bg-white focus:border-[var(--brand-500)] focus:bg-white focus:shadow-[0_0_0_4px_rgba(99,102,241,0.1)] disabled:cursor-not-allowed disabled:opacity-60 sm:h-[60px] sm:text-[22px] ${
              digit
                ? "border-[var(--brand-400)] bg-white shadow-[var(--shadow-xs)]"
                : "border-[var(--neutral-200)]"
            }`}
            disabled={disabled}
            id={`${idPrefix}-${index}`}
            inputMode="numeric"
            key={`${idPrefix}-${index}`}
            maxLength={1}
            onChange={(event) => updateOtpDigits(index, event.target.value)}
            onKeyDown={(event) => handleOtpKeyDown(event, index)}
            onPaste={(event) => handleOtpPaste(event, index)}
            pattern="[0-9]"
            ref={(node) => {
              inputRefs.current[index] = node;
            }}
            type="text"
            value={digit}
          />
        ))}
      </div>
    </div>
  );
}
