import type { AuthResponse } from "@/types/auth";
import { tokenStorage } from "@/lib/auth/token-storage";

export class ApiError extends Error {
  status: number;
  code?: string;
  details: unknown;

  constructor(message: string, status: number, details: unknown, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
    this.code = code;
  }
}

type ApiRequestOptions = RequestInit & {
  token?: string | null;
  skipAuthRefresh?: boolean;
};

export type ApiBlobResponse = {
  blob: Blob;
  contentType?: string;
  fileName: string;
};

export const getApiBaseUrl = () => {
  const baseUrl =
    process.env.NEXT_PUBLIC_API_URL?.trim() || "http://localhost:3001/api";

  return baseUrl.replace(/\/$/, "");
};

export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {},
) {
  const { skipAuthRefresh, token, ...requestOptions } = options;
  const headers = new Headers(requestOptions.headers);

  if (requestOptions.body && !(requestOptions.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...requestOptions,
    credentials: requestOptions.credentials ?? "include",
    headers,
  });

  if (response.status === 401 && token && !skipAuthRefresh) {
    const refreshedSession = await refreshSession();

    if (refreshedSession) {
      const retryHeaders = new Headers(headers);
      retryHeaders.set(
        "Authorization",
        `Bearer ${refreshedSession.accessToken}`,
      );

      response = await fetch(`${getApiBaseUrl()}${path}`, {
        ...requestOptions,
        credentials: requestOptions.credentials ?? "include",
        headers: retryHeaders,
      });
    }
  }

  const payload = await readResponsePayload(response);

  if (!response.ok) {
    throwApiError(response, payload);
  }

  return payload as T;
}

export async function apiBlobRequest(
  path: string,
  options: ApiRequestOptions = {},
): Promise<ApiBlobResponse> {
  const { skipAuthRefresh, token, ...requestOptions } = options;
  const headers = new Headers(requestOptions.headers);

  if (requestOptions.body && !(requestOptions.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...requestOptions,
    credentials: requestOptions.credentials ?? "include",
    headers,
  });

  if (response.status === 401 && token && !skipAuthRefresh) {
    const refreshedSession = await refreshSession();

    if (refreshedSession) {
      const retryHeaders = new Headers(headers);
      retryHeaders.set(
        "Authorization",
        `Bearer ${refreshedSession.accessToken}`,
      );

      response = await fetch(`${getApiBaseUrl()}${path}`, {
        ...requestOptions,
        credentials: requestOptions.credentials ?? "include",
        headers: retryHeaders,
      });
    }
  }

  if (!response.ok) {
    throwApiError(response, await readResponsePayload(response));
  }

  const contentType = response.headers.get("content-type") ?? undefined;
  const fileName =
    getFileNameFromContentDisposition(
      response.headers.get("content-disposition"),
    ) ?? "receipt.pdf";

  return {
    blob: await response.blob(),
    contentType,
    fileName,
  };
}

async function refreshSession() {
  const response = await fetch(`${getApiBaseUrl()}/auth/refresh`, {
    method: "POST",
    credentials: "include",
  });

  if (!response.ok) {
    tokenStorage.clearSession();
    return null;
  }

  const session = (await response.json()) as AuthResponse;
  tokenStorage.setSession(session.accessToken, session.user);

  return session;
}

async function readResponsePayload(response: Response) {
  const contentType = response.headers.get("content-type");
  const text = await response.text();

  if (!contentType?.includes("application/json") || !text.trim()) {
    return text;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function throwApiError(response: Response, payload: unknown): never {
  const details =
    payload && typeof payload === "object"
      ? (payload as { message?: unknown; code?: string })
      : undefined;
  const message = Array.isArray(details?.message)
    ? details.message.join(", ")
    : typeof details?.message === "string"
      ? details.message
      : typeof payload === "string" && payload.trim()
        ? payload
        : "Không thể kết nối máy chủ. Vui lòng thử lại.";

  throw new ApiError(message, response.status, payload, details?.code);
}

function getFileNameFromContentDisposition(value: string | null) {
  if (!value) {
    return null;
  }

  const utf8Name = /filename\*=UTF-8''([^;]+)/i.exec(value)?.[1];

  if (utf8Name) {
    try {
      return decodeURIComponent(utf8Name);
    } catch {
      return utf8Name;
    }
  }

  return /filename="?([^";]+)"?/i.exec(value)?.[1] ?? null;
}
