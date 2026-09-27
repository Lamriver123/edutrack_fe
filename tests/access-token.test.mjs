import assert from "node:assert/strict";
import test from "node:test";

import {
  getAccessTokenExpiresAt,
  getAccessTokenSubject,
  isAccessTokenExpired,
  shouldRefreshAccessToken,
} from "../lib/auth/access-token.ts";
import {
  AUTH_SESSION_EXPIRED_EVENT,
  tokenStorage,
} from "../lib/auth/token-storage.ts";

function createToken(payload) {
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString(
    "base64url",
  );

  return `header.${encodedPayload}.signature`;
}

test("reads the access-token identity and expiry from a base64url JWT payload", () => {
  const expiresAt = Date.UTC(2026, 8, 27, 14, 0, 0);
  const token = createToken({ exp: expiresAt / 1000, sub: "teacher-1" });

  assert.equal(getAccessTokenExpiresAt(token), expiresAt);
  assert.equal(getAccessTokenSubject(token), "teacher-1");
});

test("refreshes before a protected request when its token is missing or expired", () => {
  const now = Date.UTC(2026, 8, 27, 14, 0, 0);
  const expiredToken = createToken({ exp: now / 1000 });
  const validToken = createToken({ exp: now / 1000 + 60 });

  assert.equal(shouldRefreshAccessToken(null, now), true);
  assert.equal(shouldRefreshAccessToken(expiredToken, now), true);
  assert.equal(shouldRefreshAccessToken(validToken, now), false);
  assert.equal(isAccessTokenExpired(expiredToken, now), true);
});

test("leaves opaque or malformed tokens to the reactive 401 retry", () => {
  assert.equal(getAccessTokenExpiresAt("opaque-token"), null);
  assert.equal(getAccessTokenSubject("opaque-token"), null);
  assert.equal(shouldRefreshAccessToken("opaque-token"), false);
});

test("does not erase a session replaced by another tab during refresh", () => {
  const previousWindow = globalThis.window;
  const values = new Map();
  const events = new EventTarget();
  let expiredEventCount = 0;

  globalThis.window = {
    localStorage: {
      getItem(key) {
        return values.get(key) ?? null;
      },
      setItem(key, value) {
        values.set(key, String(value));
      },
      removeItem(key) {
        values.delete(key);
      },
    },
    dispatchEvent(event) {
      return events.dispatchEvent(event);
    },
  };

  events.addEventListener(AUTH_SESSION_EXPIRED_EVENT, () => {
    expiredEventCount += 1;
  });

  try {
    tokenStorage.setSession("new-access-token", {
      id: "teacher-1",
      fullName: "Teacher",
      email: "teacher@example.test",
      role: "teacher",
      isEmailVerified: true,
    });

    assert.equal(tokenStorage.expireSession("old-access-token"), false);
    assert.equal(tokenStorage.getAccessToken(), "new-access-token");
    assert.equal(expiredEventCount, 0);

    assert.equal(tokenStorage.expireSession("new-access-token"), true);
    assert.equal(tokenStorage.getAccessToken(), null);
    assert.equal(tokenStorage.getUser(), null);
    assert.equal(expiredEventCount, 1);
  } finally {
    if (previousWindow === undefined) {
      delete globalThis.window;
    } else {
      globalThis.window = previousWindow;
    }
  }
});
