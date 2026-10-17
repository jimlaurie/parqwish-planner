// Preview: showtimes when placing a show, and park hours under the date bar.
import { test, expect, type Page } from "@playwright/test";
import { seedTrip, fakeParkData, atParkTime, drag, dayItems } from "./helpers";

async function openDay(page: Page, day: string) {
  await page.goto("/preview");
  await page.getByRole("button", { name: new RegExp(day) }).click();
}

async function dropShowOn(page: Page, slot: string) {
  const card = page.getByTestId("pool-item").filter({ hasText: "The Dapper Dans" });
  const target = page.getByTestId(`slot-${slot}`);
  await target.scrollIntoViewIfNeeded();
  const a = (await card.boundingBox())!;
  const b = (await target.boundingBox())!;
  await drag(page, { x: a.x + 30, y: a.y + a.height / 2 }, { x: b.x + b.width / 2, y: b.y + b.height / 2 });
}

test.beforeEach(async ({ page }) => {
  await atParkTime(page);
  await fakeParkData(page);
  await seedTrip(page);
});

test("A show dropped on 1:00 PM takes its 1:10 showtime and length (the day's own times)", async ({ page }) => {
  await openDay(page, "10/15");
  await dropShowOn(page, "13:00");
  await expect.poll(async () => (await dayItems(page)).find((i) => i.title === "The Dapper Dans")).toMatchObject({ date: "2026-10-15", scheduledTime: "13:10", durationMinutes: 20 });
});

test("On a later Friday it uses the latest Friday's showtimes from the history", async ({ page }) => {
  await openDay(page, "10/16");
  await dropShowOn(page, "14:00");
  await expect.poll(async () => (await dayItems(page)).find((i) => i.title === "The Dapper Dans")?.scheduledTime).toBe("14:20");
});

test("Park hours: both parks, and a ticketed event", async ({ page }) => {
  await openDay(page, "10/15");
  const hours = page.getByRole("note", { name: "Park hours" });
  await expect(hours).toContainText("Disneyland 8 AM – 12 AM");
  await expect(hours).toContainText("California Adventure 8 AM – 10 PM");
  await page.getByRole("button", { name: /10\/16/ }).click();
  await expect(hours).toContainText("Special Ticketed Event 6 PM – 11 PM");
});

test("Park hours not posted yet say so", async ({ page }) => {
  await openDay(page, "10/17");
  await expect(page.getByText(/aren.t posted yet/)).toBeVisible();
});

test.describe("when Storage can't be reached", () => {
  test.beforeEach(async ({ page }) => {
    await page.unrouteAll({ behavior: "ignoreErrors" });
    await fakeParkData(page, "blocked");
  });
  test("park hours say they couldn't be loaded (not 'not posted')", async ({ page }) => {
    await openDay(page, "10/15");
    await expect(page.getByText(/couldn.t be loaded/)).toBeVisible();
    await expect(page.getByText(/aren.t posted yet/)).toHaveCount(0);
  });
});
