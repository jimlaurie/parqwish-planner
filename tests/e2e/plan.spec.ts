// The Plan page's park catalog: dining links, the status filter, pinning a place, and the live-data fallback.
import { test, expect, type Page } from "@playwright/test";
import { seedTrip, fakeParkData, atParkTime } from "./helpers";

const SITE = "https://disneyland.disney.go.com";

async function openTab(page: Page, tab: string) {
  await page.goto("/plan");
  await page.getByRole("tab", { name: new RegExp(tab) }).click();
}

test.beforeEach(async ({ page }) => {
  await atParkTime(page);
});

test("Dining detail links to Disney's View, Menu and Reserve pages (live data)", async ({ page }) => {
  await fakeParkData(page);
  await seedTrip(page);
  await openTab(page, "Dining");
  await page.getByText("Blue Bayou Restaurant", { exact: true }).click();
  await expect(page.getByRole("link", { name: /View/ })).toHaveAttribute("href", `${SITE}/dining/disneyland/blue-bayou-restaurant/`);
  await expect(page.getByRole("link", { name: /Menu/ })).toHaveAttribute("href", `${SITE}/dining/disneyland/blue-bayou-restaurant/menus/`);
  // stored as a path; it must get Disney's host
  await expect(page.getByRole("link", { name: /Reserve/ })).toHaveAttribute("href", `${SITE}/dine-res/restaurant/blue-bayou-restaurant/`);
});

test("With Storage blocked it falls back to the deploy's copy (no links), not an empty catalog", async ({ page }) => {
  await fakeParkData(page, "blocked");
  await seedTrip(page);
  await openTab(page, "Dining");
  await page.getByText("Blue Bayou Restaurant", { exact: true }).click();
  await expect(page.getByText("Cajun & Creole")).toBeVisible();
  await expect(page.getByRole("link", { name: /Menu/ })).toHaveCount(0);
});

test("Status filter: untick Seasonal or Closed for a shorter list, on every tab", async ({ page }) => {
  await fakeParkData(page);
  await seedTrip(page);
  await openTab(page, "Dining");
  await expect(page.getByText("Harbour Galley")).toBeVisible();
  await page.getByRole("button", { name: /Seasonal \(1\)/ }).click();
  await expect(page.getByText("Harbour Galley")).toHaveCount(0);
  await page.getByRole("tab", { name: /Rides/ }).click();
  await page.getByRole("button", { name: /Closed \(1\)/ }).click();
  await expect(page.getByText("Matterhorn Bobsleds")).toHaveCount(0);
  await expect(page.getByText("Space Mountain").first()).toBeVisible();
});

test("Pin a new place on the map and add it to the plan", async ({ page }) => {
  await fakeParkData(page);
  await seedTrip(page);
  await openTab(page, "Places");
  await page.getByRole("button", { name: /Pin a new place on the map/ }).click();
  await page.getByLabel("New place name").fill("Our parade spot");
  const map = page.locator(".place-picker-map");
  await expect(map.locator(".leaflet-tile-pane")).toBeAttached();
  await map.click({ position: { x: 270, y: 110 } });
  await expect(page.getByText(/^📍 .+ · /)).toBeVisible();
  await page.getByRole("button", { name: /Add to plan/ }).click();
  await expect(page.getByRole("status").filter({ hasText: "Added" })).toContainText("Added “Our parade spot” to your plan.");
  await expect(page.getByText("Our parade spot").first()).toBeVisible();
});
