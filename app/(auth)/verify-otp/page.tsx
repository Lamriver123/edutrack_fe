import { AuthShell } from "@/components/auth/auth-shell";
import { VerifyOtpForm } from "@/components/auth/verify-otp-form";

type VerifyOtpPageProps = {
  searchParams: Promise<{
    email?: string | string[];
  }>;
};

export default async function VerifyOtpPage({
  searchParams,
}: VerifyOtpPageProps) {
  const params = await searchParams;
  const email = Array.isArray(params.email) ? params.email[0] : params.email;

  return (
    <AuthShell
      eyebrow="OTP email"
      title="Xác thực tài khoản giáo viên"
      description="Nhập mã OTP để kích hoạt tài khoản và bắt đầu sử dụng không gian EduTrack."
    >
      <VerifyOtpForm initialEmail={email} />
    </AuthShell>
  );
}
