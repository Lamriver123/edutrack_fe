export const getApiBaseUrl = () => {
  const baseUrl =
    process.env.NEXT_PUBLIC_API_URL?.trim() || "http://localhost:3001/api";

  return baseUrl.replace(/\/$/, "");
};

// Auth requests stay on the frontend origin so Next.js can proxy them while
// keeping the httpOnly refresh cookie first-party on Safari/iOS. Other API
// calls remain direct to avoid proxying large uploads and PDF downloads.
export const getApiRequestUrl = (path: string) =>
  path === "/auth" || path.startsWith("/auth/")
    ? `/api${path}`
    : `${getApiBaseUrl()}${path}`;
