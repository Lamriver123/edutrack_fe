import type { AuthResponse } from "@/types/auth";
import {
  getAccessTokenSubject,
  shouldRefreshAccessToken,
} from "@/lib/auth/access-token";
import { tokenStorage } from "@/lib/auth/token-storage";
import { getApiRequestUrl } from "./url";

export { getApiBaseUrl, getApiRequestUrl } from "./url";

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

let refreshPromise: Promise<AuthResponse | null> | null = null;
const AUTH_REFRESH_LOCK_NAME = "edutrack-auth-refresh";

export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {},
) {
  const response = await executeRequest(path, options);

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
  const response = await executeRequest(path, options);

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

async function executeRequest(path: string, options: ApiRequestOptions) {
  const requiresAuth = Object.prototype.hasOwnProperty.call(options, "token");
  const { skipAuthRefresh, token, ...requestOptions } = options;
  const baseHeaders = new Headers(requestOptions.headers);

  if (requestOptions.body && !(requestOptions.body instanceof FormData)) {
    baseHeaders.set("Content-Type", "application/json");
  }

  let activeToken = token ?? null;
  const expectedUserId =
    getAccessTokenSubject(activeToken) ?? tokenStorage.getUser()?.id ?? null;
  let refreshAttempted = false;

  if (
    requiresAuth &&
    !skipAuthRefresh &&
    shouldRefreshAccessToken(activeToken)
  ) {
    refreshAttempted = true;
    const refreshedSession = await refreshSession(activeToken);

    if (!refreshedSession) {
      throw createSessionExpiredError();
    }

    activeToken = getRefreshedAccessToken(refreshedSession, expectedUserId);
  }

  const send = (accessToken: string | null) => {
    const headers = new Headers(baseHeaders);

    if (requiresAuth) {
      if (accessToken) {
        headers.set("Authorization", `Bearer ${accessToken}`);
      } else {
        headers.delete("Authorization");
      }
    }

    return fetch(getApiRequestUrl(path), {
      ...requestOptions,
      credentials: requestOptions.credentials ?? "include",
      headers,
    });
  };

  let response = await send(activeToken);

  if (
    response.status === 401 &&
    requiresAuth &&
    !skipAuthRefresh &&
    !refreshAttempted
  ) {
    refreshAttempted = true;
    const refreshedSession = await refreshSession(activeToken);

    if (!refreshedSession) {
      throw createSessionExpiredError();
    }

    activeToken = getRefreshedAccessToken(refreshedSession, expectedUserId);
    response = await send(activeToken);
  }

  if (
    response.status === 401 &&
    requiresAuth &&
    !skipAuthRefresh &&
    refreshAttempted
  ) {
    tokenStorage.expireSession(activeToken);
  }

  return response;
}

async function refreshSession(observedAccessToken: string | null) {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = coordinateRefresh(observedAccessToken).finally(
    () => {
      refreshPromise = null;
    },
  );

  return refreshPromise;
}

async function coordinateRefresh(observedAccessToken: string | null) {
  const runRefresh = () => refreshOrReuseStoredSession(observedAccessToken);

  if (typeof navigator !== "undefined" && navigator.locks) {
    return navigator.locks.request(AUTH_REFRESH_LOCK_NAME, runRefresh);
  }

  return runRefresh();
}

async function refreshOrReuseStoredSession(observedAccessToken: string | null) {
  const replacement = getStoredReplacementSession(observedAccessToken);

  if (replacement) {
    return replacement;
  }

  const session = await performRefreshSession(observedAccessToken);

  return session ?? getStoredReplacementSession(observedAccessToken);
}

function getStoredReplacementSession(observedAccessToken: string | null) {
  const accessToken = tokenStorage.getAccessToken();
  const user = tokenStorage.getUser();

  if (
    accessToken &&
    accessToken !== observedAccessToken &&
    user &&
    !shouldRefreshAccessToken(accessToken)
  ) {
    return { accessToken, user } satisfies AuthResponse;
  }

  return null;
}

function getRefreshedAccessToken(
  session: AuthResponse,
  expectedUserId: string | null,
) {
  const tokenUserId = getAccessTokenSubject(session.accessToken);
  const sessionUserId = session.user.id;

  if (
    (tokenUserId && tokenUserId !== sessionUserId) ||
    (expectedUserId && expectedUserId !== (tokenUserId ?? sessionUserId))
  ) {
    tokenStorage.notifySessionChanged();
    throw createSessionChangedError();
  }

  return session.accessToken;
}

async function performRefreshSession(observedAccessToken: string | null) {
  const response = await fetch(getApiRequestUrl("/auth/refresh"), {
    method: "POST",
    credentials: "include",
  });

  if (!response.ok) {
    const payload = await readResponsePayload(response);

    if (response.status === 401 || response.status === 403) {
      tokenStorage.expireSession(observedAccessToken);
      return null;
    }

    throwApiError(response, payload);
  }

  const session = (await response.json()) as AuthResponse;
  tokenStorage.setSession(session.accessToken, session.user);

  return session;
}

export async function refreshAuthSession() {
  const session = await refreshSession(tokenStorage.getAccessToken());

  if (!session) {
    throw createSessionExpiredError();
  }

  return session;
}

function createSessionExpiredError() {
  return new ApiError(
    "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
    401,
    {
      code: "AUTH_SESSION_EXPIRED",
      message: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
    },
    "AUTH_SESSION_EXPIRED",
  );
}

function createSessionChangedError() {
  return new ApiError(
    "Tài khoản đăng nhập đã thay đổi. Trang sẽ được tải lại để bảo vệ dữ liệu.",
    409,
    {
      code: "AUTH_SESSION_CHANGED",
      message:
        "Tài khoản đăng nhập đã thay đổi. Trang sẽ được tải lại để bảo vệ dữ liệu.",
    },
    "AUTH_SESSION_CHANGED",
  );
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
