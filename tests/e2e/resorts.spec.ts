// Other resorts (NEXT_PUBLIC_RESORTS, the beta; dland-wishes
// docs/multi-park-architecture.md §7a): Edit Trip's Resorts picker, the
// header naming a trip's resorts, and the Plan page's Park Catalog showing
// the trip's resorts: another resort's items read from its own files with
// hidden ones left out, its paid line's name, + Plan for a resort the trip
// visits, and a failed load said as such. Skipped against a dev server
// started without the flag.
import { test, expect, type Page } from "@playwright/test";
import { seedTrip, fakeParkData, atParkTime, rows, SEED } from "./helpers";

const KNOTTS = /storage\.googleapis\.com\/.*\/data\/resorts\/knotts\/([\w-]+)\.json/;

const files: Record<string, unknown> = {
  rides: {
    knotts: {
      "ghostrider": { name: "GhostRider", land: "Ghost Town", heightRequirement: 48, hasLL: true, status: "operating", themeparksWikiId: "w1" },
      "chilling-chambers": { name: "Chilling Chambers", land: "", hidden: true, status: "operating" },
    },
    knotts_soak_city: { "pacific-spin": { name: "Pacific Spin", land: "", status: "closed" } },
    lastUpdated: "2026-11-26T00:00:00Z",
  },
  shows: { knotts: {}, lastUpdated: "2026-11-26T00:00:00Z" },
  restaurants: { knotts: { "mrs-knotts": { name: "Mrs. Knott's Chicken Dinner Restaurant", land: "Marketplace", type: "Table Service" } } },
  shops: { knotts: {} },
  places: { knotts: {} },
  waitTimeStats: { generatedAt: "2026-11-26T12:00:00Z", rides: { "knotts__ghostrider": { weekday: { medianWaitMinutes: 35 }, weekend: { medianWaitMinutes: 45 } } } },
  rideReliabilityStats: { generatedAt: "2026-11-26T12:00:00Z", rides: {} },
};

/** Narrow layouts hide the results behind "Show results"; the wide panel always shows them. */
async function showResults(page: Page) {
  const toggle = page.getByRole("button", { name: /Show results/ });
  if (await toggle.isVisible()) await toggle.click();
}

/** The test trip visiting these resorts (none: Disneyland Resort only, as every trip before multi-park). */
const seedWithResorts = (page: Page, resortIds?: string[]) =>
  seedTrip(page, { ...SEED, trips: [{ ...SEED.trips[0], ...(resortIds ? { resortIds } : {}) }] });

async function openPlan(page: Page, knotts: "ok" | "down" = "ok") {
  await atParkTime(page);
  await fakeParkData(page);
  // Registered after fakeParkData, so these answer first
  await page.route(KNOTTS, (route) => {
    const name = route.request().url().match(KNOTTS)?.[1] ?? "";
    if (knotts === "down" || !(name in files)) return route.abort("failed");
    return route.fulfill({ contentType: "application/json", body: JSON.stringify(files[name]) });
  });
  await seedWithResorts(page, ["disneyland_resort", "knotts"]);
  await page.goto("/plan");
  const switcher = page.getByRole("group", { name: "Resort" });
  await expect(page.getByRole("tab", { name: /Rides/ })).toBeVisible();
  test.skip(!(await switcher.isVisible()), "dev server started without NEXT_PUBLIC_RESORTS=1");
  return switcher;
}

test.afterEach(async ({ page }) => {
  // The switcher remembers the resort; don't leave it on Knott's for the other checks
  await page.evaluate(() => localStorage.removeItem("parqwish_catalog_resort")).catch(() => {});
});

