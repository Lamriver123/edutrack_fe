"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  BookOpenCheck,
  CalendarDays,
  ChevronDown,
  LayoutDashboard,
  LogOut,
  Menu,
  Search,
  UserCircle,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { authApi } from "@/lib/api/auth";
import { tokenStorage } from "@/lib/auth/token-storage";
import type { User } from "@/types/user";

type NavigationItem = {
  label: string;
  description: string;
  href: string;
  icon: LucideIcon;
  match: (pathname: string) => boolean;
};

const navigationItems: NavigationItem[] = [
  {
    label: "Tổng quan",
    description: "Bức tranh nhanh trong ngày",
    href: "/dashboard",
    icon: LayoutDashboard,
    match: (pathname) => pathname === "/dashboard",
  },
  {
    label: "Lớp học",
    description: "Quản lý lớp đang phụ trách",
    href: "/classes",
    icon: BookOpenCheck,
    match: (pathname) => pathname.startsWith("/classes"),
  },
  {
    label: "Học sinh",
    description: "Hồ sơ và danh sách học sinh",
    href: "/students",
    icon: Users,
    match: (pathname) => pathname.startsWith("/students"),
  },
  {
    label: "Thời khóa biểu",
    description: "Lịch dạy và tiết học",
    href: "/schedule",
    icon: CalendarDays,
    match: (pathname) => pathname.startsWith("/schedule"),
  },
  {
    label: "Thông báo",
    description: "Nhắc việc và tin mới",
    href: "/notifications",
    icon: Bell,
    match: (pathname) => pathname.startsWith("/notifications"),
  },
  {
    label: "Thông tin cá nhân",
    description: "Tài khoản giáo viên",
    href: "/profile",
    icon: UserCircle,
    match: (pathname) => pathname.startsWith("/profile"),
  },
];

type DashboardUserContextValue = {
  updateUser: (user: User) => void;
  user: User;
};

const DashboardUserContext = createContext<DashboardUserContextValue | null>(
  null,
);

export function useDashboardUser() {
  const context = useContext(DashboardUserContext);

  if (!context) {
    throw new Error("useDashboardUser must be used inside DashboardShell");
  }

  return context.user;
}

export function useDashboardSession() {
  const context = useContext(DashboardUserContext);

  if (!context) {
    throw new Error("useDashboardSession must be used inside DashboardShell");
  }

  return context;
}

