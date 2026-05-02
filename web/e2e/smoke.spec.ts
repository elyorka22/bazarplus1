import { test, expect } from "@playwright/test";

test.describe("Public smoke", () => {
  test("home shows brand and navigation", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("BazarPlus")).toBeVisible();
    await expect(page.getByRole("link", { name: /kirish/i })).toBeVisible();
  });

  test("products page renders filters", async ({ page }) => {
    await page.goto("/products");
    await expect(page.getByRole("link", { name: "Hammasi" })).toBeVisible();
  });
});

test.describe("Checkout flow (mocked API)", () => {
  test.beforeEach(async ({ page }) => {
    // Mimic a valid refresh-session so AuthProvider bootstraps without the login form
    // (react-hook-form + Playwright input sync is flaky in production builds).
    await page.route("**/api/auth/refresh", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          accessToken: "test-access-token",
          expiresIn: "15m",
        }),
      });
    });

    await page.route("**/api/auth/login", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          accessToken: "test-access-token",
          expiresIn: "15m",
        }),
      });
    });

    await page.route("**/users/me", async (route) => {
      if (route.request().method() !== "GET") {
        await route.continue();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "user-1",
          email: "e2e@example.com",
          name: "E2E",
          phone: null,
          role: "USER",
        }),
      });
    });

    await page.route("**/users/me/addresses", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          {
            id: "11111111-1111-4111-8111-111111111111",
            userId: "user-1",
            label: "Home",
            line1: "1 Test St",
            line2: null,
            city: "City",
            postalCode: "X0X0X0",
            lat: 0,
            lng: 0,
            isDefault: true,
          },
        ]),
      });
    });

    await page.route(
      (url) => url.pathname === "/orders",
      async (route) => {
        if (route.request().method() !== "POST") {
          await route.continue();
          return;
        }
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({
            id: "order-mock-1",
            status: "CREATED",
            totalPrice: "10.00",
            items: [],
          }),
        });
      },
    );
  });

  test("cart → checkout → order redirect (localStorage cart)", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      localStorage.setItem(
        "bazarplus_cart_v1",
        JSON.stringify([
          {
            productId: "p1",
            quantity: 1,
            product: {
              id: "p1",
              name: "Test item",
              price: "10.00",
              imageUrl: null,
              stock: 99,
            },
          },
        ]),
      );
    });

    await page.goto("/checkout");
    await expect(page.getByText(/Manzillar yuklanmoqda/i)).toBeHidden({
      timeout: 15_000,
    });
    await page
      .locator("select")
      .first()
      .selectOption("11111111-1111-4111-8111-111111111111");
    await page.getByRole("button", { name: /buyurtmani tasdiqlash/i }).click();

    await expect(page).toHaveURL(/\/orders\/order-mock-1/, {
      timeout: 15_000,
    });
  });
});
