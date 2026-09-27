/* eslint-disable @next/next/no-img-element */
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
  Menu,
  FilePenLine,
  Search,
  UserCircle,
  Users,
  UploadCloud,
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
import { ApiError } from "@/lib/api/client";
import { getAccessTokenSubject } from "@/lib/auth/access-token";
import {
  AUTH_ACCESS_TOKEN_STORAGE_KEY,
  AUTH_SESSION_CHANGED_EVENT,
  AUTH_SESSION_EXPIRED_EVENT,
  AUTH_USER_STORAGE_KEY,
  tokenStorage,
} from "@/lib/auth/token-storage";
import type { User } from "@/types/user";
import { AiScheduleChat, AiScheduleChatButton } from "@/components/schedule/ai-schedule-chat";
import { usePushNotifications } from "@/hooks/use-push";

type NavigationItem = {
  label: string;
  description: string;
  href: string;
  icon: LucideIcon;
  group: "main" | "account";
  match: (pathname: string) => boolean;
};

const navigationItems: NavigationItem[] = [
  {
    label: "Tổng quan",
    description: "Bức tranh nhanh trong ngày",
    href: "/dashboard",
    icon: LayoutDashboard,
    group: "main",
    match: (pathname) => pathname === "/dashboard",
  },
  {
    label: "Lớp học",
    description: "Quản lý lớp đang phụ trách",
    href: "/classes",
    icon: BookOpenCheck,
    group: "main",
    match: (pathname) => pathname.startsWith("/classes"),
  },
  {
    label: "Học sinh",
    description: "Hồ sơ và danh sách học sinh",
    href: "/students",
    icon: Users,
    group: "main",
    match: (pathname) => pathname.startsWith("/students"),
  },
  {
    label: "Thời khóa biểu",
    description: "Lịch dạy và tiết học",
    href: "/schedule",
    icon: CalendarDays,
    group: "main",
    match: (pathname) => pathname.startsWith("/schedule"),
  },
  {
    label: "Thông báo",
    description: "Nhắc việc và tin mới",
    href: "/notifications",
    icon: Bell,
    group: "main",
    match: (pathname) => pathname.startsWith("/notifications"),
  },
  {
    label: "Mẫu hóa đơn",
    description: "Mẫu hóa đơn của giáo viên",
    href: "/settings/invoice-template",
    icon: FilePenLine,
    group: "account",
    match: (pathname) => pathname.startsWith("/settings/invoice-template"),
  },
  {
    label: "Upload file",
    description: "Thư viện phương tiện cá nhân",
    href: "/upload",
    icon: UploadCloud,
    group: "account",
    match: (pathname) => pathname.startsWith("/upload"),
  },
  {
    label: "Thông tin cá nhân",
    description: "Tài khoản giáo viên",
    href: "/profile",
    icon: UserCircle,
    group: "account",
    match: (pathname) => pathname.startsWith("/profile"),
  },
];

