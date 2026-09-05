import type { AuthResponse } from "@/types/auth";
import type {
  ChangePasswordPayload,
  UpdateProfilePayload,
  User,
} from "@/types/user";
import { tokenStorage } from "@/lib/auth/token-storage";
import { ApiError, apiRequest, getApiBaseUrl } from "./client";

function getToken() {
  return tokenStorage.getAccessToken();
}

async function refreshForBinaryRequest() {
  try {
    const session = await apiRequest<AuthResponse>("/auth/refresh", {
      method: "POST",
      skipAuthRefresh: true,
    });
    tokenStorage.setSession(session.accessToken, session.user);

    return session.accessToken;
  } catch {
    tokenStorage.clearSession();
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

  uploadPaymentQr(file: File) {
    const formData = new FormData();
    formData.append("file", file);

    return apiRequest<User>("/users/me/payment-qr", {
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
      if (!(error instanceof ApiError) || error.status !== 401 || !token) {
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
};
