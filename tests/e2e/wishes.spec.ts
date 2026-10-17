// Wishes on the Plan page: add a custom wish, edit it, remove it from the
// trip (with Undo), and delete it everywhere.
import { test, expect, type Page } from "@playwright/test";
import { seedTrip, fakeParkData, atParkTime, rows } from "./helpers";

type Wish = { id: string; title: string; userId?: string; deletedAt?: number };
type Selection = { wishId: string; tripId: string; deletedAt?: number };

const wishCard = (page: Page, title: string) => page.getByRole("heading", { name: title, exact: true });

/** Wishes still live in the database (soft-deleted ones left out). */
const liveWishes = async (page: Page) => (await rows<Wish>(page, "wishes")).filter((w) => !w.deletedAt);

async function openWish(page: Page, title: string) {
  await wishCard(page, title).click();
  await expect(page.getByRole("dialog", { name: "Edit Wish" })).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await atParkTime(page);
  await fakeParkData(page);
  await seedTrip(page);
  await page.goto("/plan");
  await expect(wishCard(page, "Space Mountain")).toBeVisible();
});

test("+ Custom wish adds a wish for the active person, and editing it saves", async ({ page }) => {
  await page.getByRole("button", { name: "+ Custom wish" }).click();
  const add = page.getByRole("dialog", { name: "Add Wish" });
  await add.getByPlaceholder(/Ride Space Mountain/).fill("Dole Whip");
  await add.getByRole("button", { name: "Save" }).click();
  await expect(add).toBeHidden();
  await expect(wishCard(page, "Dole Whip")).toBeVisible();
  const added = (await liveWishes(page)).find((w) => w.title === "Dole Whip");
  expect(added?.userId).toBe("user_primary");
  expect((await rows<Selection>(page, "tripWishSelections")).some((s) => s.wishId === added?.id && s.tripId === "trip_test")).toBe(true);

  await openWish(page, "Dole Whip");
  await page.getByRole("dialog").getByPlaceholder(/Ride Space Mountain/).fill("Dole Whip float");
  await page.getByRole("dialog").getByRole("button", { name: "Save" }).click();
  await expect(wishCard(page, "Dole Whip float")).toBeVisible();
  await expect(wishCard(page, "Dole Whip")).toHaveCount(0);
  expect((await liveWishes(page)).filter((w) => w.id === added?.id).map((w) => w.title)).toEqual(["Dole Whip float"]);
});

test("Remove from trip takes it off this trip only, and Undo puts it back", async ({ page }) => {
  await openWish(page, "The Dapper Dans");
  await page.getByRole("button", { name: "Remove from trip" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Removed" })).toContainText("Removed “The Dapper Dans” from this trip");
  await expect(wishCard(page, "The Dapper Dans")).toHaveCount(0);
  // still a saved wish, for other trips
  expect((await liveWishes(page)).some((w) => w.title === "The Dapper Dans")).toBe(true);

  await page.getByRole("button", { name: "Undo" }).click();
  await expect(wishCard(page, "The Dapper Dans")).toBeVisible();
});

test("Delete everywhere asks first, then the wish is gone from every trip", async ({ page }) => {
  await openWish(page, "The Dapper Dans");
  await page.getByRole("button", { name: "Delete everywhere" }).click();
  await expect(page.getByText("Delete from every trip?")).toBeVisible();
  await page.getByRole("button", { name: "Keep" }).click();
  await expect(page.getByRole("button", { name: "Delete everywhere" })).toBeVisible();

  await page.getByRole("button", { name: "Delete everywhere" }).click();
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Edit Wish" })).toBeHidden();
  await expect(wishCard(page, "The Dapper Dans")).toHaveCount(0);
  expect((await liveWishes(page)).some((w) => w.title === "The Dapper Dans")).toBe(false);
  await page.reload();
  await expect(wishCard(page, "Space Mountain")).toBeVisible();
  await expect(wishCard(page, "The Dapper Dans")).toHaveCount(0);
});
