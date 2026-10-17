// The travel group on the Plan page: adding a member, switching who's
// active (new wishes are theirs), filtering by person, and removing a
// member (everything of theirs goes to the primary user).
import { test, expect, type Page } from "@playwright/test";
import { seedTrip, fakeParkData, atParkTime, rows, SEED, TRIP_ID } from "./helpers";

type Wish = { title: string; userId?: string };

/** The test trip with a second member, Sam, who owns The Dapper Dans, a saved packing item and an ensemble. */
const WITH_SAM = {
  ...SEED,
  users: [...SEED.users, { id: "user_sam", name: "Sam", color: "#60A5FA", role: "guest", createdAt: 1, updatedAt: 1 }],
  wishes: SEED.wishes.map((w) => (w.id === "w_dapper" ? { ...w, userId: "user_sam", updatedAt: 1 } : w)),
  tripWishSelections: SEED.tripWishSelections.map((s) => (s.wishId === "w_dapper" ? { ...s, userId: "user_sam" } : s)),
  packingItems: [{ id: "p_poncho", type: "equipment", name: "Rain poncho", category: "Rain Gear", priority: "C", userId: "user_sam", createdAt: 1, updatedAt: 1 }],
  ensembles: [{ id: "e_sam", name: "Sam's park look", itemIds: [], userId: "user_sam", createdAt: 1, updatedAt: 1 }],
};

const heading = (page: Page, title: string) => page.getByRole("heading", { name: title, exact: true });
/** A wish card on Plan: the innermost block holding its tick box (and its owner badges). */
const wishCard = (page: Page, title: string) =>
  page.locator("div").filter({ has: page.getByRole("checkbox", { name: `Mark "${title}"` }) }).last();
const group = (page: Page) => page.getByRole("button", { name: "Group section" }).locator("..");

async function addCustomWish(page: Page, title: string) {
  await page.getByRole("button", { name: "+ Custom wish" }).click();
  const dialog = page.getByRole("dialog", { name: "Add Wish" });
  await dialog.getByPlaceholder(/Ride Space Mountain/).fill(title);
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(heading(page, title)).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await atParkTime(page);
  await fakeParkData(page);
});

test("Add a member, make them active, and a new wish is theirs", async ({ page }) => {
  await seedTrip(page);
  await page.goto("/plan");
  await group(page).getByRole("button", { name: "+ Add Group Member" }).click();
  await group(page).getByPlaceholder("Name").fill("Jordan");
  await group(page).getByRole("button", { name: "Add", exact: true }).click();
  await expect(page.getByText("Group (2)")).toBeVisible();

  await group(page).getByRole("button", { name: "Switch to Jordan" }).click();
  await expect(page.getByRole("button", { name: "Active user: Jordan. Tap to switch." })).toBeVisible();
  await addCustomWish(page, "Churro");
  await expect(wishCard(page, "Churro").getByTitle("Jordan")).toBeVisible();
  const jordan = (await rows<{ id: string; name: string }>(page, "users")).find((u) => u.name === "Jordan");
  expect((await rows<Wish>(page, "wishes")).find((w) => w.title === "Churro")?.userId).toBe(jordan?.id);

  // and back to Alex from the chip at the top
  await page.getByRole("button", { name: "Active user: Jordan. Tap to switch." }).click();
  await page.getByRole("button", { name: "Alex", exact: true }).click();
  await addCustomWish(page, "Mickey pretzel");
  expect((await rows<Wish>(page, "wishes")).find((w) => w.title === "Mickey pretzel")?.userId).toBe("user_primary");
});

test("Clicking a person shows only their wishes; Show All Users clears it", async ({ page }) => {
  await seedTrip(page, WITH_SAM);
  await page.goto("/plan");
  await expect(wishCard(page, "The Dapper Dans").getByTitle("Sam")).toBeVisible();
  await group(page).getByText("Sam", { exact: true }).click();
  await expect(heading(page, "The Dapper Dans")).toBeVisible();
  await expect(heading(page, "Space Mountain")).toHaveCount(0);

  await page.getByRole("button", { name: "✦ Show All Users" }).click();
  await expect(heading(page, "Space Mountain")).toBeVisible();
  await expect(heading(page, "The Dapper Dans")).toBeVisible();
});

test("Removing a member asks first, then their wishes go to the primary user", async ({ page }) => {
  await seedTrip(page, WITH_SAM);
  await page.goto("/plan");
  await group(page).getByRole("button", { name: "Remove Sam" }).click();
  await expect(page.getByRole("heading", { name: "Remove Sam?" })).toBeVisible();
  await page.getByRole("button", { name: "Remove", exact: true }).click();
  await expect(page.getByText("Group (1)")).toBeVisible();
  // one person left, so cards drop their owner badges
  await expect(heading(page, "The Dapper Dans")).toBeVisible();
  await expect(wishCard(page, "The Dapper Dans").getByTitle("Sam")).toHaveCount(0);
  expect((await rows<{ wishId: string; tripId: string; userId?: string }>(page, "tripWishSelections"))
    .find((s) => s.wishId === "w_dapper" && s.tripId === TRIP_ID)?.userId).toBe("user_primary");
  // and what Sam created, so the Catalog doesn't show it with no owner
  for (const store of ["wishes", "packingItems", "ensembles"]) {
    const owned = await rows<{ userId?: string; updatedAt: number }>(page, store);
    expect(owned.map((r) => r.userId), store).not.toContain("user_sam");
    expect(owned.every((r) => r.updatedAt > 1), `${store} updatedAt bumped for Cloud Sync`).toBe(true);
  }
});
