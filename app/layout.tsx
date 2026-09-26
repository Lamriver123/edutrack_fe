import type { Metadata, Viewport } from "next";
import { NoticeProvider } from "@/components/ui/notice-provider";
import { ServiceWorkerRegistration } from "@/components/pwa/service-worker-registration";
import { PWAInstallPrompt } from "@/components/pwa/install-prompt";
import "./globals.css";
import "./pwa.css";

export const metadata: Metadata = {
  title: "Ms. Cheese – Quản lý học sinh",
  description:
    "Hệ thống quản lý học sinh dành cho giáo viên. Đăng ký, đăng nhập, quản lý lớp học và theo dõi học sinh.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Ms. Cheese",
  },
  formatDetection: {
    telephone: false,
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  themeColor: "#F5A623",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="vi" className="h-full" suppressHydrationWarning>
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
      </head>
      <body className="flex min-h-full flex-col">
        <ServiceWorkerRegistration />
        <NoticeProvider>{children}</NoticeProvider>
        <PWAInstallPrompt />
      </body>
    </html>
  );
}
