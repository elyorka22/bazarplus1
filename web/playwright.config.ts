import { defineConfig, devices } from "@playwright/test";

const port = process.env.PORT ?? "3001";
const baseURL =
  process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: process.env.PLAYWRIGHT_SKIP_WEBSERVER
    ? undefined
    : {
        command: `npm run dev -- -p ${port}`,
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        env: {
          ...process.env,
          NEXT_PUBLIC_API_URL:
            process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000",
          /** Stable Playwright: skip Socket.IO client (no WS / io() crash). */
          NEXT_PUBLIC_DISABLE_SOCKET:
            process.env.NEXT_PUBLIC_DISABLE_SOCKET ?? "true",
          NEXT_PUBLIC_DISABLE_GEOLOCATION:
            process.env.NEXT_PUBLIC_DISABLE_GEOLOCATION ?? "true",
        },
      },
});
