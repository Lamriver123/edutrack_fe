import type { Metadata, Viewport } from "next";
import { NoticeProvider } from "@/components/ui/notice-provider";
import { ServiceWorkerRegistration } from "@/components/pwa/service-worker-registration";
import { PWAInstallPrompt } from "@/components/pwa/install-prompt";
import "./globals.css";
import "./pwa.css";

export const metadata: Metadata = {
  title: {
    default: "",
    template: "%s | EduTrack",
  },
  description:
    "Phần mềm quản lý học sinh, điểm danh, lịch học và học phí tối ưu dành cho giáo viên và trung tâm gia sư. Đăng ký ngay để trải nghiệm miễn phí.",
  keywords: ["quản lý học sinh", "điểm danh", "phần mềm giáo viên", "quản lý lớp học", "EduTrack", "quản lý học phí"],
  authors: [{ name: "EduTrack Team" }],
  creator: "EduTrack",
  publisher: "EduTrack",
  openGraph: {
    title: "EduTrack – Giải pháp quản lý học sinh toàn diện",
    description: "Tối ưu hóa việc quản lý lớp học, điểm danh và học phí. Giúp giáo viên tiết kiệm thời gian và nâng cao hiệu quả.",
    url: process.env.NEXT_PUBLIC_APP_URL || "https://edutrack-fe.vercel.app",
    siteName: "EduTrack",
    images: [
      {
        url: "/icons/icon-512x512.png",
        width: 512,
        height: 512,
        alt: "EduTrack Logo",
      }
    ],
    locale: "vi_VN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "EduTrack – Quản lý học sinh thông minh",
    description: "Giải pháp quản lý lớp học, điểm danh, và học phí tối ưu dành riêng cho giáo viên.",
    images: ["/icons/icon-512x512.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Edu-Track",
  },
  formatDetection: {
    telephone: false,
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  themeColor: "#9bc6ffff",
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
