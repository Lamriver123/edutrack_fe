export type UserRole = "teacher";

export type User = {
  id: string;
  fullName: string;
  avatarUrl?: string;
  phone?: string;
  address?: string;
  bio?: string;
  bankAccountName?: string;
  bankAccountNumber?: string;
  email: string;
  role: UserRole;
  isEmailVerified: boolean;
  hasPaymentQr: boolean;
  paymentQrImageContentType?: string;
  paymentQrImageSize?: number;
  paymentQrImageUpdatedAt?: string;
};

export type UpdateProfilePayload = {
  fullName?: string;
  avatarUrl?: string;
  phone?: string;
  address?: string;
  bio?: string;
  bankAccountName?: string;
  bankAccountNumber?: string;
};

export type ChangePasswordPayload = {
  currentPassword: string;
  newPassword: string;
};
