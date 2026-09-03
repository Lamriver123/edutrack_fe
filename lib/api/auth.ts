import type {
  AuthResponse,
  ForgotPasswordPayload,
  ForgotPasswordResponse,
  LogoutResponse,
  LoginPayload,
  RegisterPayload,
  RegisterResponse,
  ResendPasswordResetOtpPayload,
  ResendOtpPayload,
  ResendOtpResponse,
  ResetPasswordPayload,
  ResetPasswordResponse,
  VerifyOtpPayload,
} from "@/types/auth";
import type { User } from "@/types/user";
import { apiRequest } from "./client";

export const authApi = {
  register(payload: RegisterPayload) {
    return apiRequest<RegisterResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  verifyOtp(payload: VerifyOtpPayload) {
    return apiRequest<AuthResponse>("/auth/verify-otp", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  resendOtp(payload: ResendOtpPayload) {
    return apiRequest<ResendOtpResponse>("/auth/resend-otp", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  forgotPassword(payload: ForgotPasswordPayload) {
    return apiRequest<ForgotPasswordResponse>("/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  resetPassword(payload: ResetPasswordPayload) {
    return apiRequest<ResetPasswordResponse>("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  resendPasswordResetOtp(payload: ResendPasswordResetOtpPayload) {
    return apiRequest<ForgotPasswordResponse>(
      "/auth/resend-password-reset-otp",
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    );
  },

  login(payload: LoginPayload) {
    return apiRequest<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
      skipAuthRefresh: true,
    });
  },

  refresh() {
    return apiRequest<AuthResponse>("/auth/refresh", {
      method: "POST",
      skipAuthRefresh: true,
    });
  },

  logout() {
    return apiRequest<LogoutResponse>("/auth/logout", {
      method: "POST",
      skipAuthRefresh: true,
    });
  },

  me(token: string) {
    return apiRequest<User>("/auth/me", {
      token,
    });
  },
};
