import { test, expect, type Route } from "@playwright/test";

/** Credentialed XHR from Next (port A) to API URL (port B) triggers CORS preflight. */
function corsForRequest(route: Route): Record<string, string> {
  const origin = route.request().headers()["origin"];
  if (!origin) return {};
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Credentials": "true",
  };
}

async function fulfillJson(route: Route, body: unknown) {
  await route.fulfill({
    status: 200,
    headers: {
      ...corsForRequest(route),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

async function fulfillPreflight(route: Route) {
  await route.fulfill({
    status: 204,
    headers: {
      ...corsForRequest(route),
      "Access-Control-Allow-Methods":
        "GET, POST, PATCH, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Authorization, Content-Type",
    },
  });
}

test.describe("Admin orders page", () => {
  test.setTimeout(60_000);

  test.beforeEach(async ({ page }) => {
    await page.route("**/api/auth/refresh", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          accessToken: "e2e-admin-token",
          expiresIn: "15m",
        }),
      });
    });

    await page.route(
      (url) => url.pathname === "/users/me",
      async (route) => {
        if (route.request().method() === "OPTIONS") {
          await fulfillPreflight(route);
          return;
        }
        if (route.request().method() !== "GET") {
          await route.continue();
          return;
        }
        await fulfillJson(route, {
          id: "admin-e2e-user",
          email: "admin-e2e@example.com",
          name: "Admin E2E",
          phone: null,
          role: "ADMIN",
        });
      },
    );

    await page.route(
      (url) => url.pathname === "/admin/orders" || url.pathname.startsWith("/admin/orders/"),
      async (route) => {
        if (route.request().resourceType() === "document") {
          await route.continue();
          return;
        }
        if (route.request().method() === "OPTIONS") {
          await fulfillPreflight(route);
          return;
        }
        if (route.request().method() !== "GET") {
          await route.continue();
          return;
        }
        await fulfillJson(route, {
          items: [],
          meta: {
            total: 0,
            page: 1,
            limit: 20,
            totalPages: 0,
          },
        });
      },
    );

    await page.route(
      (url) => url.pathname === "/courier/available",
      async (route) => {
        if (route.request().method() === "OPTIONS") {
          await fulfillPreflight(route);
          return;
        }
        if (route.request().method() !== "GET") {
          await route.continue();
          return;
        }
        await fulfillJson(route, []);
      },
    );
  });

  test("loads without crash — table and Orders heading visible", async ({
    page,
  }) => {
    const crashErrors: string[] = [];
    page.on("pageerror", (err) => {
      crashErrors.push(err.message);
    });

    await page.goto("/admin/orders", {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });

    await expect(page.getByRole("heading", { name: "Orders" })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByRole("table")).toBeVisible();

    expect(crashErrors, `page errors: ${crashErrors.join("; ")}`).toEqual([]);
  });
});
