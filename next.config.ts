import type { NextConfig } from "next";

function normalizeApiUrl(value: string) {
  const url = value.trim().replace(/\/$/, "");
  return url.endsWith("/api") ? url : `${url}/api`;
}

const publicBackendApiUrl = normalizeApiUrl(
  process.env.NEXT_PUBLIC_API_URL ??
    process.env.VITE_API_URL ??
    "http://localhost:3001/api",
);
const proxyBackendApiUrl = normalizeApiUrl(
  process.env.API_PROXY_TARGET ?? publicBackendApiUrl,
);

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_API_URL: publicBackendApiUrl,
  },
  async headers() {
    return [
      {
        source: "/api/auth/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store, max-age=0",
          },
        ],
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: "/api/auth/:path*",
        destination: `${proxyBackendApiUrl}/auth/:path*`,
      },
    ];
  },
};

export default nextConfig;
