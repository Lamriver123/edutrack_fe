import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EduTrack – Quản lý học sinh",
  description:
    "Hệ thống quản lý học sinh dành cho giáo viên. Đăng ký, đăng nhập, quản lý lớp học và theo dõi học sinh.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="vi" className="h-full" suppressHydrationWarning>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
