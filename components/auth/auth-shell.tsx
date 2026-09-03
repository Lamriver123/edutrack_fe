import type { ReactNode } from "react";
import Image from "next/image";
import type { LucideIcon } from "lucide-react";
import {
  BookOpenCheck,
  LayoutDashboard,
  MailCheck,
  Sparkles,
  UserPlus,
} from "lucide-react";

type AuthShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  steps?: readonly AuthShellStep[];
};

type AuthShellStep = {
  step: string;
  title: string;
  description: string;
  Icon: LucideIcon;
};

const defaultOnboardingSteps: readonly AuthShellStep[] = [
  {
    step: "01",
    title: "Tạo tài khoản",
    description: "Nhập thông tin giáo viên để tạo không gian làm việc.",
    Icon: UserPlus,
  },
  {
    step: "02",
    title: "Xác thực OTP",
    description: "Dùng mã 6 số được gửi qua email để kích hoạt tài khoản.",
    Icon: MailCheck,
  },
  {
    step: "03",
    title: "Vào bảng điều khiển",
    description: "Bắt đầu quản lý lớp học và danh sách học sinh.",
    Icon: LayoutDashboard,
  },
] as const;

export function AuthShell({
  eyebrow,
  title,
  description,
  children,
  steps = defaultOnboardingSteps,
}: AuthShellProps) {
  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
        {/* ─── Branding panel (desktop only) ─────────────────── */}
        <section className="relative isolate hidden min-h-screen overflow-hidden px-8 py-10 lg:flex lg:flex-col lg:justify-center xl:px-14 2xl:px-20">
          {/* Background layers */}
          <div className="absolute inset-0 -z-10 bg-[linear-gradient(150deg,#f8faff_0%,#eef2ff_30%,#e0e7ff_60%,#eef2ff_100%)]" />
          {/* Dot grid pattern */}
          <div className="absolute inset-0 -z-10 opacity-30 [background-image:radial-gradient(circle,#a5b4fc_1px,transparent_1px)] [background-size:28px_28px]" />
          {/* Edge fade right */}
          <div className="absolute inset-y-0 right-0 -z-10 w-20 bg-[linear-gradient(90deg,transparent,var(--background))]" />

          <div className="mx-auto flex w-full max-w-[680px] flex-col gap-8">
            {/* Hero section */}
            <div className="grid items-center gap-8 xl:grid-cols-[1fr_minmax(220px,0.55fr)]">
              <div className="animate-slide-in-left max-w-xl">
                <div className="mb-6 inline-flex items-center gap-2.5 rounded-full bg-white/80 px-4 py-2 text-[14px] font-semibold text-[var(--brand-600)] shadow-[var(--shadow-sm)] ring-1 ring-[var(--brand-100)] backdrop-blur-sm">
                  <Sparkles size={14} className="text-[var(--accent-500)]" />
                  <span>{eyebrow}</span>
                </div>
                <h1 className="max-w-[520px] text-[38px] font-extrabold leading-[1.08] tracking-tight text-[var(--brand-950)] xl:text-[44px]">
                  {title}
                </h1>
                <p className="mt-4 max-w-[480px] text-[16px] leading-8 text-[var(--neutral-500)]">
                  {description}
                </p>
              </div>

              <div className="mx-auto w-full max-w-[260px] animate-scale-in xl:max-w-[300px]">
                <div className="animate-float">
                  <Image
                    alt="EduTrack teacher illustration"
                    className="h-auto w-full object-contain drop-shadow-[0_24px_48px_rgba(79,56,16,0.15)]"
                    height={400}
                    priority
                    src="/logo.png"
                    width={400}
                  />
                </div>
              </div>
            </div>

            {/* Onboarding steps */}
            <div className="border-t border-[var(--brand-100)]/60 pt-6">
              <div className="mb-4 flex items-center justify-between gap-4">
                <p className="text-[14px] font-bold text-[var(--brand-800)]">
                  Quy trình bắt đầu
                </p>
                <p className="text-[13px] font-medium text-[var(--neutral-400)]">
                  MVP cho giáo viên
                </p>
              </div>
              <div className="stagger grid gap-3 xl:grid-cols-3">
                {steps.map(
                  ({
                    step,
                    title: stepTitle,
                    description: stepDescription,
                    Icon,
                  }) => (
                    <div
                      className="group rounded-[var(--radius-md)] border border-white/80 bg-white/60 p-4 shadow-[var(--shadow-card)] backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:bg-white/90 hover:shadow-[var(--shadow-md)]"
                      key={step}
                    >
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <div className="grid size-9 place-items-center rounded-[var(--radius-sm)] bg-[var(--brand-50)] text-[var(--brand-600)] ring-1 ring-[var(--brand-100)] transition-all duration-200 group-hover:bg-[var(--brand-100)] group-hover:ring-[var(--brand-200)]">
                          <Icon size={16} />
                        </div>
                        <span className="rounded-full bg-[var(--accent-100)] px-2.5 py-0.5 text-[12px] font-bold text-[var(--accent-600)]">
                          {step}
                        </span>
                      </div>
                      <p className="text-[14px] font-bold text-[var(--brand-800)]">
                        {stepTitle}
                      </p>
                      <p className="mt-1.5 text-[13px] leading-6 text-[var(--neutral-500)]">
                        {stepDescription}
                      </p>
                    </div>
                  ),
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ─── Form panel ────────────────────────────────────── */}
        <section className="flex min-h-screen items-center justify-center bg-[var(--background)] px-4 py-8 sm:px-8 lg:bg-white/50 lg:px-12 xl:px-16">
          <div className="animate-slide-up w-full max-w-[500px]">
            <div className="rounded-[var(--radius-lg)] border border-[var(--neutral-200)]/80 bg-white p-7 shadow-[var(--shadow-xl)] sm:p-9">
              {/* Form header — mobile only */}
              <div className="mb-8 flex items-center justify-between gap-4 border-b border-[var(--neutral-100)] pb-6 lg:hidden">
                <div className="flex items-center gap-3">
                  <Image
                    alt="EduTrack logo"
                    className="size-10 rounded-[var(--radius-sm)] object-contain"
                    height={48}
                    src="/logo.png"
                    width={48}
                  />
                  <div>
                    <p className="text-[15px] font-bold tracking-tight text-[var(--brand-600)]">
                      EduTrack
                    </p>
                    <p className="text-[13px] text-[var(--neutral-500)]">
                      Không gian giáo viên
                    </p>
                  </div>
                </div>
                <div className="inline-flex items-center gap-1.5 rounded-full bg-[var(--accent-100)] px-3 py-1.5 text-[13px] font-semibold text-[var(--accent-600)] ring-1 ring-[var(--accent-200)]">
                  <BookOpenCheck size={13} />
                  Lớp học
                </div>
              </div>
              {children}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
