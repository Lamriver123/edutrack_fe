type JwtPayload = {
  exp?: unknown;
  sub?: unknown;
};

function getAccessTokenPayload(token: string) {
  const payloadPart = token.split(".")[1];

  if (!payloadPart) {
    return null;
  }

  try {
    const normalized = payloadPart.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(
      normalized.length + ((4 - (normalized.length % 4)) % 4),
      "=",
    );
    return JSON.parse(atob(padded)) as JwtPayload;
  } catch {
    return null;
  }
}

export function getAccessTokenExpiresAt(token: string) {
  const expiresAt = getAccessTokenPayload(token)?.exp;

  return typeof expiresAt === "number" && Number.isFinite(expiresAt)
    ? expiresAt * 1000
    : null;
}

export function getAccessTokenSubject(token: string | null | undefined) {
  if (!token) {
    return null;
  }

  const subject = getAccessTokenPayload(token)?.sub;

  return typeof subject === "string" && subject ? subject : null;
}

export function isAccessTokenExpired(token: string, now = Date.now()) {
  const expiresAt = getAccessTokenExpiresAt(token);

  return expiresAt !== null && expiresAt <= now;
}

export function shouldRefreshAccessToken(
  token: string | null | undefined,
  now = Date.now(),
) {
  return !token || isAccessTokenExpired(token, now);
}
