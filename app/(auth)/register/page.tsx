import { AuthShell } from "@/components/auth/auth-shell";
import { RegisterForm } from "@/components/auth/register-form";

export default function RegisterPage() {
  return (
    <AuthShell
      eyebrow="Chỉ dành cho giáo viên"
      title="Tạo không gian quản lý học sinh"
      description="Đăng ký để tạo không gian làm việc và quản lý học sinh của bạn."
    >
      <RegisterForm />
    </AuthShell>
  );
}
