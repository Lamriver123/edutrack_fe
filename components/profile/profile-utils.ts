import type { UpdateProfilePayload, User } from "@/types/user";
import jsQR from "jsqr";
import {
  normalizeQrCrop,
  type QrCropState,
} from "@/components/profile/profile-qr-crop";

export type ProfileFormState = {
  fullName: string;
  avatarUrl: string;
  bankAccountName: string;
  bankAccountNumber: string;
  bankBin: string;
  phone: string;
  address: string;
  bio: string;
};

export type ConfirmAction =
  | "profile"
  | "password"
  | "paymentQr"
  | "unrecognizedPaymentQr"
  | "removePaymentQr";

export type ConfirmDialogConfig = {
  confirmText: string;
  description: string;
  isLoading: boolean;
  onConfirm: () => void;
  title: string;
  tone?: "danger";
};

export function buildProfileForm(user: User): ProfileFormState {
  return {
    address: user.address ?? "",
    avatarUrl: user.avatarUrl ?? "",
    bankAccountName: user.bankAccountName ?? "",
    bankAccountNumber: user.bankAccountNumber ?? "",
    bankBin: user.bankBin ?? "",
    bio: user.bio ?? "",
    fullName: user.fullName ?? "",
    phone: user.phone ?? "",
  };
}

export function buildProfilePayload(
  form: ProfileFormState,
): UpdateProfilePayload {
  return {
    address: form.address.trim(),
    avatarUrl: form.avatarUrl.trim(),
    bankAccountName: form.bankAccountName.trim(),
    bankAccountNumber: form.bankAccountNumber.trim(),
    bankBin: form.bankBin.trim(),
    bio: form.bio.trim(),
    fullName: form.fullName.trim(),
    phone: form.phone.trim(),
  };
}

export function getConfirmConfig(
  action: ConfirmAction,
  handlers: {
    hasAvatarFile: boolean;
    isChangingPassword: boolean;
    isRemovingQr: boolean;
    isSavingProfile: boolean;
    isUploadingQr: boolean;
    onChangePassword: () => void;
    onRemoveQr: () => void;
    onSaveProfile: () => void;
    onUploadUnrecognizedQr: () => void;
    onUploadQr: () => void;
    unrecognizedPaymentQrDescription?: string;
  },
): ConfirmDialogConfig {
  const profileDescription = handlers.hasAvatarFile
    ? "Ảnh đại diện sẽ được tải lên Cloudinary, sau đó URL mới được lưu vào hồ sơ giáo viên."
    : "Thông tin hồ sơ sẽ được cập nhật trên hệ thống.";

  const configs: Record<ConfirmAction, ConfirmDialogConfig> = {
    password: {
      confirmText: "Đổi mật khẩu",
      description: "Mật khẩu mới sẽ được áp dụng cho tài khoản giáo viên này.",
      isLoading: handlers.isChangingPassword,
      onConfirm: handlers.onChangePassword,
      title: "Xác nhận đổi mật khẩu",
    },
    paymentQr: {
      confirmText: "Lưu QR",
      description:
        "Ảnh QR sẽ được lưu trực tiếp vào database. Nếu nhận diện được ngân hàng, hệ thống chỉ cập nhật tên và logo ngân hàng; thông tin tài khoản hiện tại được giữ nguyên.",
      isLoading: handlers.isUploadingQr,
      onConfirm: handlers.onUploadQr,
      title: "Xác nhận lưu QR thanh toán",
    },
    profile: {
      confirmText: "Lưu hồ sơ",
      description: profileDescription,
      isLoading: handlers.isSavingProfile,
      onConfirm: handlers.onSaveProfile,
      title: "Xác nhận cập nhật hồ sơ",
    },
    unrecognizedPaymentQr: {
      confirmText: "Vẫn lưu QR",
      description:
        handlers.unrecognizedPaymentQrDescription ??
        "Không nhận diện được ngân hàng từ ảnh QR. Nếu vẫn lưu QR, thông tin ngân hàng, tên và số tài khoản hiện tại sẽ được giữ nguyên.",
      isLoading: handlers.isUploadingQr,
      onConfirm: handlers.onUploadUnrecognizedQr,
      title: "Chưa xác minh được QR thanh toán",
    },
    removePaymentQr: {
      confirmText: "Xóa QR",
      description:
        "Ảnh QR thanh toán hiện tại sẽ bị xóa khỏi database của tài khoản.",
      isLoading: handlers.isRemovingQr,
      onConfirm: handlers.onRemoveQr,
      title: "Xóa QR thanh toán",
      tone: "danger",
    },
  };

  return configs[action];
}

export async function createCroppedQrFile(file: File, crop: QrCropState) {
  const image = await loadImageFromFile(file);
  const normalizedCrop = normalizeQrCrop(crop);
  const sourceX = Math.round((image.naturalWidth * normalizedCrop.x) / 100);
  const sourceY = Math.round((image.naturalHeight * normalizedCrop.y) / 100);
  const sourceWidth = Math.round(
    (image.naturalWidth * normalizedCrop.width) / 100,
  );
  const sourceHeight = Math.round(
    (image.naturalHeight * normalizedCrop.height) / 100,
  );
  const scale = Math.min(1, 1400 / Math.max(sourceWidth, sourceHeight));
  const outputWidth = Math.max(1, Math.round(sourceWidth * scale));
  const outputHeight = Math.max(1, Math.round(sourceHeight * scale));
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Trình duyệt không hỗ trợ chỉnh sửa ảnh QR.");
  }

  canvas.width = outputWidth;
  canvas.height = outputHeight;
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, outputWidth, outputHeight);
  context.drawImage(
    image,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    0,
    0,
    outputWidth,
    outputHeight,
  );

  const outputType = getCanvasOutputType(file.type);
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, outputType, 0.95);
  });

  if (!blob) {
    throw new Error("Không thể tạo ảnh QR sau khi cắt.");
  }

  const finalType = blob.type || outputType;
  const extension = finalType.split("/")[1] || "png";
  const fileName = `payment-qr-${Date.now()}.${extension}`;

  return new File([blob], fileName, {
    lastModified: Date.now(),
    type: finalType,
  });
}

export async function decodeQrContent(file: File) {
  const image = await loadImageFromFile(file);
  const scale = Math.min(
    1,
    1600 / Math.max(image.naturalWidth, image.naturalHeight),
  );
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d", { willReadFrequently: true });

  if (!context) {
    return undefined;
  }

  canvas.width = width;
  canvas.height = height;
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);

  const imageData = context.getImageData(0, 0, width, height);
  const result = jsQR(imageData.data, width, height, {
    inversionAttempts: "attemptBoth",
  });

  return result?.data.trim() || undefined;
}

function loadImageFromFile(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Không thể đọc ảnh QR đã chọn."));
    };
    image.src = objectUrl;
  });
}

function getCanvasOutputType(fileType: string) {
  if (fileType === "image/jpeg" || fileType === "image/webp") {
    return fileType;
  }

  return "image/png";
}

export function formatFileSize(size?: number) {
  if (!size) {
    return "ảnh QR";
  }

  if (size < 1024 * 1024) {
    return `${Math.max(1, Math.round(size / 1024))}KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)}MB`;
}
