// Home's New Trip menu, the Edit Trip page, and dates in park time.
import { test, expect } from "@playwright/test";
import { seedTrip, fakeParkData, atParkTime, TRIP_ID } from "./helpers";

test.beforeEach(async ({ page }) => {
  await fakeParkData(page);
});

test("Quick Trip makes today's trip, stays on Home, and Undo removes it", async ({ page }) => {
  await atParkTime(page);
  await seedTrip(page);
  await page.getByRole("button", { name: /New Trip$/ }).click();
  await page.getByRole("menuitem", { name: /Quick Trip/ }).click();
  await expect(page.getByText("Created “New Trip – Oct 15”")).toBeVisible();
  await expect(page).toHaveURL(/\/$/);
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(page.getByText("New Trip – Oct 15")).toHaveCount(0);
});

test("Edit Trip: a hotel booked for the trip's dates follows when they change", async ({ page }) => {
  await seedTrip(page);
  await page.goto(`/trip?id=${TRIP_ID}`);
  const dates = page.locator("#general input[type=date]");
  await dates.nth(0).fill("2026-10-20");
  await dates.nth(1).fill("2026-10-23");
  const hotel = page.locator("#hotels input[type=date]");
  await expect(hotel.nth(0)).toHaveValue("2026-10-20");
  await expect(hotel.nth(1)).toHaveValue("2026-10-23");
});

test("At 6:30 PM Pacific a trip ending today is still a future trip (UTC is already tomorrow)", async ({ page }) => {
  await atParkTime(page, new Date("2026-10-17T18:30:00-07:00"));
  await seedTrip(page);
  await expect(page.getByText("Test Trip").first()).toBeVisible();
  await expect(page.getByText(/^Recent Trips$/i)).toHaveCount(0);
});

test("The timeline's now marker stays on today in the evening", async ({ page }) => {
  await atParkTime(page, new Date("2026-10-15T18:40:00-07:00"));
  await seedTrip(page);
  await page.goto("/preview");
  await page.getByRole("button", { name: /10\/15/ }).click();
  await expect(page.getByTestId("slot-18:30").locator("..").getByTestId("now-marker")).toHaveCount(1);
});

test.describe("east of UTC", () => {
  test.use({ timezoneId: "Europe/Berlin" });
  test("Preview's day tabs are the trip's own dates", async ({ page }) => {
    await seedTrip(page);
    await page.goto("/preview");
    for (const d of ["10/14", "10/15", "10/16", "10/17"]) await expect(page.getByRole("button", { name: new RegExp(d) })).toBeVisible();
    await expect(page.getByRole("button", { name: /10\/13|10\/18/ })).toHaveCount(0);
  });
});