type DashboardUserContextValue = {
  updateUser: (user: User) => void;
  user: User;
  logout: () => void;
  push: ReturnType<typeof usePushNotifications>;
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
  const [sessionError, setSessionError] = useState("");
  const [sessionAttempt, setSessionAttempt] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAiChatOpen, setIsAiChatOpen] = useState(false);
  const scrollDirection = useScrollDirection();
  const push = usePushNotifications(user?.id);

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
    const handleSessionExpired = () => {
      setUser(null);
      router.replace("/login");
    };
    const handleSessionChanged = () => {
      window.location.replace("/dashboard");
    };

    window.addEventListener(
      AUTH_SESSION_EXPIRED_EVENT,
      handleSessionExpired,
    );
    window.addEventListener(AUTH_SESSION_CHANGED_EVENT, handleSessionChanged);

    return () => {
      window.removeEventListener(
        AUTH_SESSION_EXPIRED_EVENT,
        handleSessionExpired,
      );
      window.removeEventListener(
        AUTH_SESSION_CHANGED_EVENT,
        handleSessionChanged,
      );
    };
  }, [router]);

  useEffect(() => {
    const currentUserId = user?.id;

    if (!currentUserId) {
      return;
    }

    const handleSessionStorageChange = (event: StorageEvent) => {
      if (event.storageArea !== window.localStorage) {
        return;
      }

      if (event.key === AUTH_ACCESS_TOKEN_STORAGE_KEY) {
        if (!event.newValue) {
          setUser(null);
          router.replace("/login");
          return;
        }

        const nextUserId = getAccessTokenSubject(event.newValue);

        if (nextUserId && nextUserId !== currentUserId) {
          window.location.replace("/dashboard");
        }

        return;
      }

      if (event.key === AUTH_USER_STORAGE_KEY) {
        const nextUser = tokenStorage.getUser();

        if (!nextUser) {
          setUser(null);
          router.replace("/login");
        } else if (nextUser.id !== currentUserId) {
          window.location.replace("/dashboard");
        }
      }
    };

    window.addEventListener("storage", handleSessionStorageChange);

    return () => {
      window.removeEventListener("storage", handleSessionStorageChange);
    };
  }, [router, user?.id]);

  useEffect(() => {
    let isMounted = true;

    async function loadSession() {
      const token = tokenStorage.getAccessToken();
      const cachedUser = tokenStorage.getUser();

      setIsLoading(true);
      setSessionError("");

      try {
        if (token) {
          const currentUser = await authApi.me(token);
          const activeToken = tokenStorage.getAccessToken() ?? token;

          if (!isMounted) {
            return;
          }

          setUser(currentUser);
          tokenStorage.setSession(activeToken, currentUser);
          return;
        }

        const session = await authApi.refresh();

        if (!isMounted) {
          return;
        }

        tokenStorage.setSession(session.accessToken, session.user);
        setUser(session.user);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        if (isUnauthorized(error)) {
          tokenStorage.clearSession();
          router.replace("/login");
          return;
        }

        if (cachedUser) {
          // Keep the local session visible during a temporary network/backend
          // outage. A transient startup failure must not sign the teacher out.
          setUser(cachedUser);
          return;
        }

        setSessionError(
          "Chưa thể kết nối để khôi phục phiên đăng nhập. Vui lòng kiểm tra mạng rồi thử lại.",
        );
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
  }, [router, sessionAttempt]);

  async function handleLogout() {
    try {
      await push.unsubscribe({ silent: true });
    } catch {
      // Bỏ qua lỗi nếu có
    }
    
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

  if (!user && sessionError) {
    return (
      <main className="grid min-h-screen place-items-center bg-[var(--background)] px-4">
        <div className="w-full max-w-md rounded-lg border border-amber-200 bg-white p-6 text-center shadow-[var(--shadow-lg)]">
          <h1 className="text-lg font-extrabold text-[var(--brand-950)]">
            Chưa thể khôi phục phiên đăng nhập
          </h1>
          <p className="mt-2 text-sm leading-6 text-[var(--neutral-600)]">
            {sessionError}
          </p>
          <button
            className="mt-5 inline-flex h-11 items-center justify-center rounded-lg bg-[var(--brand-600)] px-5 text-sm font-bold text-white"
            onClick={() => setSessionAttempt((attempt) => attempt + 1)}
            type="button"
          >
            Thử kết nối lại
          </button>
        </div>
      </main>
    );
  }

  if (!user) {
    return null;
  }

  const userInitial = user.fullName?.charAt(0)?.toUpperCase() ?? "G";

  if (pathname === "/settings/invoice-template") {
    return (
      <DashboardUserContext.Provider value={{ updateUser, user, logout: handleLogout, push }}>
        <main className="h-dvh overflow-hidden bg-white">{children}</main>
      </DashboardUserContext.Provider>
    );
  }

  return (
    <DashboardUserContext.Provider value={{ updateUser, user, logout: handleLogout, push }}>
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
        />

        <div className="pt-[72px] lg:pl-[248px]">
          <Header
            activeNavigation={activeNavigation}
            onOpenSidebar={() => setIsSidebarOpen(true)}
            user={user}
            userInitial={userInitial}
            scrollDirection={scrollDirection}
          />

          <section className="mx-auto grid w-full max-w-[1560px] gap-4 px-3 py-4 sm:px-5 lg:px-6 lg:py-5 2xl:px-7">
            {children}
          </section>
        </div>

        <div className={`fixed inset-0 pointer-events-none z-50 transition-all duration-300 ${scrollDirection === 'down' ? 'translate-y-10 opacity-0' : 'translate-y-0 opacity-100'}`}>
          {!isAiChatOpen ? (
            <div className="pointer-events-auto">
              <AiScheduleChatButton onClick={() => setIsAiChatOpen(true)} />
            </div>
          ) : null}

          {isAiChatOpen ? (
            <div className="pointer-events-auto">
              <AiScheduleChat onClose={() => setIsAiChatOpen(false)} />
            </div>
          ) : null}
        </div>
      </main>
    </DashboardUserContext.Provider>
  );
}

function isUnauthorized(error: unknown) {
  return (
    error instanceof ApiError && (error.status === 401 || error.status === 403)
  );
}

function Sidebar({
  activeHref,
  isOpen,
  onClose,
}: {
  activeHref: string;
  isOpen: boolean;
  onClose: () => void;
}) {
  return (
    <aside
      className={`fixed inset-y-0 left-0 z-50 flex w-[248px] max-w-[86vw] flex-col border-r border-[var(--neutral-200)] bg-white shadow-[var(--shadow-xl)] transition-transform duration-300 lg:translate-x-0 lg:shadow-none ${
        isOpen ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      <div className="flex h-[72px] items-center justify-between border-b border-[var(--neutral-100)] px-4">
        <Link
          className="flex min-w-0 items-center gap-2.5"
          href="/dashboard"
          onClick={onClose}
        >
          <div className="grid size-10 place-items-center rounded-lg border border-amber-100 bg-white shadow-[var(--shadow-sm)]">
            <Image
              alt="EduTrack logo"
              className="size-9 rounded-md object-contain"
              height={36}
              priority
              src="/logo.png"
              width={36}
            />
          </div>
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 truncate text-[16px] font-extrabold text-[var(--brand-950)]">
              EduTrack
              <span className="rounded bg-[var(--brand-50)] px-1.5 py-0.5 text-[8px] font-extrabold text-[var(--brand-600)]">
                PRO
              </span>
            </p>
            <p className="truncate text-[12px] font-medium text-[var(--neutral-500)]">
              Quản lý lớp học thông minh
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

      <nav className="flex-1 overflow-y-auto px-3 py-5">
        <SidebarGroup
          activeHref={activeHref}
          items={navigationItems.filter((item) => item.group === "main")}
          label="Menu chính"
          onClose={onClose}
        />
        <SidebarGroup
          activeHref={activeHref}
          className="mt-7"
          items={navigationItems.filter((item) => item.group === "account")}
          label="Tài chính & cá nhân"
          onClose={onClose}
        />
      </nav>
    </aside>
  );
}

function SidebarGroup({
  activeHref,
  className = "",
  items,
  label: groupLabel,
  onClose,
}: {
  activeHref: string;
  className?: string;
  items: NavigationItem[];
  label: string;
  onClose: () => void;
}) {
  return (
    <div className={className}>
      <p className="mb-2 px-2 text-[11px] font-extrabold uppercase text-[var(--neutral-400)]">
        {groupLabel}
      </p>
      <div className="grid gap-1">
        {items.map(({ label, href, icon: Icon }) => {
          const isActive = activeHref === href;

          return (
            <Link
              className={`relative flex h-10 items-center gap-3 rounded-lg px-3 text-left transition ${
                isActive
                  ? "bg-[var(--brand-50)] text-[var(--brand-700)]"
                  : "text-[var(--neutral-600)] hover:bg-[var(--neutral-50)] hover:text-[var(--brand-600)]"
              }`}
              href={href}
              key={href}
              onClick={onClose}
            >
              <Icon className="shrink-0" size={15} />
              <span className="min-w-0 flex-1 truncate text-[13px] font-bold">
                {label}
              </span>
              {href === "/notifications" ? (
                <span className="size-2 rounded-full bg-amber-400" />
              ) : null}
              {isActive ? (
                <span className="absolute inset-y-2 right-1 w-1 rounded-full bg-[var(--brand-600)]" />
              ) : null}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function useScrollDirection() {
  const [scrollDirection, setScrollDirection] = useState("up");

  useEffect(() => {
    let lastScrollY = window.scrollY;

    const updateScrollDirection = () => {
      const scrollY = window.scrollY;
      const direction = scrollY > lastScrollY ? "down" : "up";
      if (
        direction !== scrollDirection &&
        (scrollY - lastScrollY > 10 || scrollY - lastScrollY < -10)
      ) {
        if (direction === "down" && scrollY > 72) {
          setScrollDirection("down");
        } else if (direction === "up") {
          setScrollDirection("up");
        }
      }
      lastScrollY = scrollY > 0 ? scrollY : 0;
    };
    window.addEventListener("scroll", updateScrollDirection);
    return () => {
      window.removeEventListener("scroll", updateScrollDirection);
    };
  }, [scrollDirection]);

  return scrollDirection;
}

function Header({
  activeNavigation,
  onOpenSidebar,
  user,
  userInitial,
  scrollDirection,
}: {
  activeNavigation: NavigationItem;
  onOpenSidebar: () => void;
  user: User;
  userInitial: string;
  scrollDirection: string;
}) {
  return (
    <header
      className={`fixed left-0 right-0 top-0 z-30 border-b border-[var(--neutral-100)] bg-white/95 backdrop-blur shadow-sm transition-transform duration-300 lg:left-[248px] ${
        scrollDirection === "down" ? "-translate-y-full" : "translate-y-0"
      }`}
    >
      <div className="flex h-[72px] items-center justify-between gap-4 px-4 sm:px-5 lg:px-6 2xl:px-7">
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
            <p className="hidden text-[12px] font-semibold text-[var(--neutral-500)] sm:block">
              Không gian giáo viên&nbsp; / &nbsp;
              <span className="text-[var(--brand-600)]">{activeNavigation.label}</span>
            </p>
            <h1 className="truncate text-[18px] font-extrabold leading-tight text-[var(--brand-950)] sm:text-[20px]">
              {activeNavigation.href === "/dashboard"
                ? "Bảng điều khiển"
                : activeNavigation.label}
            </h1>
          </div>
        </div>

        <div className="flex min-w-0 items-center justify-end gap-3">
          <label className="hidden h-9 w-[240px] items-center gap-2 rounded-lg border border-[var(--neutral-200)] bg-[var(--neutral-50)] px-3 text-[13px] text-[var(--neutral-500)] transition focus-within:border-[var(--brand-300)] focus-within:bg-white focus-within:shadow-[0_0_0_3px_rgba(99,102,241,0.1)] md:flex xl:w-[320px]">
            <Search size={14} />
            <input
              className="min-w-0 flex-1 bg-transparent text-[13px] text-[var(--neutral-800)] outline-none placeholder:text-[var(--neutral-400)]"
              placeholder="Tìm kiếm học sinh, lớp học..."
              type="search"
            />
          </label>

          <span className="hidden h-9 items-center gap-2 rounded-md border border-[var(--neutral-200)] bg-white px-3 text-[12px] font-semibold text-[var(--neutral-600)] xl:flex">
            <CalendarDays size={13} />
            {formatHeaderDate()}
          </span>

          <Link
            aria-label="Thông báo"
            className="relative grid size-9 place-items-center rounded-lg text-[var(--neutral-500)] transition hover:bg-[var(--brand-50)] hover:text-[var(--brand-600)]"
            href="/notifications"
          >
            <Bell size={16} />
            <span className="absolute right-1.5 top-1.5 size-2 rounded-full border-2 border-white bg-rose-500" />
          </Link>

          <Link
            className="hidden h-10 items-center gap-2 rounded-lg px-2 text-left transition hover:bg-[var(--brand-50)] sm:flex"
            href="/profile"
          >
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.fullName || "Avatar"}
                className="size-8 rounded-full object-cover"
              />
            ) : (
              <span className="grid size-8 place-items-center rounded-full bg-[var(--brand-600)] text-[11px] font-bold text-white">
                {userInitial}
              </span>
            )}
            <span className="hidden min-w-0 xl:block">
              <span className="block max-w-[150px] truncate text-[12px] font-bold text-[var(--neutral-800)]">
                {user.fullName}
              </span>
            </span>
            <ChevronDown
              className="hidden text-[var(--neutral-400)] xl:block"
              size={13}
            />
          </Link>
        </div>
      </div>
    </header>
  );
}

function formatHeaderDate() {
  const value = new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
  }).format(new Date());

  return `Hôm nay, ${value}`;
}
