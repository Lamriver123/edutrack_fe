import type { User } from "@/types/user";

const ACCESS_TOKEN_KEY = "edutrack.accessToken";
const USER_KEY = "edutrack.user";
const PENDING_EMAIL_KEY = "edutrack.pendingEmail";

const isBrowser = () => typeof window !== "undefined";

export const tokenStorage = {
  getAccessToken() {
    if (!isBrowser()) {
      return null;
    }

    return window.localStorage.getItem(ACCESS_TOKEN_KEY);
  },

  getUser() {
    if (!isBrowser()) {
      return null;
    }

    const rawUser = window.localStorage.getItem(USER_KEY);

    if (!rawUser) {
      return null;
    }

    try {
      return JSON.parse(rawUser) as User;
    } catch {
      window.localStorage.removeItem(USER_KEY);
      return null;
    }
  },

  setSession(accessToken: string, user: User) {
    if (!isBrowser()) {
      return;
    }

    window.localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    window.localStorage.setItem(USER_KEY, JSON.stringify(user));
    window.localStorage.removeItem(PENDING_EMAIL_KEY);
  },

  clearSession() {
    if (!isBrowser()) {
      return;
    }

    window.localStorage.removeItem(ACCESS_TOKEN_KEY);
    window.localStorage.removeItem(USER_KEY);
  },

  setPendingEmail(email: string) {
    if (!isBrowser()) {
      return;
    }

    window.localStorage.setItem(PENDING_EMAIL_KEY, email);
  },

  getPendingEmail() {
    if (!isBrowser()) {
      return "";
    }

    return window.localStorage.getItem(PENDING_EMAIL_KEY) ?? "";
  },
};