test("A trip visiting Knott's: the Park Catalog offers its resorts, Knott's items with Fast Lane, + Plan adds one", async ({ page }) => {
  const switcher = await openPlan(page);
  await expect(switcher.getByRole("button")).toHaveText(["Disneyland Resort", /Knott's Berry Farm/]); // not Universal
  await switcher.getByRole("button", { name: /Knott's Berry Farm/ }).click();
  await expect(page.getByText(/Knott's Berry Farm is planned here in the Planner/)).toBeVisible();

  await showResults(page);
  const ghost = page.getByRole("button", { name: /GhostRider/ });
  await expect(ghost).toBeVisible();
  await expect(ghost.getByText("⚡ Fast Lane")).toBeVisible();
  await expect(ghost.getByText("~40 min typical")).toBeVisible();
  await expect(page.getByText("Pacific Spin")).toBeVisible();
  await expect(page.getByText("Chilling Chambers")).toHaveCount(0);
  // Only Knott's parks' groups (Space Mountain is in the seeded trip's wishes, so check the groups)
  await expect(page.getByRole("heading", { name: /^Knott's Berry Farm ·/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: /^Disneyland ·/ })).toHaveCount(0);

  await ghost.getByRole("button", { name: "+ Plan" }).click();
  await expect(ghost.getByText("✓ In Plan")).toBeVisible();
  const added = (await rows<{ title: string; parkDataId?: string; park?: string; land?: string }>(page, "wishes")).find((w) => w.title === "GhostRider");
  expect(added).toMatchObject({ parkDataId: "knotts__ghostrider", park: "Knott's Berry Farm", land: "Ghost Town" });

  // Remembered on the next visit, and Disneyland Resort comes back with + Plan
  await page.reload();
  await expect(page.getByRole("group", { name: "Resort" }).getByRole("button", { name: /Knott's/ })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("group", { name: "Resort" }).getByRole("button", { name: "Disneyland Resort" }).click();
  await showResults(page);
  await expect(page.getByText("Space Mountain").first()).toBeVisible();
  await expect(page.getByRole("button", { name: "+ Plan" }).first()).toBeVisible();
});

test("A resort whose files can't be read says so, rather than looking empty", async ({ page }) => {
  const switcher = await openPlan(page, "down");
  await switcher.getByRole("button", { name: /Knott's Berry Farm/ }).click();
  await showResults(page);
  await expect(page.getByText("Knott's Berry Farm’s catalog couldn’t be loaded", { exact: false })).toBeVisible();
});

test("Edit Trip › Resorts: choose Knott's too, the header names both, and at least one stays", async ({ page }) => {
  await atParkTime(page);
  await fakeParkData(page);
  await seedWithResorts(page);
  await page.goto("/plan");
  await expect(page.getByRole("tab", { name: /Rides/ })).toBeVisible();
  await expect(page.getByRole("group", { name: "Resort" })).toHaveCount(0); // a Disneyland-only trip: no switcher

  await page.goto("/trip?id=trip_test");
  const picker = page.getByRole("group", { name: "Resorts" });
  await expect(page.getByRole("heading", { name: /Edit Trip/ })).toBeVisible();
  test.skip(!(await picker.isVisible()), "dev server started without NEXT_PUBLIC_RESORTS=1");
  await expect(picker.getByRole("button", { name: /Disneyland Resort/ })).toBeDisabled(); // the only one chosen
  await picker.getByRole("button", { name: /Knott's Berry Farm/ }).click();
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect.poll(async () => (await rows<{ resortIds?: string[] }>(page, "trips"))[0]?.resortIds).toEqual(["disneyland_resort", "knotts"]);
  await expect(page.getByText("Disneyland Resort · Knott's Berry Farm").first()).toBeVisible();

  // Knott's alone; Disneyland Resort alone again is saved as no field, as before
  await page.goto("/trip?id=trip_test");
  await page.getByRole("group", { name: "Resorts" }).getByRole("button", { name: /Disneyland Resort/ }).click();
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect.poll(async () => (await rows<{ resortIds?: string[] }>(page, "trips"))[0]?.resortIds).toEqual(["knotts"]);
  await page.goto("/trip?id=trip_test");
  const again = page.getByRole("group", { name: "Resorts" });
  await again.getByRole("button", { name: /Disneyland Resort/ }).click();
  await again.getByRole("button", { name: /Knott's Berry Farm/ }).click();
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect.poll(async () => "resortIds" in ((await rows<Record<string, unknown>>(page, "trips"))[0] ?? {})).toBe(false);
});

test("Preview: a day picks Knott's, and its Available Items, Add to Day catalog and hours follow", async ({ page }) => {
  const NOW = 1_792_000_000_000;
  await atParkTime(page);
  await fakeParkData(page);
  await page.route(KNOTTS, (route) => {
    const name = route.request().url().match(KNOTTS)?.[1] ?? "";
    return name in files ? route.fulfill({ contentType: "application/json", body: JSON.stringify(files[name]) }) : route.abort("failed");
  });
  await page.route(/storage\.googleapis\.com\/.*\/data\/resorts\/knotts\/hours\/2026-10-15\.json/, (route) => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({ date: "2026-10-15", knotts: { openingTime: "2026-10-15T10:00:00-07:00", closingTime: "2026-10-15T22:00:00-07:00", specialHours: [] }, knotts_soak_city: null }),
  }));
  const ghost = { id: "w_ghost", title: "GhostRider", tags: ["rides"], priority: "B", parkDataId: "knotts__ghostrider", parkDataName: "GhostRider", park: "Knott's Berry Farm", land: "Ghost Town", createdAt: NOW, updatedAt: NOW, userId: "user_primary" };
  await seedTrip(page, {
    ...SEED,
    trips: [{ ...SEED.trips[0], resortIds: ["disneyland_resort", "knotts"] }],
    wishes: [...SEED.wishes, ghost],
    tripWishSelections: [...SEED.tripWishSelections, { id: "trip_test__w_ghost", tripId: "trip_test", wishId: "w_ghost", completed: false, status: "planned", addedAt: NOW, updatedAt: NOW, userId: "user_primary" }],
  });
  await page.goto("/preview");
  await page.getByRole("button", { name: /10\/15/ }).click();
  const picker = page.getByRole("group", { name: "This day's resort" });
  await expect(page.getByTestId("pool-item").first()).toBeVisible();
  test.skip(!(await picker.isVisible()), "dev server started without NEXT_PUBLIC_RESORTS=1");

  // A Disneyland day: Disneyland's items, its hours and weather; Knott's ride waits for a Knott's day
  await expect(picker.getByRole("button", { name: "Disneyland" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("pool-item").filter({ hasText: "The Dapper Dans" })).toBeVisible();
  await expect(page.getByTestId("pool-item").filter({ hasText: "GhostRider" })).toHaveCount(0);
  await expect(page.getByRole("note", { name: "Park hours" })).toContainText("Disneyland");

  await picker.getByRole("button", { name: "Knott's" }).click();
  await expect.poll(async () => (await rows<{ dayResorts?: Record<string, string> }>(page, "trips"))[0]?.dayResorts).toEqual({ "2026-10-15": "knotts" });
  await expect(page.getByRole("button", { name: /10\/15/ }).getByTestId("day-resort")).toHaveText("Knott's");
  await expect(page.getByRole("button", { name: /10\/16/ }).getByTestId("day-resort")).toHaveText("Disneyland");
  await expect(page.getByTestId("pool-item").filter({ hasText: "GhostRider" })).toBeVisible();
  await expect(page.getByTestId("pool-item").filter({ hasText: "The Dapper Dans" })).toHaveCount(0);
  const hours = page.getByRole("note", { name: "Park hours" });
  await expect(hours).toContainText("Knott's Berry Farm 10 AM – 10 PM");
  await expect(hours).not.toContainText("California Adventure");
  await expect(page.getByRole("note", { name: "Weather" })).toHaveCount(0);

  // Add to Day's Park catalog offers Knott's, without Disneyland's pin-a-place map
  await expect(page.getByText(/A map of Knott's Berry Farm comes in a later version/)).toBeVisible();
  await page.getByRole("button", { name: "+ Add", exact: true }).first().click();
  await page.getByRole("group", { name: "Add from" }).getByRole("button", { name: "Park catalog" }).click();
  await expect(page.getByText("GhostRider").last()).toBeVisible();
  await expect(page.getByText("Matterhorn Bobsleds")).toHaveCount(0); // a Disneyland ride in the catalog fixture
  await page.getByRole("tab", { name: /Places/ }).last().click();
  await expect(page.getByRole("button", { name: /Pin a new place/ })).toHaveCount(0);
  await page.getByRole("button", { name: "Cancel", exact: true }).click();

  // Back to Disneyland: the trip's first resort is the default, so the pick is no field at all
  await picker.getByRole("button", { name: "Disneyland" }).click();
  await expect.poll(async () => "dayResorts" in ((await rows<Record<string, unknown>>(page, "trips"))[0] ?? {})).toBe(false);
});
