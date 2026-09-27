import { expect, test, type Page, type Route } from "@playwright/test";

const user = {
  id: "session-teacher",
  fullName: "Giáo viên kiểm thử phiên",
  email: "session@example.test",
  role: "teacher",
  isEmailVerified: true,
  hasPaymentQr: false,
};

const dashboardOverview = {
  generatedAt: "2026-09-27T00:00:00.000Z",
  today: "2026-09-27",
  stats: {
    activeClassCount: 0,
    activeStudentCount: 0,
    todaySessionCount: 0,
    unreadNotificationCount: 0,
    pendingPaymentCount: 0,
  },
  revenue: {
    year: 2026,
    monthly: [],
    currentMonth: {
      issuedAmount: 0,
      paidAmount: 0,
      outstandingAmount: 0,
      paidReceiptCount: 0,
      pendingReceiptCount: 0,
      receiptCount: 0,
    },
    collectedThisMonth: 0,
    overall: {
      issuedAmount: 0,
      paidAmount: 0,
      outstandingAmount: 0,
      paidReceiptCount: 0,
      pendingReceiptCount: 0,
      receiptCount: 0,
    },
  },
  todayLessons: [],
  pendingPayments: [],
};

async function seedSession(page: Page, accessToken = "stored-access-token") {
  await page.addInitScript(
    ({ accessToken, user }) => {
      window.localStorage.setItem("edutrack.accessToken", accessToken);
      window.localStorage.setItem("edutrack.user", JSON.stringify(user));
    },
    { accessToken, user },
  );
}

async function fulfillDashboard(route: Route) {
  await route.fulfill({ json: dashboardOverview });
}

test("reopening the installed app restores the stored session from the root URL", async ({
  context,
  page,
}) => {
  const requests: URL[] = [];

  await context.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    requests.push(url);

    if (url.pathname === "/api/auth/me") {
      return route.fulfill({ json: user });
    }

    if (url.pathname === "/api/dashboard/overview") {
      return fulfillDashboard(route);
    }

    return route.fulfill({ json: { message: "OK" } });
  });

  await page.goto("/offline");
  await page.evaluate(
    ({ accessToken, user }) => {
      window.localStorage.setItem("edutrack.accessToken", accessToken);
      window.localStorage.setItem("edutrack.user", JSON.stringify(user));
    },
    { accessToken: "stored-access-token", user },
  );
  await page.close();

  const reopenedPage = await context.newPage();
  await reopenedPage.goto("/");

  await expect(reopenedPage).toHaveURL(/\/dashboard$/);
  await expect(reopenedPage.getByText(user.fullName).first()).toBeVisible();

  const authRequest = requests.find(
    (request) => request.pathname === "/api/auth/me",
  );
  const dataRequest = requests.find(
    (request) => request.pathname === "/api/dashboard/overview",
  );

  expect(authRequest?.origin).toBe(new URL(reopenedPage.url()).origin);
  expect(dataRequest?.origin).not.toBe(new URL(reopenedPage.url()).origin);
});

test("an expired access token uses one same-origin refresh and persists the rotated token", async ({
  page,
}) => {
  await seedSession(page, "expired-access-token");
  let refreshCount = 0;
  const authOrigins: string[] = [];

  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());

    if (url.pathname.startsWith("/api/auth/")) {
      authOrigins.push(url.origin);
    }

    if (url.pathname === "/api/auth/me") {
      return route.fulfill({
        status:
          request.headers().authorization === "Bearer renewed-access-token"
            ? 200
            : 401,
        json:
          request.headers().authorization === "Bearer renewed-access-token"
            ? user
            : { message: "Access token expired" },
      });
    }

    if (url.pathname === "/api/auth/refresh") {
      refreshCount += 1;
      return route.fulfill({
        json: { accessToken: "renewed-access-token", user },
      });
    }

    if (url.pathname === "/api/dashboard/overview") {
      return fulfillDashboard(route);
    }

    return route.fulfill({ json: { message: "OK" } });
  });

  await page.goto("/dashboard");

  await expect(page.getByText(user.fullName).first()).toBeVisible();
  expect(refreshCount).toBe(1);
  expect(new Set(authOrigins)).toEqual(new Set([new URL(page.url()).origin]));
  await expect
    .poll(() =>
      page.evaluate(() =>
        window.localStorage.getItem("edutrack.accessToken"),
      ),
    )
    .toBe("renewed-access-token");
});

