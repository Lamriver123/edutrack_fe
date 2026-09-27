"use client";

import { type FormEvent, useEffect, useState } from "react";
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

function getRemainingSeconds(target?: string, now = Date.now()) {
  if (!target) {
    return 0;
  }

  const targetTime = new Date(target).getTime();

  if (!Number.isFinite(targetTime)) {
    return 0;
  }

  return Math.max(0, Math.ceil((targetTime - now) / 1000));
}

function formatCountdown(seconds: number) {
  const minutes = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const remainingSeconds = (seconds % 60).toString().padStart(2, "0");

  return `${minutes}:${remainingSeconds}`;
}

export function VerifyOtpForm({ initialEmail = "" }: VerifyOtpFormProps) {
  const router = useRouter();
  const initialPendingEmail = initialEmail || tokenStorage.getPendingEmail();
  const initialOtpState = tokenStorage.getPendingOtp(initialPendingEmail);
  const [email, setEmail] = useState(initialPendingEmail);
  const [otpExpiresAt, setOtpExpiresAt] = useState(
    initialOtpState?.otpExpiresAt ?? "",
  );
  const [otpResendAvailableAt, setOtpResendAvailableAt] = useState(
    initialOtpState?.otpResendAvailableAt ?? "",
  );
  const [now, setNow] = useState(0);
  const [otpDigits, setOtpDigits] = useState<string[]>(
    Array(OTP_LENGTH).fill(""),
  );
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const otp = otpDigits.join("");
  const otpRemainingSeconds = getRemainingSeconds(otpExpiresAt, now);
  const resendRemainingSeconds = Math.max(
    otpRemainingSeconds,
    getRemainingSeconds(otpResendAvailableAt, now),
  );
  const isClockReady = now > 0;
  const canResend =
    Boolean(email) && isClockReady && resendRemainingSeconds === 0;

  useEffect(() => {
    const updateClock = () => setNow(Date.now());
    const firstTick = window.setTimeout(updateClock, 0);
    const timer = window.setInterval(updateClock, 1000);

    return () => {
      window.clearTimeout(firstTick);
      window.clearInterval(timer);
    };
  }, []);

  function handleEmailChange(value: string) {
    setEmail(value);
    const pendingOtp = tokenStorage.getPendingOtp(value);
    setOtpExpiresAt(pendingOtp?.otpExpiresAt ?? "");
    setOtpResendAvailableAt(pendingOtp?.otpResendAvailableAt ?? "");
  }

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
    if (!canResend) {
      return;
    }

    setError("");
    setMessage("");
    setIsResending(true);

    try {
      const result = await authApi.resendOtp({ email });
      const pendingEmail = result.email ?? email;
      const nextOtpExpiresAt = result.otpExpiresAt ?? "";
      const nextOtpResendAvailableAt = result.otpResendAvailableAt ?? "";

      if (result.email) {
        setEmail(pendingEmail);
      }

      setOtpDigits(Array(OTP_LENGTH).fill(""));
      setOtpExpiresAt(nextOtpExpiresAt);
      setOtpResendAvailableAt(nextOtpResendAvailableAt);
      setNow(Date.now());
      tokenStorage.setPendingEmail(pendingEmail, {
        otpExpiresAt: nextOtpExpiresAt,
        otpResendAvailableAt: nextOtpResendAvailableAt,
      });
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
    <form className="stagger grid gap-5 sm:gap-6" onSubmit={handleSubmit}>
      <div>
        <div className="mb-3 inline-flex size-11 items-center justify-center rounded-[var(--radius-md)] bg-gradient-to-b from-[var(--accent-100)] to-[var(--accent-200)] text-[var(--accent-500)] shadow-[var(--shadow-sm)] sm:mb-4 sm:size-12">
          <MailCheck size={20} />
        </div>
        <h2 className="text-[24px] font-extrabold leading-tight tracking-tight text-[var(--brand-950)] sm:text-[26px]">
          Xác thực email
        </h2>
        <p className="mt-2 text-[14px] leading-6 text-[var(--neutral-500)] sm:mt-2.5 sm:text-[15px] sm:leading-7">
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
        onChange={(event) => handleEmailChange(event.target.value)}
        required
        variant="auth"
      />

      <div className="grid gap-3">
        <OtpCodeInput
          autoFocus
          idPrefix="otp"
          value={otpDigits}
          onChange={setOtpDigits}
          variant="auth"
        />

        <div className="flex flex-wrap items-center justify-center gap-2 rounded-[14px] border border-[var(--neutral-200)] bg-[var(--neutral-50)] px-3 py-2.5 text-center text-[13px] text-[var(--neutral-500)] sm:justify-between sm:px-4 sm:text-[14px]">
          <span>
            {otpExpiresAt
              ? !isClockReady
                ? "Đang cập nhật thời gian OTP..."
                : otpRemainingSeconds > 0
                  ? `OTP còn hiệu lực ${formatCountdown(otpRemainingSeconds)}`
                  : "OTP đã hết hạn"
              : "Bạn chưa nhận được mã?"}
          </span>
          <button
            aria-busy={isResending}
            className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-full px-3 text-[13px] font-semibold text-[var(--brand-600)] transition-colors hover:bg-white hover:text-[var(--brand-500)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-300)] disabled:pointer-events-none disabled:text-[var(--neutral-400)] sm:text-[14px]"
            disabled={isResending || !canResend}
            onClick={handleResendOtp}
            type="button"
          >
            <RefreshCw
              size={14}
              className={isResending ? "animate-spin-slow" : undefined}
            />
            <span>
              {isResending
                ? "Đang gửi..."
                : !isClockReady
                  ? "Gửi lại OTP"
                  : resendRemainingSeconds > 0
                    ? `Gửi lại OTP sau ${formatCountdown(resendRemainingSeconds)}`
                    : "Gửi lại OTP"}
            </span>
          </button>
        </div>
      </div>

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
        aria-busy={isSubmitting}
        disabled={isSubmitting || otp.length < OTP_LENGTH}
        icon={<BadgeCheck size={17} />}
        type="submit"
        variant="auth"
      >
        {isSubmitting ? "Đang xác thực..." : "Xác thực"}
      </PrimaryButton>

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
