import { loadEnvConfig } from "@next/env";
import { defineConfig, devices } from "@playwright/test";

loadEnvConfig(process.cwd());

const port = Number(process.env.NUVIO_E2E_PORT ?? "3100");
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  expect: { timeout: 15_000 },
  forbidOnly: Boolean(process.env.CI),
  fullyParallel: false,
  globalSetup: "./tests/e2e/release/global-setup.ts",
  globalTeardown: "./tests/e2e/release/global-teardown.ts",
  outputDir: "test-results/release-e2e-artifacts",
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report/release-e2e" }]],
  retries: process.env.CI ? 1 : 0,
  testDir: "./tests/e2e/release",
  testIgnore: ["**/global-setup.ts", "**/global-teardown.ts", "**/support/**"],
  timeout: 90_000,
  use: {
    ...devices["Desktop Chrome"],
    baseURL,
    channel: "chrome",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: "retain-on-failure",
  },
  webServer: {
    command: `npm run dev -- --hostname 127.0.0.1 --port ${port}`,
    env: {
      ...process.env,
      EMAIL_PROVIDER: "",
      EMAIL_WEBHOOK_URL: "",
      GOOGLE_MANUAL_MESSAGE_SPREADSHEET_ID: "",
      NUVIO_DISABLE_LOCAL_DEV_AUTH: "1",
      NUVIO_ENABLE_LOCAL_DEV_AUTH: "0",
      RESEND_API_KEY: "",
      SITE_URL: baseURL,
      SMS_AUTO_DELIVERY_ENABLED: "false",
    },
    reuseExistingServer: false,
    timeout: 180_000,
    url: baseURL,
  },
  workers: 1,
});