test("a temporary backend failure does not erase a locally stored session", async ({
  page,
}) => {
  await seedSession(page);

  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());

    if (url.pathname === "/api/auth/me") {
      return route.fulfill({
        status: 503,
        json: { message: "Backend is starting" },
      });
    }

    if (url.pathname === "/api/dashboard/overview") {
      return route.fulfill({
        status: 503,
        json: { message: "Backend is starting" },
      });
    }

    return route.fulfill({ json: { message: "OK" } });
  });

  await page.goto("/dashboard");

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByText(user.fullName).first()).toBeVisible();
  expect(
    await page.evaluate(() =>
      window.localStorage.getItem("edutrack.accessToken"),
    ),
  ).toBe("stored-access-token");
});

test("a device without a session is sent to login", async ({ page }) => {
  await page.route("**/api/auth/refresh", (route) =>
    route.fulfill({
      status: 401,
      json: { message: "Phiên đăng nhập đã hết hạn." },
    }),
  );

  await page.goto("/");

  await expect(page).toHaveURL(/\/login$/);
  await expect(
    page.getByRole("heading", { name: "Đăng nhập hệ thống" }),
  ).toBeVisible();
});

test("the login route shows the form immediately without an access token", async ({
  baseURL,
  context,
  page,
}) => {
  const frontendUrl = new URL(baseURL ?? "http://localhost:3000");
  await context.addCookies([
    {
      name: "edutrack_refresh_token",
      value: "test-refresh-cookie",
      domain: frontendUrl.hostname,
      path: "/api/auth",
      httpOnly: true,
      secure: frontendUrl.protocol === "https:",
      sameSite: frontendUrl.protocol === "https:" ? "None" : "Lax",
    },
  ]);
  let refreshCount = 0;

  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());

    if (url.pathname === "/api/auth/refresh") {
      refreshCount += 1;
      return route.fulfill({
        json: { accessToken: "cookie-restored-token", user },
      });
    }

    if (url.pathname === "/api/auth/me") {
      return route.fulfill({ json: user });
    }

    if (url.pathname === "/api/dashboard/overview") {
      return fulfillDashboard(route);
    }

    return route.fulfill({ json: { message: "OK" } });
  });

  await page.goto("/login");

  await expect(page).toHaveURL(/\/login$/);
  await expect(
    page.getByRole("heading", { name: "Đăng nhập hệ thống" }),
  ).toBeVisible();
  await expect(
    page.getByRole("status").filter({ hasText: "Đang khôi phục phiên" }),
  ).toHaveCount(0);
  expect(refreshCount).toBe(0);
  expect(
    await page.evaluate(() =>
      window.localStorage.getItem("edutrack.accessToken"),
    ),
  ).toBeNull();
});

test("the dashboard route still restores a valid refresh-cookie session", async ({
  baseURL,
  context,
  page,
}) => {
  const frontendUrl = new URL(baseURL ?? "http://localhost:3000");
  await context.addCookies([
    {
      name: "edutrack_refresh_token",
      value: "test-refresh-cookie",
      domain: frontendUrl.hostname,
      path: "/api/auth",
      httpOnly: true,
      secure: frontendUrl.protocol === "https:",
      sameSite: frontendUrl.protocol === "https:" ? "None" : "Lax",
    },
  ]);
  let refreshCookieHeader = "";

  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());

    if (url.pathname === "/api/auth/refresh") {
      refreshCookieHeader = request.headers().cookie ?? "";
      return route.fulfill({
        json: { accessToken: "cookie-restored-token", user },
      });
    }

    if (url.pathname === "/api/auth/me") {
      return route.fulfill({ json: user });
    }

    if (url.pathname === "/api/dashboard/overview") {
      return fulfillDashboard(route);
    }

    return route.fulfill({ json: { message: "OK" } });
  });

  await page.goto("/dashboard");

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByText(user.fullName).first()).toBeVisible();
  expect(refreshCookieHeader).toContain(
    "edutrack_refresh_token=test-refresh-cookie",
  );
  expect(
    await page.evaluate(() =>
      window.localStorage.getItem("edutrack.accessToken"),
    ),
  ).toBe("cookie-restored-token");
});
