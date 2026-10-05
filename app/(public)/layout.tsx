import Link from "next/link";
import type { ReactNode } from "react";

const links = [
  { href: "/about", label: "Giới thiệu" },
  { href: "/privacy", label: "Quyền riêng tư" },
  { href: "/terms", label: "Điều khoản" },
];

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <header className="border-b border-[var(--border)] bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-5 py-5 sm:px-8">
          <Link href="/about" className="text-xl font-bold text-[var(--brand-700)]">
            EduTrack
          </Link>
          <nav aria-label="Thông tin ứng dụng" className="flex flex-wrap items-center gap-x-5 gap-y-3 text-sm">
            {links.map(({ href, label }) => (
              <Link key={href} href={href} className="text-[var(--neutral-600)] hover:text-[var(--brand-700)]">
                {label}
              </Link>
            ))}
            <Link href="/login" className="rounded-lg bg-[var(--brand-600)] px-4 py-2 font-semibold text-white hover:bg-[var(--brand-700)]">
              Đăng nhập
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-5 py-10 sm:px-8 sm:py-16">
        {children}
      </main>
      <footer className="border-t border-[var(--border)] bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap justify-between gap-4 px-5 py-6 text-sm text-[var(--neutral-500)] sm:px-8">
          <span>EduTrack · Quản lý lớp học và sao lưu dữ liệu</span>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            <Link href="/privacy" className="hover:text-[var(--brand-700)]">Chính sách quyền riêng tư</Link>
            <Link href="/terms" className="hover:text-[var(--brand-700)]">Điều khoản sử dụng</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
