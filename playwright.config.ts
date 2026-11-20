// Headless checks (npm run check): Playwright driving the installed Chrome
// against the dev server, with a seeded test trip and faked park data
// (tests/e2e/helpers.ts), so results don't change with each day's data.
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  // One at a time: they share the dev server, which compiles pages on first visit
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:3000",
    channel: "chrome", // the installed Chrome, so no browser download
    headless: true,
    viewport: { width: 1440, height: 1000 },
    timezoneId: "America/Los_Angeles",
    locale: "en-US",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 180_000,
  },
});
