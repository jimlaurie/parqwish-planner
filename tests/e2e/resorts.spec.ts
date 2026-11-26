// Other resorts in the Plan page's Park Catalog (NEXT_PUBLIC_RESORTS, the
// beta; dland-wishes docs/multi-park-architecture.md §7a): the resort
// switcher, another resort's items read from its own files with hidden ones
// left out, its paid line's name, browse-only rows, and a failed load said
// as such. Skipped against a dev server started without the flag.
import { test, expect, type Page } from "@playwright/test";
import { seedTrip, fakeParkData, atParkTime } from "./helpers";

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

async function openPlan(page: Page, knotts: "ok" | "down" = "ok") {
  await atParkTime(page);
  await fakeParkData(page);
  // Registered after fakeParkData, so these answer first
  await page.route(KNOTTS, (route) => {
    const name = route.request().url().match(KNOTTS)?.[1] ?? "";
    if (knotts === "down" || !(name in files)) return route.abort("failed");
    return route.fulfill({ contentType: "application/json", body: JSON.stringify(files[name]) });
  });
  await seedTrip(page);
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

test("The Park Catalog switches to Knott's: its own items, hidden ones left out, Fast Lane, browse only", async ({ page }) => {
  const switcher = await openPlan(page);
  await switcher.getByRole("button", { name: /Knott's Berry Farm/ }).click();
  await expect(page.getByText(/Preview: browse Knott/)).toBeVisible();

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
  await expect(page.getByRole("button", { name: "+ Plan" })).toHaveCount(0);

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