export function DashboardShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const updateUser = useCallback((nextUser: User) => {
    setUser(nextUser);

    const accessToken = tokenStorage.getAccessToken();

    if (accessToken) {
      tokenStorage.setSession(accessToken, nextUser);
    }
  }, []);

  const activeNavigation = useMemo(
    () =>
      navigationItems.find((item) => item.match(pathname)) ??
      navigationItems[0],
    [pathname],
  );

  useEffect(() => {
    let isMounted = true;

    async function loadSession() {
      const token = tokenStorage.getAccessToken();

      if (token) {
        try {
          const currentUser = await authApi.me(token);
          const activeToken = tokenStorage.getAccessToken() ?? token;

          if (!isMounted) {
            return;
          }

          setUser(currentUser);
          tokenStorage.setSession(activeToken, currentUser);
          setIsLoading(false);
          return;
        } catch {
          tokenStorage.clearSession();
        }
      }

      try {
        const session = await authApi.refresh();

        if (!isMounted) {
          return;
        }

        tokenStorage.setSession(session.accessToken, session.user);
        setUser(session.user);
      } catch {
        tokenStorage.clearSession();
        router.replace("/login");
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadSession();

    return () => {
      isMounted = false;
    };
  }, [router]);

  async function handleLogout() {
    try {
      await authApi.logout();
    } finally {
      tokenStorage.clearSession();
      router.replace("/login");
    }
  }

  if (isLoading) {
    return (
      <main className="grid min-h-screen place-items-center bg-[var(--background)] px-4">
        <div className="animate-scale-in flex items-center gap-3 rounded-lg border border-[var(--neutral-200)] bg-white px-6 py-5 shadow-[var(--shadow-lg)]">
          <div className="size-5 animate-spin-slow rounded-lg border-2 border-[var(--brand-200)] border-t-[var(--brand-500)]" />
          <span className="text-[15px] font-medium text-[var(--neutral-600)]">
            Đang tải không gian làm việc...
          </span>
        </div>
      </main>
    );
  }

  if (!user) {
    return null;
  }

  const userInitial = user.fullName?.charAt(0)?.toUpperCase() ?? "G";

  return (
    <DashboardUserContext.Provider value={{ updateUser, user }}>
      <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
        {isSidebarOpen ? (
          <button
            aria-label="Đóng menu"
            className="fixed inset-0 z-40 bg-[var(--neutral-900)]/35 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
            type="button"
          />
        ) : null}

        <Sidebar
          activeHref={activeNavigation.href}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          user={user}
          userInitial={userInitial}
        />

        <div className="pt-[84px] lg:pl-[292px]">
          <Header
            activeNavigation={activeNavigation}
            onLogout={handleLogout}
            onOpenSidebar={() => setIsSidebarOpen(true)}
            user={user}
            userInitial={userInitial}
          />

          <section className="mx-auto grid w-full max-w-[1500px] gap-5 px-4 py-4 sm:px-5 sm:py-5 lg:px-6 lg:py-6 2xl:px-7">
            {children}
          </section>
        </div>
      </main>
    </DashboardUserContext.Provider>
  );
}

function Sidebar({
  activeHref,
  isOpen,
  onClose,
  user,
  userInitial,
}: {
  activeHref: string;
  isOpen: boolean;
  onClose: () => void;
  user: User;
  userInitial: string;
}) {
  return (
    <aside
      className={`fixed inset-y-0 left-0 z-50 flex w-[292px] max-w-[86vw] flex-col border-r border-[var(--neutral-200)] bg-white shadow-[var(--shadow-xl)] transition-transform duration-300 lg:translate-x-0 lg:shadow-none ${
        isOpen ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      <div className="flex h-20 items-center justify-between border-b border-[var(--neutral-200)] px-5">
        <Link
          className="flex min-w-0 items-center gap-3"
          href="/dashboard"
          onClick={onClose}
        >
          <div className="grid size-12 place-items-center rounded-lg border border-[var(--neutral-200)] bg-[var(--neutral-50)]">
            <Image
              alt="EduTrack logo"
              className="size-10 object-contain"
              height={40}
              priority
              src="/logo.png"
              width={40}
            />
          </div>
          <div className="min-w-0">
            <p className="truncate text-[16px] font-extrabold text-[var(--brand-700)]">
              EduTrack
            </p>
            <p className="truncate text-[13px] text-[var(--neutral-500)]">
              Quản lý học sinh
            </p>
          </div>
        </Link>

        <button
          aria-label="Đóng menu"
          className="grid size-11 place-items-center rounded-lg border border-[var(--neutral-200)] text-[var(--neutral-500)] transition hover:border-[var(--brand-200)] hover:bg-[var(--brand-50)] hover:text-[var(--brand-600)] lg:hidden"
          onClick={onClose}
          type="button"
        >
          <X size={18} />
        </button>
      </div>

      <nav className="grid gap-1.5 px-3 py-5">
        {navigationItems.map(({ label, description, href, icon: Icon }) => {
          const isActive = activeHref === href;

          return (
            <Link
              className={`grid grid-cols-[44px_1fr] items-center gap-3 rounded-lg px-3.5 py-3.5 text-left transition ${
                isActive
                  ? "bg-[var(--brand-50)] text-[var(--brand-700)] ring-1 ring-[var(--brand-100)]"
                  : "text-[var(--neutral-600)] hover:bg-[var(--neutral-50)] hover:text-[var(--brand-600)]"
              }`}
              href={href}
              key={href}
              onClick={onClose}
            >
              <span
                className={`grid size-11 place-items-center rounded-lg ${
                  isActive ? "bg-white" : "bg-[var(--neutral-50)]"
                }`}
              >
                <Icon size={19} />
              </span>
              <span className="min-w-0">
                <span className="block text-[15px] font-bold">{label}</span>
                <span className="block truncate text-[13px] text-[var(--neutral-400)]">
                  {description}
                </span>
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto border-t border-[var(--neutral-200)] p-4">
        <Link
          className="grid grid-cols-[44px_1fr] items-center gap-3 rounded-lg bg-[var(--neutral-50)] p-3 transition hover:bg-[var(--brand-50)]"
          href="/profile"
          onClick={onClose}
        >
          <div className="grid size-11 place-items-center rounded-lg bg-gradient-to-br from-[var(--brand-500)] to-[var(--brand-700)] text-[14px] font-bold text-white">
            {userInitial}
          </div>
          <div className="min-w-0">
            <p className="truncate text-[14px] font-bold text-[var(--neutral-800)]">
              {user.fullName}
            </p>
            <p className="truncate text-[13px] text-[var(--neutral-500)]">
              Giáo viên
            </p>
          </div>
        </Link>
      </div>
    </aside>
  );
}

function Header({
  activeNavigation,
  onLogout,
  onOpenSidebar,
  user,
  userInitial,
}: {
  activeNavigation: NavigationItem;
  onLogout: () => void;
  onOpenSidebar: () => void;
  user: User;
  userInitial: string;
}) {
  return (
    <header className="fixed left-0 right-0 top-0 z-30 border-b border-[var(--neutral-200)]/80 bg-white lg:left-[292px]">
      <div className="flex h-[84px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <button
            aria-label="Mở menu"
            className="grid size-11 place-items-center rounded-lg border border-[var(--neutral-200)] bg-white text-[var(--neutral-600)] transition hover:border-[var(--brand-200)] hover:bg-[var(--brand-50)] hover:text-[var(--brand-600)] lg:hidden"
            onClick={onOpenSidebar}
            type="button"
          >
            <Menu size={20} />
          </button>

          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-[var(--neutral-500)]">
              Không gian giáo viên
            </p>
            <h1 className="truncate text-[24px] font-extrabold leading-tight text-[var(--brand-950)] sm:text-[28px]">
              {activeNavigation.label}
            </h1>
          </div>
        </div>

        <div className="flex min-w-0 items-center justify-end gap-3">
          <label className="hidden h-12 w-[280px] items-center gap-2 rounded-lg border border-[var(--neutral-200)] bg-[var(--neutral-50)] px-3.5 text-[14px] text-[var(--neutral-500)] transition focus-within:border-[var(--brand-300)] focus-within:bg-white focus-within:shadow-[0_0_0_3px_rgba(99,102,241,0.12)] md:flex xl:w-[360px]">
            <Search size={16} />
            <input
              className="min-w-0 flex-1 bg-transparent text-[15px] text-[var(--neutral-800)] outline-none placeholder:text-[var(--neutral-400)]"
              placeholder="Tìm học sinh, lớp học..."
              type="search"
            />
          </label>

          <Link
            aria-label="Thông báo"
            className="relative grid size-11 place-items-center rounded-lg border border-[var(--neutral-200)] bg-white text-[var(--neutral-600)] transition hover:border-[var(--brand-200)] hover:bg-[var(--brand-50)] hover:text-[var(--brand-600)]"
            href="/notifications"
          >
            <Bell size={18} />
            <span className="absolute right-2 top-2 size-2 rounded-lg bg-[var(--accent-500)]" />
          </Link>

          <Link
            className="hidden h-12 items-center gap-2 rounded-lg border border-[var(--neutral-200)] bg-white px-3 text-left transition hover:border-[var(--brand-200)] hover:bg-[var(--brand-50)] sm:flex"
            href="/profile"
          >
            <span className="grid size-9 place-items-center rounded-lg bg-gradient-to-br from-[var(--brand-500)] to-[var(--brand-700)] text-[13px] font-bold text-white">
              {userInitial}
            </span>
            <span className="hidden min-w-0 xl:block">
              <span className="block max-w-[160px] truncate text-[14px] font-bold text-[var(--neutral-800)]">
                {user.fullName}
              </span>
              <span className="block max-w-[160px] truncate text-[12px] text-[var(--neutral-500)]">
                {user.email}
              </span>
            </span>
            <ChevronDown
              className="hidden text-[var(--neutral-400)] xl:block"
              size={15}
            />
          </Link>

          <button
            aria-label="Đăng xuất"
            className="grid size-11 place-items-center rounded-lg border border-[var(--neutral-200)] bg-white text-[var(--neutral-600)] transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
            onClick={onLogout}
            type="button"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </header>
  );
}
