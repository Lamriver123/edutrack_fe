"use client";

import { type FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BadgeCheck, Mail, MailCheck, RefreshCw } from "lucide-react";
import { authApi } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";
import { tokenStorage } from "@/lib/auth/token-storage";
import { FormField } from "@/components/ui/form-field";
import { OtpCodeInput } from "@/components/auth/otp-code-input";
import { PrimaryButton } from "@/components/ui/primary-button";

type VerifyOtpFormProps = {
  initialEmail?: string;
};

const OTP_LENGTH = 6;

export function VerifyOtpForm({ initialEmail = "" }: VerifyOtpFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState(initialEmail);
  const [otpDigits, setOtpDigits] = useState<string[]>(
    Array(OTP_LENGTH).fill(""),
  );
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const otp = otpDigits.join("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setIsSubmitting(true);

    try {
      const result = await authApi.verifyOtp({ email, otp });
      tokenStorage.setSession(result.accessToken, result.user);
      router.replace("/dashboard");
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Xác thực OTP chưa thành công. Vui lòng thử lại.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResendOtp() {
    setError("");
    setMessage("");
    setIsResending(true);

    try {
      const result = await authApi.resendOtp({ email });
      if (result.email) {
        tokenStorage.setPendingEmail(result.email);
      }
      setMessage(result.message);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Chưa thể gửi lại OTP. Vui lòng thử lại.",
      );
    } finally {
      setIsResending(false);
    }
  }

  return (
    <form className="stagger grid gap-6" onSubmit={handleSubmit}>
      <div>
        <div className="mb-4 inline-flex size-12 items-center justify-center rounded-[var(--radius-md)] bg-gradient-to-b from-[var(--accent-100)] to-[var(--accent-200)] text-[var(--accent-500)] shadow-[var(--shadow-sm)]">
          <MailCheck size={20} />
        </div>
        <h2 className="text-[26px] font-extrabold leading-tight tracking-tight text-[var(--brand-950)]">
          Xác thực email
        </h2>
        <p className="mt-2.5 text-[15px] leading-7 text-[var(--neutral-500)]">
          Mã OTP đã được gửi đến email giáo viên.
        </p>
      </div>

      <FormField
        id="email"
        label="Email"
        type="email"
        autoComplete="email"
        leadingIcon={<Mail size={17} />}
        placeholder="giaovien@example.com"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        required
      />

      <OtpCodeInput
        autoFocus
        idPrefix="otp"
        value={otpDigits}
        onChange={setOtpDigits}
      />

      {message ? (
        <div className="animate-scale-in rounded-[var(--radius-sm)] border border-[var(--success-border)] bg-[var(--success-bg)] px-4 py-3.5 text-[14px] font-medium leading-relaxed text-[var(--success-text)]">
          {message}
        </div>
      ) : null}

      {error ? (
        <div className="animate-scale-in rounded-[var(--radius-sm)] border border-[var(--error-border)] bg-[var(--error-bg)] px-4 py-3.5 text-[14px] font-medium leading-relaxed text-[var(--error-text)]">
          {error}
        </div>
      ) : null}

      <PrimaryButton
        disabled={isSubmitting || otp.length < OTP_LENGTH}
        icon={<BadgeCheck size={17} />}
        type="submit"
      >
        {isSubmitting ? "Đang xác thực..." : "Xác thực"}
      </PrimaryButton>

      <button
        className="group inline-flex h-[56px] items-center justify-center gap-2.5 rounded-[var(--radius-sm)] border border-[var(--neutral-200)] bg-white px-4 text-[15px] font-semibold text-[var(--neutral-600)] transition-all duration-200 hover:border-[var(--brand-300)] hover:bg-[var(--brand-50)] hover:text-[var(--brand-600)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-300)] focus-visible:ring-offset-2 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50"
        disabled={isResending || !email}
        onClick={handleResendOtp}
        type="button"
      >
        <RefreshCw
          size={16}
          className={isResending ? "animate-spin-slow" : "transition-transform duration-300 group-hover:rotate-45"}
        />
        <span>{isResending ? "Đang gửi..." : "Gửi lại OTP"}</span>
      </button>

      <p className="rounded-[var(--radius-sm)] border border-[var(--neutral-200)] bg-[var(--neutral-50)] px-4 py-3.5 text-center text-[14px] text-[var(--neutral-500)]">
        Đã xác thực?{" "}
        <Link
          className="font-semibold text-[var(--brand-600)] transition-colors hover:text-[var(--brand-500)]"
          href="/login"
        >
          Đăng nhập
        </Link>
      </p>
    </form>
  );
}
