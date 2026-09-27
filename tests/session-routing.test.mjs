import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { getApiBaseUrl, getApiRequestUrl } from "../lib/api/url.ts";

test("routes auth through the same-origin proxy and keeps other API calls direct", () => {
  const previousUrl = process.env.NEXT_PUBLIC_API_URL;
  process.env.NEXT_PUBLIC_API_URL = "https://edutrack-be.onrender.com/api/";

  try {
    assert.equal(getApiBaseUrl(), "https://edutrack-be.onrender.com/api");
    assert.equal(getApiRequestUrl("/auth/login"), "/api/auth/login");
    assert.equal(getApiRequestUrl("/auth/refresh"), "/api/auth/refresh");
    assert.equal(
      getApiRequestUrl("/students/avatar"),
      "https://edutrack-be.onrender.com/api/students/avatar",
    );
  } finally {
    if (previousUrl === undefined) {
      delete process.env.NEXT_PUBLIC_API_URL;
    } else {
      process.env.NEXT_PUBLIC_API_URL = previousUrl;
    }
  }
});

test("Next proxies only auth endpoints to the backend API", async () => {
  const previousProxyTarget = process.env.API_PROXY_TARGET;
  process.env.API_PROXY_TARGET = "https://api.example.test/api";

  try {
    const { default: config } = await import(
      `../next.config.ts?session-routing=${Date.now()}`
    );
    const rewrites = await config.rewrites();

    assert.deepEqual(rewrites, [
      {
        source: "/api/auth/:path*",
        destination: "https://api.example.test/api/auth/:path*",
      },
    ]);
  } finally {
    if (previousProxyTarget === undefined) {
      delete process.env.API_PROXY_TARGET;
    } else {
      process.env.API_PROXY_TARGET = previousProxyTarget;
    }
  }
});

test("the installed PWA opens the protected session-restoring route", async () => {
  const manifest = JSON.parse(
    await readFile(new URL("../public/manifest.json", import.meta.url), "utf8"),
  );

  assert.equal(manifest.start_url, "/dashboard");
});
