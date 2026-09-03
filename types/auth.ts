import type { User } from "./user";

export type RegisterPayload = {
  fullName: string;
  email: string;
  password: string;
};

export type LoginPayload = {
  email: string;
  password: string;
};

export type VerifyOtpPayload = {
  email: string;
  otp: string;
};

export type ForgotPasswordPayload = {
  email: string;
  newPassword: string;
};

export type ResetPasswordPayload = {
  email: string;
  otp: string;
};

export type ResendOtpPayload = {
  email: string;
};

export type ResendPasswordResetOtpPayload = {
  email: string;
};

export type AuthResponse = {
  accessToken: string;
  user: User;
};

export type RegisterResponse = {
  message: string;
  email: string;
  otpExpiresAt: string;
  otpResendAvailableAt: string;
};

export type ResendOtpResponse = {
  message: string;
  email?: string;
  otpExpiresAt?: string;
  otpResendAvailableAt?: string;
};

export type ForgotPasswordResponse = {
  message: string;
  email?: string;
  otpExpiresAt?: string;
  otpResendAvailableAt?: string;
};

export type ResetPasswordResponse = {
  message: string;
};

export type LogoutResponse = {
  message: string;
};
