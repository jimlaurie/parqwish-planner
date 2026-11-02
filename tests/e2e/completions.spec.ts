// "Done on this trip" ticks (src/lib/completions.ts): one record per item,
// account and app. Without Cloud Sync this device's account is "local".
// The Plan and Prepare ticks write this account's Planner record; a tick
// from ParQwish Pal can only be taken off there; another household's tick
// shows as a note and never ticks this household's box; old ticks carry over.
import { test, expect, type Page } from "@playwright/test";
import { seedTrip, fakeParkData, atParkTime, rows, SEED, TRIP_ID } from "./helpers";

type Completion = { id: string; authorUid: string; source: string; kind: string; itemId: string };
type Selection = { wishId?: string; itemId?: string; completed: boolean; status?: string };

const NOW = 1_792_000_000_000;
const tick = (page: Page, title: string) => page.getByRole("checkbox", { name: `Mark "${title}"` });
const wishCard = (page: Page, title: string) =>
  page.locator("div").filter({ has: tick(page, title) }).last();

function record(itemId: string, authorUid: string, source: "pal" | "planner", extra: Record<string, unknown> = {}) {
  const kind = (extra.kind as string) ?? "wish";
  return {
    id: `${kind}__${itemId}__${authorUid}__${source}`, tripId: TRIP_ID, kind, itemId, authorUid, source,
    completedAt: "2026-10-15T17:00:00.000Z", updatedAt: NOW, ...extra,
  };
}

/** The test trip with a packing item on it, for Prepare. */
const WITH_PACKING = {
  ...SEED,
  packingItems: [{ id: "p_poncho", type: "outfit", name: "Rain poncho", category: "Outerwear", priority: "C", userId: "user_primary", createdAt: NOW, updatedAt: NOW }],
  tripPackingSelections: [{ id: `${TRIP_ID}__p_poncho`, tripId: TRIP_ID, itemId: "p_poncho", completed: false, addedAt: NOW, updatedAt: NOW, userId: "user_primary" }],
};

test.beforeEach(async ({ page }) => {
  await atParkTime(page);
  await fakeParkData(page);
});

test("Ticking a wish on Plan saves this household's record; unticking takes it off", async ({ page }) => {
  await seedTrip(page, { ...SEED, completions: [] });
  await page.goto("/plan");
  await tick(page, "Space Mountain").click();
  await expect(tick(page, "Space Mountain")).toHaveAttribute("aria-checked", "true");
  expect((await rows<Completion>(page, "completions")).map((c) => c.id)).toEqual(["wish__w_space__local__planner"]);
  const sel = (await rows<Selection>(page, "tripWishSelections")).find((s) => s.wishId === "w_space");
  expect(sel).toMatchObject({ completed: true, status: "completed" });

  await tick(page, "Space Mountain").click();
  await expect(tick(page, "Space Mountain")).toHaveAttribute("aria-checked", "false");
  expect(await rows(page, "completions")).toEqual([]);
});

test("Old ticks carry over as this household's records", async ({ page }) => {
  const ticked = SEED.tripWishSelections.map((s) => (s.wishId === "w_space" ? { ...s, completed: true, status: "completed" } : s));
  await seedTrip(page, { ...SEED, tripWishSelections: ticked, completions: [] });
  // seedTrip's first, empty load already ran the carry-over; an update finds the trip there on its first load
  await page.evaluate(() => {
    localStorage.removeItem("parqwish:tickCarryOver:v1");
    localStorage.removeItem("parqwish:completions:migrated:local");
  });
  await page.goto("/plan");
  await expect(tick(page, "Space Mountain")).toHaveAttribute("aria-checked", "true");
  await expect.poll(async () => (await rows<Completion>(page, "completions")).map((c) => c.id)).toEqual(["wish__w_space__local__planner"]);
  await expect(tick(page, "The Dapper Dans")).toHaveAttribute("aria-checked", "false");
});

test("A tick from ParQwish Pal stays: the Planner says to untick it there", async ({ page }) => {
  const ticked = SEED.tripWishSelections.map((s) => (s.wishId === "w_space" ? { ...s, completed: true, status: "completed" } : s));
  await seedTrip(page, { ...SEED, tripWishSelections: ticked, completions: [record("w_space", "local", "pal", { dates: ["2026-10-15"] })] });
  await page.goto("/plan");
  await expect(tick(page, "Space Mountain")).toHaveAttribute("aria-checked", "true");
  await tick(page, "Space Mountain").click();
  await expect(page.getByRole("status")).toContainText("Ticked in ParQwish Pal on Thu, Oct 15. Untick it there.");
  await expect(tick(page, "Space Mountain")).toHaveAttribute("aria-checked", "true");
  expect((await rows<Completion>(page, "completions")).map((c) => c.id)).toEqual(["wish__w_space__local__pal"]);
});

test("Another household's tick shows as a note and doesn't tick your box", async ({ page }) => {
  const members = { smiths: { role: "editor", joinedAt: "2026-10-01T00:00:00.000Z", displayName: "The Smiths" } };
  const trips = SEED.trips.map((t) => ({ ...t, members }));
  await seedTrip(page, { ...SEED, trips, completions: [
    record("w_space", "smiths", "planner"),
    record("w_dapper", "gone", "pal"), // someone no longer on the trip: not shown
  ] });
  await page.goto("/plan");
  await expect(wishCard(page, "Space Mountain").getByLabel("Done by The Smiths")).toBeVisible();
  await expect(tick(page, "Space Mountain")).toHaveAttribute("aria-checked", "false");
  await expect(wishCard(page, "The Dapper Dans").getByText(/✓/)).toHaveCount(0);

  // Ticking it is this household's own record, alongside theirs
  await tick(page, "Space Mountain").click();
  await expect(tick(page, "Space Mountain")).toHaveAttribute("aria-checked", "true");
  expect((await rows<Completion>(page, "completions")).map((c) => c.id).sort())
    .toEqual(["wish__w_dapper__gone__pal", "wish__w_space__local__planner", "wish__w_space__smiths__planner"]);
});

test("Packed on Prepare is this household's record too", async ({ page }) => {
  await seedTrip(page, { ...WITH_PACKING, completions: [] });
  await page.goto("/prepare");
  await tick(page, "Rain poncho").click();
  await expect(tick(page, "Rain poncho")).toHaveAttribute("aria-checked", "true");
  expect((await rows<Completion>(page, "completions")).map((c) => c.id)).toEqual(["packing__p_poncho__local__planner"]);
  expect((await rows<Selection>(page, "tripPackingSelections"))[0].completed).toBe(true);
});
