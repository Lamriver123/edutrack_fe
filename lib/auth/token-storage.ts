import type { User } from "@/types/user";

export const AUTH_ACCESS_TOKEN_STORAGE_KEY = "edutrack.accessToken";
export const AUTH_USER_STORAGE_KEY = "edutrack.user";
const PENDING_EMAIL_KEY = "edutrack.pendingEmail";
const PENDING_OTP_KEY = "edutrack.pendingOtp";
const SAVED_CREDS_KEY = "edutrack.savedCreds";
export const AUTH_SESSION_EXPIRED_EVENT = "edutrack:auth-session-expired";
export const AUTH_SESSION_CHANGED_EVENT = "edutrack:auth-session-changed";

export type PendingOtpState = {
  email: string;
  otpExpiresAt?: string;
  otpResendAvailableAt?: string;
};

const isBrowser = () => typeof window !== "undefined";

function removeSession() {
  window.localStorage.removeItem(AUTH_ACCESS_TOKEN_STORAGE_KEY);
  window.localStorage.removeItem(AUTH_USER_STORAGE_KEY);
}

export const tokenStorage = {
  getAccessToken() {
    if (!isBrowser()) {
      return null;
    }

    return window.localStorage.getItem(AUTH_ACCESS_TOKEN_STORAGE_KEY);
  },

  getUser() {
    if (!isBrowser()) {
      return null;
    }

    const rawUser = window.localStorage.getItem(AUTH_USER_STORAGE_KEY);

    if (!rawUser) {
      return null;
    }

    try {
      return JSON.parse(rawUser) as User;
    } catch {
      window.localStorage.removeItem(AUTH_USER_STORAGE_KEY);
      return null;
    }
  },

  setSession(accessToken: string, user: User) {
    if (!isBrowser()) {
      return;
    }

    window.localStorage.setItem(AUTH_ACCESS_TOKEN_STORAGE_KEY, accessToken);
    window.localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(user));
    window.localStorage.removeItem(PENDING_EMAIL_KEY);
    window.localStorage.removeItem(PENDING_OTP_KEY);
  },

  clearSession() {
    if (!isBrowser()) {
      return;
    }

    removeSession();
  },

  expireSession(expectedAccessToken?: string | null) {
    if (!isBrowser()) {
      return false;
    }

    const currentAccessToken = window.localStorage.getItem(
      AUTH_ACCESS_TOKEN_STORAGE_KEY,
    );

    if (
      expectedAccessToken !== undefined &&
      currentAccessToken !== expectedAccessToken
    ) {
      return false;
    }

    removeSession();
    window.dispatchEvent(new Event(AUTH_SESSION_EXPIRED_EVENT));

    return true;
  },

  notifySessionChanged() {
    if (!isBrowser()) {
      return;
    }

    window.dispatchEvent(new Event(AUTH_SESSION_CHANGED_EVENT));
  },

  setPendingEmail(email: string, otpState?: Omit<PendingOtpState, "email">) {
    if (!isBrowser()) {
      return;
    }

    window.localStorage.setItem(PENDING_EMAIL_KEY, email);

    if (otpState?.otpExpiresAt || otpState?.otpResendAvailableAt) {
      window.localStorage.setItem(
        PENDING_OTP_KEY,
        JSON.stringify({ email, ...otpState }),
      );
    } else {
      window.localStorage.removeItem(PENDING_OTP_KEY);
    }
  },

  getPendingEmail() {
    if (!isBrowser()) {
      return "";
    }

    return window.localStorage.getItem(PENDING_EMAIL_KEY) ?? "";
  },

  getPendingOtp(email?: string) {
    if (!isBrowser()) {
      return null;
    }

    const raw = window.localStorage.getItem(PENDING_OTP_KEY);

    if (!raw) {
      return null;
    }

    try {
      const state = JSON.parse(raw) as PendingOtpState;
      if (email && state.email !== email) {
        return null;
      }

      return state;
    } catch {
      window.localStorage.removeItem(PENDING_OTP_KEY);
      return null;
    }
  },

  setSavedCredentials(email: string, password?: string) {
    if (!isBrowser()) {
      return;
    }

    if (!password) {
      window.localStorage.removeItem(SAVED_CREDS_KEY);
      return;
    }

    // Mã hóa base64 cơ bản để tránh nhìn thấy plain text ngay lập tức
    const creds = btoa(JSON.stringify({ email, password }));
    window.localStorage.setItem(SAVED_CREDS_KEY, creds);
  },

  getSavedCredentials() {
    if (!isBrowser()) {
      return null;
    }

    const raw = window.localStorage.getItem(SAVED_CREDS_KEY);
    if (!raw) return null;

    try {
      return JSON.parse(atob(raw)) as { email: string; password?: string };
    } catch {
      window.localStorage.removeItem(SAVED_CREDS_KEY);
      return null;
    }
  },
};
