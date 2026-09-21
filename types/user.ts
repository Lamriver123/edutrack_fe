export type UserRole = "teacher";

export type PaymentBank = {
  id: number;
  name: string;
  code: string;
  bin: string;
  shortName: string;
  logo: string;
};

export type User = {
  id: string;
  fullName: string;
  avatarUrl?: string;
  phone?: string;
  address?: string;
  bio?: string;
  bankAccountName?: string;
  bankAccountNumber?: string;
  bankName?: string;
  bankCode?: string;
  bankBin?: string;
  bankLogoUrl?: string;
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
  bankBin?: string;
};

export type PaymentQrUploadResponse = User & {
  paymentQrBankDetection?: {
    bankBin: string;
    bankLogoUrl: string;
    bankName: string;
  };
};

export type ChangePasswordPayload = {
  currentPassword: string;
  newPassword: string;
};
