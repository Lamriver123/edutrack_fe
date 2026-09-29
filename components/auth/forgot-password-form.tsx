"use client";

import { type FormEvent, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  LockKeyhole,
  Mail,
  MailCheck,
  RefreshCw,
} from "lucide-react";
import { OtpCodeInput } from "@/components/auth/otp-code-input";
import { FormField } from "@/components/ui/form-field";
import { PrimaryButton } from "@/components/ui/primary-button";
import { authApi } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";

const OTP_LENGTH = 6;

type ForgotPasswordStep = "request" | "otp" | "done";

export function ForgotPasswordForm() {
  const [step, setStep] = useState<ForgotPasswordStep>("request");
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otpDigits, setOtpDigits] = useState<string[]>(
    Array(OTP_LENGTH).fill(""),
  );
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const otp = otpDigits.join("");

  async function handleRequestReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (newPassword !== confirmPassword) {
      setError("Mật khẩu xác nhận chưa khớp.");
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await authApi.forgotPassword({
        email,
        newPassword,
      });
      setMessage(result.message);
      setOtpDigits(Array(OTP_LENGTH).fill(""));
      setStep("otp");
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Chưa thể gửi OTP đổi mật khẩu. Vui lòng thử lại.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleConfirmReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setIsSubmitting(true);

    try {
      const result = await authApi.resetPassword({ email, otp });
      setMessage(result.message);
      setNewPassword("");
      setConfirmPassword("");
      setOtpDigits(Array(OTP_LENGTH).fill(""));
      setStep("done");
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Đổi mật khẩu chưa thành công. Vui lòng thử lại.",
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
      const result = await authApi.resendPasswordResetOtp({ email });
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

  function goBackToRequestStep() {
    setError("");
    setMessage("");
    setOtpDigits(Array(OTP_LENGTH).fill(""));
    setStep("request");
  }

  if (step === "done") {
    return (
      <div className="stagger grid gap-5 sm:gap-6">
        <div>
          <h2 className="text-[24px] font-extrabold leading-tight tracking-tight text-[var(--brand-950)] sm:text-[26px]">
            Mật khẩu đã được đổi
          </h2>
          <p className="mt-2 text-[14px] leading-6 text-[var(--neutral-500)] sm:mt-2.5 sm:text-[15px] sm:leading-7">
            Bạn có thể đăng nhập lại bằng mật khẩu mới.
          </p>
        </div>

        {message ? (
          <div className="rounded-[var(--radius-sm)] border border-[var(--success-border)] bg-[var(--success-bg)] px-4 py-3.5 text-[14px] font-medium leading-relaxed text-[var(--success-text)]">
            {message}
          </div>
        ) : null}

        <Link
          className="inline-flex h-12 items-center justify-center gap-2.5 rounded-[12px] bg-[linear-gradient(135deg,#6366f1_0%,#4f46e5_55%,#4338ca_100%)] px-5 text-[15px] font-bold text-white shadow-[var(--shadow-brand)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[var(--shadow-brand-lg)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-300)] focus-visible:ring-offset-2 active:translate-y-0 active:scale-[0.98] sm:h-[56px] sm:rounded-[14px] sm:px-6"
          href="/login"
        >
          <ArrowLeft size={17} />
          Quay lại đăng nhập
        </Link>
      </div>
    );
  }

  if (step === "otp") {
    return (
      <form className="stagger grid gap-5 sm:gap-6" onSubmit={handleConfirmReset}>
        <div>
          <h2 className="text-[24px] font-extrabold leading-tight tracking-tight text-[var(--brand-950)] sm:text-[26px]">
            Nhập OTP đổi mật khẩu
          </h2>
          <p className="mt-2 text-[14px] leading-6 text-[var(--neutral-500)] sm:mt-2.5 sm:text-[15px] sm:leading-7">
            Kiểm tra email và nhập mã 6 số để xác nhận mật khẩu mới.
          </p>
        </div>

        <div className="rounded-[var(--radius-sm)] border border-[var(--neutral-200)] bg-[var(--neutral-50)] px-4 py-3.5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[13px] font-semibold text-[var(--neutral-500)]">
                Email nhận OTP
              </p>
              <p className="mt-1 break-all text-[15px] font-bold text-[var(--brand-950)]">
                {email}
              </p>
            </div>
            <button
              className="shrink-0 rounded-[var(--radius-xs)] px-3 py-1.5 text-[13px] font-semibold text-[var(--brand-600)] transition-colors hover:bg-white hover:text-[var(--brand-500)]"
              onClick={goBackToRequestStep}
              type="button"
            >
              Sửa
            </button>
          </div>
        </div>

        <OtpCodeInput
          autoFocus
          idPrefix="password-reset-otp"
          value={otpDigits}
          onChange={setOtpDigits}
          variant="auth"
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
          variant="auth"
        >
          {isSubmitting ? "Đang xác nhận..." : "Đổi mật khẩu"}
        </PrimaryButton>

        <button
          className="group inline-flex h-12 items-center justify-center gap-2.5 rounded-[12px] border border-[var(--brand-200)] bg-[var(--brand-50)]/50 px-4 text-[15px] font-semibold text-[var(--brand-700)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--brand-300)] hover:bg-[var(--brand-50)] hover:text-[var(--brand-600)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-300)] focus-visible:ring-offset-2 active:translate-y-0 active:scale-[0.98] disabled:pointer-events-none disabled:translate-y-0 disabled:opacity-50 sm:h-[56px] sm:rounded-[14px]"
          disabled={isResending || !email}
          onClick={handleResendOtp}
          type="button"
        >
          <RefreshCw
            size={16}
            className={
              isResending
                ? "animate-spin-slow"
                : "transition-transform duration-300 group-hover:rotate-45"
            }
          />
          <span>{isResending ? "Đang gửi..." : "Gửi lại OTP"}</span>
        </button>
      </form>
    );
  }

  return (
    <form className="stagger grid gap-5 sm:gap-6" onSubmit={handleRequestReset}>
      <div>
        <h2 className="text-[24px] font-extrabold leading-tight tracking-tight text-[var(--brand-950)] sm:text-[26px]">
          Quên mật khẩu?
        </h2>
        <p className="mt-2 text-[14px] leading-6 text-[var(--neutral-500)] sm:mt-2.5 sm:text-[15px] sm:leading-7">
          Nhập email và mật khẩu mới.
        </p>
      </div>

      <div className="grid gap-3.5 sm:gap-4">
        <FormField
          id="forgot-email"
          label="Email"
          type="email"
          autoComplete="email"
          leadingIcon={<Mail size={17} />}
          placeholder="giaovien@example.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          variant="auth"
        />
        <FormField
          id="new-password"
          label="Mật khẩu mới"
          type={showPassword ? "text" : "password"}
          autoComplete="new-password"
          leadingIcon={<LockKeyhole size={17} />}
          minLength={8}
          maxLength={72}
          placeholder="Tối thiểu 8 ký tự"
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
          trailing={
            <button
              aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
              aria-pressed={showPassword}
              className="grid size-9 place-items-center rounded-full text-[var(--neutral-400)] transition-colors duration-200 hover:bg-[var(--brand-50)] hover:text-[var(--brand-600)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-300)] sm:size-10"
              onClick={() => setShowPassword((current) => !current)}
              type="button"
            >
              {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          }
          required
          variant="auth"
        />
        <FormField
          id="confirm-new-password"
          label="Xác nhận mật khẩu mới"
          type={showPassword ? "text" : "password"}
          autoComplete="new-password"
          leadingIcon={<LockKeyhole size={17} />}
          minLength={8}
          maxLength={72}
          placeholder="Nhập lại mật khẩu mới"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          trailing={
            <button
              aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
              aria-pressed={showPassword}
              className="grid size-9 place-items-center rounded-full text-[var(--neutral-400)] transition-colors duration-200 hover:bg-[var(--brand-50)] hover:text-[var(--brand-600)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-300)] sm:size-10"
              onClick={() => setShowPassword((current) => !current)}
              type="button"
            >
              {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          }
          required
          variant="auth"
        />
      </div>

      {error ? (
        <div className="animate-scale-in rounded-[var(--radius-sm)] border border-[var(--error-border)] bg-[var(--error-bg)] px-4 py-3.5 text-[14px] font-medium leading-relaxed text-[var(--error-text)]">
          {error}
        </div>
      ) : null}

      <PrimaryButton
        disabled={isSubmitting}
        icon={<ArrowRight size={17} />}
        type="submit"
        variant="auth"
      >
        {isSubmitting ? "Đang gửi OTP..." : "Tiếp tục"}
      </PrimaryButton>

      <p className="rounded-[var(--radius-sm)] border border-[var(--neutral-200)] bg-[var(--neutral-50)] px-4 py-3.5 text-center text-[14px] text-[var(--neutral-500)]">
        Đã nhớ mật khẩu?{" "}
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
