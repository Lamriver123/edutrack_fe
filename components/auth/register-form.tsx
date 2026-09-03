"use client";

import { type FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  User,
} from "lucide-react";
import { authApi } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";
import { tokenStorage } from "@/lib/auth/token-storage";
import { FormField } from "@/components/ui/form-field";
import { PrimaryButton } from "@/components/ui/primary-button";

export function RegisterForm() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const result = await authApi.register({ fullName, email, password });
      tokenStorage.setPendingEmail(result.email);
      router.push(`/verify-otp?email=${encodeURIComponent(result.email)}`);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Đăng ký chưa thành công. Vui lòng thử lại.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="stagger grid gap-6" onSubmit={handleSubmit}>
      <div>
        <h2 className="text-[26px] font-extrabold leading-tight tracking-tight text-[var(--brand-950)]">
          Tạo tài khoản giáo viên
        </h2>
        <p className="mt-2.5 text-[15px] leading-7 text-[var(--neutral-500)]">
          Đăng ký để bắt đầu quản lý lớp học.
        </p>
      </div>

      <div className="grid gap-4">
        <FormField
          id="fullName"
          label="Họ và tên"
          autoComplete="name"
          leadingIcon={<User size={17} />}
          placeholder="Nguyễn Văn A"
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          required
        />
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
        <FormField
          id="password"
          label="Mật khẩu"
          type={showPassword ? "text" : "password"}
          autoComplete="new-password"
          leadingIcon={<LockKeyhole size={17} />}
          minLength={8}
          placeholder="Tối thiểu 8 ký tự"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          trailing={
            <button
              aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
              className="grid size-11 place-items-center rounded-[var(--radius-sm)] text-[var(--neutral-400)] transition-all duration-200 hover:bg-[var(--brand-50)] hover:text-[var(--brand-600)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-300)]"
              onClick={() => setShowPassword((current) => !current)}
              type="button"
            >
              {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          }
          required
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
      >
        {isSubmitting ? "Đang xử lý..." : "Đăng ký"}
      </PrimaryButton>

      <p className="rounded-[var(--radius-sm)] border border-[var(--neutral-200)] bg-[var(--neutral-50)] px-4 py-3.5 text-center text-[14px] text-[var(--neutral-500)]">
        Đã có tài khoản?{" "}
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
