import { defineConfig, devices } from "@playwright/test";

const PORT = 3300;
const baseURL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["html", { open: "never" }], ["github"]] : [["list"]],
  use: {
    baseURL,
    trace: "retain-on-failure",
    launchOptions: { args: ["--autoplay-policy=no-user-gesture-required"] },
  },
  webServer: {
    command: "node scripts/start-standalone.mjs",
    url: `${baseURL}/api/health`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      PORT: String(PORT),
      TTS_DRIVER: "fake",
      STORAGE_DRIVER: "local",
      LOCAL_STORAGE_DIR: ".data/e2e-storage",
      CONTENT_INCLUDE_UNREVIEWED: "true",
      NEXT_PUBLIC_APP_URL: baseURL,
      LOG_LEVEL: "warn",
    },
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["iPhone 14"], browserName: "chromium" } },
  ],
});
