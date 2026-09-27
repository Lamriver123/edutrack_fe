import type {
  ChangePasswordPayload,
  PaymentBank,
  PaymentQrUploadResponse,
  UpdateProfilePayload,
  User,
} from "@/types/user";
import { tokenStorage } from "@/lib/auth/token-storage";
import {
  ApiError,
  apiRequest,
  getApiBaseUrl,
  refreshAuthSession,
} from "./client";

function getToken() {
  return tokenStorage.getAccessToken();
}

async function pushRequest<T>(path: string, options: Parameters<typeof apiRequest>[1] = {}) {
  // AbortController also works on iOS versions that lack AbortSignal.timeout().
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    return await apiRequest<T>(path, { ...options, token: getToken(), signal: controller.signal });
  } catch (error) {
    if (controller.signal.aborted) throw new Error("Máy chủ thông báo phản hồi quá lâu. Hãy đợi một chút rồi kiểm tra lại.");
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

async function refreshForBinaryRequest() {
  try {
    const session = await refreshAuthSession();

    return session.accessToken;
  } catch {
    return null;
  }
}

async function readBinaryError(response: Response) {
  const contentType = response.headers.get("content-type");

  if (contentType?.includes("application/json")) {
    const payload = (await response.json()) as { message?: unknown };
    const message = Array.isArray(payload.message)
      ? payload.message.join(", ")
      : typeof payload.message === "string"
        ? payload.message
        : "Không thể tải ảnh QR thanh toán.";

    throw new ApiError(message, response.status, payload);
  }

  throw new ApiError(
    "Không thể tải ảnh QR thanh toán.",
    response.status,
    await response.text(),
  );
}

async function fetchPaymentQrBlob(token: string | null) {
  const response = await fetch(`${getApiBaseUrl()}/users/me/payment-qr`, {
    credentials: "include",
    headers: token
      ? {
          Authorization: `Bearer ${token}`,
        }
      : undefined,
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    await readBinaryError(response);
  }

  return response.blob();
}

export const profileApi = {
  getProfile() {
    return apiRequest<User>("/users/me", {
      token: getToken(),
    });
  },

  getBanks() {
    return apiRequest<PaymentBank[]>("/users/banks", {
      token: getToken(),
    });
  },

  updateProfile(payload: UpdateProfilePayload) {
    return apiRequest<User>("/users/me", {
      method: "PATCH",
      token: getToken(),
      body: JSON.stringify(payload),
    });
  },

  changePassword(payload: ChangePasswordPayload) {
    return apiRequest<{ message: string }>("/users/me/password", {
      method: "PATCH",
      token: getToken(),
      body: JSON.stringify(payload),
    });
  },

  uploadTeacherAvatar(file: File) {
    const formData = new FormData();
    formData.append("file", file);

    return apiRequest<{ url: string; publicId: string }>("/users/me/avatar", {
      method: "POST",
      token: getToken(),
      body: formData,
    });
  },

  uploadMedia(file: File) {
    const formData = new FormData();
    formData.append("file", file);

    return apiRequest<{ url: string; recentMediaUrls: string[] }>("/users/me/media", {
      method: "POST",
      token: getToken(),
      body: formData,
    });
  },

  getMediaHistory() {
    return apiRequest<{ recentMediaUrls: string[] }>("/users/me/media", {
      token: getToken(),
    });
  },

  uploadPaymentQr(file: File, qrContent?: string, allowUnrecognized = false) {
    const formData = new FormData();
    formData.append("file", file);
    if (qrContent) {
      formData.append("qrContent", qrContent);
    }
    if (allowUnrecognized) {
      formData.append("allowUnrecognized", "true");
    }

    return apiRequest<PaymentQrUploadResponse>("/users/me/payment-qr", {
      method: "POST",
      token: getToken(),
      body: formData,
    });
  },

  async getPaymentQrBlob() {
    let token = getToken();

    try {
      return await fetchPaymentQrBlob(token);
    } catch (error) {
      if (!(error instanceof ApiError) || error.status !== 401) {
        throw error;
      }
    }

    token = await refreshForBinaryRequest();

    if (!token) {
      return null;
    }

    return fetchPaymentQrBlob(token);
  },

  removePaymentQr() {
    return apiRequest<User>("/users/me/payment-qr", {
      method: "DELETE",
      token: getToken(),
    });
  },

  subscribeToPush(subscription: unknown) {
    return pushRequest<{ success: boolean }>("/users/me/push-subscription", {
      method: "POST",
      token: getToken(),
      body: JSON.stringify(subscription),
    });
  },

  unsubscribeFromPush(endpoint: string) {
    return pushRequest<{ success: boolean }>("/users/me/push-subscription", {
      method: "DELETE",
      token: getToken(),
      body: JSON.stringify({ endpoint }),
    });
  },

  getPushStatus() {
    return pushRequest<{ configured: boolean; publicKey: string | null; subscriptionCount: number; configurationError?: string }>("/users/me/push-subscription/status");
  },

  testPush(endpoint: string) {
    return pushRequest<{ attempted: number; sent: number; failed: number; removed: number; configured: boolean; message: string }>("/users/me/push-subscription/test", {
      method: "POST",
      token: getToken(),
      body: JSON.stringify({ endpoint }),
    });
  },
};
