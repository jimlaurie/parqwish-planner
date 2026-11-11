// Keeping the Planner's data (src/lib/storage-safety.ts): Safari can clear a
// site's IndexedDB after 7 days without a visit unless it's installed, so a
// Safari tab with trips and no Cloud Sync is told so, on Play and in the
// banner, with how to install it. Other browsers are asked to keep the data
// (persist()), silently except Firefox, which asks the person, so there it
// waits for a button. The browser's answers are faked; Safari's 7-day clock
// itself can't be tested here.
import { test, expect, type Page } from "@playwright/test";
import { seedTrip } from "./helpers";

const MAC_SAFARI = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15";
const FIREFOX = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:132.0) Gecko/20100101 Firefox/132.0";

/** Replaces navigator.storage's persist answers; counts persist() calls in window.__persistCalls. */
async function fakePersist(page: Page, grants: boolean): Promise<void> {
  await page.addInitScript((grant) => {
    let kept = false;
    const w = window as unknown as { __persistCalls: number };
    w.__persistCalls = 0;
    const real = navigator.storage;
    Object.defineProperty(navigator, "storage", {
      configurable: true,
      value: {
        persisted: async () => kept,
        persist: async () => { w.__persistCalls += 1; kept = grant; return grant; },
        estimate: () => real.estimate(),
        getDirectory: () => real.getDirectory(),
      },
    });
  }, grants);
}

const persistCalls = (page: Page) => page.evaluate(() => (window as unknown as { __persistCalls: number }).__persistCalls);
const status = (page: Page) => page.getByTestId("storage-status");

test.describe("in Safari on a Mac", () => {
  test.use({ userAgent: MAC_SAFARI });

  test("a tab with trips and no Cloud Sync is told Safari may clear it, and how to keep it", async ({ page }) => {
    await fakePersist(page, false);
    await seedTrip(page);
    const banner = page.getByRole("region", { name: "Keep your Planner data" });
    await expect(banner).toContainText("Safari can clear the Planner’s data after 7 days without a visit");
    await expect(banner).toContainText("In Safari, choose File › Add to Dock.");
    await expect(banner.getByRole("link", { name: "turn on Cloud Sync" })).toHaveAttribute("href", "/play");

    await page.goto("/play");
    await expect(status(page)).toHaveAttribute("data-kind", "at-risk");
    await expect(status(page)).toContainText("Install the Planner or turn on Cloud Sync to keep it.");
    await expect(status(page)).toContainText("To install: In Safari, choose File › Add to Dock.");

    // "Later" hides the banner for good; Play still says it
    await page.getByRole("region", { name: "Keep your Planner data" }).getByRole("button", { name: "Later" }).click();
    await expect(page.getByRole("region", { name: "Keep your Planner data" })).toBeHidden();
    await page.reload();
    await expect(status(page)).toHaveAttribute("data-kind", "at-risk");
    await expect(page.getByRole("region", { name: "Keep your Planner data" })).toBeHidden();
  });

  test("with nothing saved yet there's no warning", async ({ page }) => {
    await fakePersist(page, false);
    await seedTrip(page, { trips: [], wishes: [], packingItems: [] });
    await page.goto("/play");
    await expect(status(page)).toHaveAttribute("data-kind", "empty");
    await expect(page.getByRole("region", { name: "Keep your Planner data" })).toBeHidden();
  });
});

test("Chrome is asked to keep the data once there's a trip, and Play says it's kept", async ({ page }) => {
  await fakePersist(page, true);
  await seedTrip(page);
  await page.goto("/play");
  await expect(status(page)).toHaveAttribute("data-kind", "persisted");
  await expect(status(page)).toContainText("this browser has agreed to keep the Planner's data");
  expect(await persistCalls(page)).toBe(1);
});

test.describe("in Firefox", () => {
  test.use({ userAgent: FIREFOX });

  test("the browser is asked only from Play's button, since Firefox shows a prompt", async ({ page }) => {
    await fakePersist(page, true);
    await seedTrip(page);
    await page.goto("/play");
    await expect(status(page)).toHaveAttribute("data-kind", "best-effort");
    expect(await persistCalls(page)).toBe(0);
    await status(page).getByRole("button", { name: "Ask this browser to keep it" }).click();
    await expect(status(page)).toHaveAttribute("data-kind", "persisted");
    expect(await persistCalls(page)).toBe(1);
  });
});
