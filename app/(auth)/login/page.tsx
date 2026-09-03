import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <AuthShell
      eyebrow="Đăng nhập"
      title="Trở lại lớp học của bạn"
      description="Edutrack giúp giáo viên quản lý học sinh và lớp học một cách hiệu quả. Hãy đăng nhập để tiếp tục."
    >
      <LoginForm />
    </AuthShell>
  );
}
