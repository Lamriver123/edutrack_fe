import { KeyRound, MailCheck, ShieldCheck } from "lucide-react";
import { AuthShell } from "@/components/auth/auth-shell";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

const forgotPasswordSteps = [
  {
    step: "01",
    title: "Nhập email",
    description: "Cung cấp email giáo viên và mật khẩu mới muốn sử dụng.",
    Icon: KeyRound,
  },
  {
    step: "02",
    title: "Nhận OTP",
    description: "EduTrack gửi mã 6 số đến email để xác nhận yêu cầu.",
    Icon: MailCheck,
  },
  {
    step: "03",
    title: "Đổi mật khẩu",
    description: "OTP hợp lệ thì mật khẩu mới được cập nhật ngay.",
    Icon: ShieldCheck,
  },
] as const;

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      eyebrow="Quên mật khẩu"
      title="Lấy lại quyền truy cập lớp học"
      description="Đặt mật khẩu mới an toàn hơn và xác nhận bằng OTP được gửi qua email giáo viên."
      steps={forgotPasswordSteps}
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
