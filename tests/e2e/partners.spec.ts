// Partner branding: a /with/<id> link remembers the partner on this device,
// and its published file (data/partners/<id>.json) shows as a band, a card
// and an info popup only within its dates. A missing file means no partner;
// an unreachable one falls back to the copy cached here, still date-checked.
// The clock is Thu 15 Oct 2026 (helpers.ts PARK_MORNING).
import { test, expect, type Page } from "@playwright/test";
import { seedTrip, atParkTime, rows, SEED } from "./helpers";

const BRANDING = {
  id: "sample-hotel",
  name: "Sample Hotel",
  tagline: "Near the parks",
  colors: { band: "#123456", bandText: "#FFFFFF", accentLight: "#123456", accentDark: "#9FC5E8" },
  website: "https://example.com/",
  contact: { label: "Front desk", phone: "555-0100" },
  services: [{ icon: "🏊", title: "Pool", detail: "Heated" }],
  resortIds: ["disneyland_resort"],
  stay: { name: "Sample Hotel", address: "1 Example St", notes: "Walk to the parks" },
  startsAt: "2026-10-01",
  endsAt: "2026-10-31",
  publishedAt: "2026-09-30T12:00:00.000Z",
};

type FileMode = { status: 200; body: object } | { status: 403 } | { status: "unreachable" };

/** Serves the partner file the way Storage does: the JSON, a 403 when there's none, or no answer. */
async function servePartnerFile(page: Page, mode: FileMode): Promise<void> {
  await page.route(/storage\.googleapis\.com\/.*\/data\/partners\/[\w-]+\.json/, (route) => {
    if (mode.status === "unreachable") return route.abort("failed");
    if (mode.status === 403) return route.fulfill({ status: 403, body: "AccessDenied" });
    return route.fulfill({ contentType: "application/json", body: JSON.stringify(mode.body) });
  });
}

const band = (page: Page) => page.getByTestId("partner-band");
/** Waits for the partner file's answer, so "nothing shows" isn't checked before it arrived. */
const partnerFileAnswered = (page: Page) => page.waitForEvent("requestfinished", { predicate: (r) => r.url().includes("/data/partners/") }).catch(() => null);
const card = (page: Page) => page.getByTestId("partner-card");

test.beforeEach(async ({ page }) => {
  await atParkTime(page);
});

test("A partner link shows the band and card within the partner's dates, and is remembered", async ({ page }) => {
  await servePartnerFile(page, { status: 200, body: BRANDING });
  await seedTrip(page);
  await page.goto("/with?id=sample-hotel");
  await expect(page).toHaveURL(/\/$/);
  await expect(band(page)).toContainText("Sample Hotel");
  await expect(card(page)).toContainText("Near the parks");
  await page.reload();
  await expect(band(page)).toContainText("Sample Hotel");
});

test("With a logo, the sidebar card still shows the partner's name beside it", async ({ page }) => {
  const logoUrl = "https://example.com/logo.png";
  await page.route(logoUrl, (route) => route.fulfill({ contentType: "image/svg+xml", body: '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><rect width="40" height="40" fill="#123456"/></svg>' }));
  await servePartnerFile(page, { status: 200, body: { ...BRANDING, logoUrl } });
  await seedTrip(page);
  await page.goto("/with?id=sample-hotel");
  const name = card(page).getByTestId("partner-card-name");
  await expect(name.locator("img")).toHaveAttribute("src", logoUrl);
  await expect(name).toContainText("Sample Hotel");
});

test("The info popup lists the services and opens the website in a new tab", async ({ page }) => {
  await servePartnerFile(page, { status: 200, body: BRANDING });
  await seedTrip(page);
  await page.goto("/with?id=sample-hotel");
  await band(page).getByRole("button", { name: "Sample Hotel", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Sample Hotel" });
  await expect(dialog).toContainText("Pool");
  const website = dialog.getByRole("link", { name: /Visit their website/ });
  await expect(website).toHaveAttribute("href", "https://example.com/");
  await expect(website).toHaveAttribute("target", "_blank");
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
});

test("After its last day the partner disappears, even with the file still published", async ({ page }) => {
  await servePartnerFile(page, { status: 200, body: { ...BRANDING, endsAt: "2026-10-14" } });
  await seedTrip(page);
  const answered = partnerFileAnswered(page);
  await page.goto("/with?id=sample-hotel");
  await answered;
  await expect(page).toHaveURL(/\/$/);
  await expect(band(page)).toHaveCount(0);
  await expect(card(page)).toHaveCount(0);
});

test("No published file means the generic Planner, and the cached copy goes", async ({ page }) => {
  await servePartnerFile(page, { status: 200, body: BRANDING });
  await seedTrip(page);
  await page.goto("/with?id=sample-hotel");
  await expect(band(page)).toBeVisible();
  await page.unrouteAll({ behavior: "ignoreErrors" });
  await servePartnerFile(page, { status: 403 });
  const answered = page.waitForResponse((r) => r.url().includes("/data/partners/"));
  await page.reload();
  await answered;
  await expect(card(page)).toHaveCount(0);
  await expect(band(page)).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem("parqwish:partner:sample-hotel"))).toBeNull();
});

test("Offline, the cached copy shows until its last day", async ({ page }) => {
  await servePartnerFile(page, { status: 200, body: BRANDING });
  await seedTrip(page);
  await page.goto("/with?id=sample-hotel");
  await expect(band(page)).toBeVisible();
  await page.unrouteAll({ behavior: "ignoreErrors" });
  await servePartnerFile(page, { status: "unreachable" });
  await page.reload();
  await expect(band(page)).toContainText("Sample Hotel");
  await atParkTime(page, new Date("2026-11-01T10:00:00-07:00"));
  await page.reload();
  await expect(band(page)).toHaveCount(0);
});

test("Plan a stay here makes a trip with the partner's stay and opens its dates", async ({ page }) => {
  await servePartnerFile(page, { status: 200, body: BRANDING });
  await seedTrip(page);
  await page.goto("/with?id=sample-hotel");
  await card(page).getByRole("button", { name: "Plan a stay here" }).click();
  await expect(page).toHaveURL(/\/trip\?id=.+&dates=1/);
  const trips = await rows<{ name: string; hotels?: Array<{ name: string; checkIn: string; notes?: string }>; notes?: string }>(page, "trips");
  const stay = trips.find((t) => t.name === "Sample Hotel stay");
  expect(stay?.hotels?.[0]).toMatchObject({ name: "Sample Hotel", checkIn: "2026-10-15" });
  expect(stay?.hotels?.[0].notes).toContain("1 Example St");
  expect(stay?.notes).toContain("Walk to the parks");
});

test("× hides the partner on this device", async ({ page }) => {
  await servePartnerFile(page, { status: 200, body: BRANDING });
  await seedTrip(page);
  await page.goto("/with?id=sample-hotel");
  await band(page).getByRole("button", { name: "Stop showing Sample Hotel" }).click();
  await expect(band(page)).toHaveCount(0);
  await page.reload();
  await expect(card(page)).toHaveCount(0);
});

test("With a partner's card, the Home sidebar still fits the window and Recent Trips starts closed", async ({ page }) => {
  await servePartnerFile(page, { status: 200, body: BRANDING });
  const past = { ...SEED.trips[0], id: "trip_past", name: "Past Trip", startDate: "2026-08-01", endDate: "2026-08-03" };
  // Enough future trips that the list has to scroll inside the sidebar
  const future = Array.from({ length: 10 }, (_, i) => ({ ...SEED.trips[0], id: `trip_f${i}`, name: `Future ${i}`, startDate: `2027-0${(i % 9) + 1}-01`, endDate: `2027-0${(i % 9) + 1}-02` }));
  await seedTrip(page, { ...SEED, trips: [...SEED.trips, past, ...future] });
  await page.goto("/with?id=sample-hotel");
  await expect(card(page)).toBeVisible();
  await expect(page.getByRole("button", { name: "Recent Trips section" })).toHaveAttribute("aria-expanded", "false");
  // The band sits above the top bar: + New Trip, at the sidebar's foot, must still be in view without scrolling
  const newTrip = (await page.getByRole("button", { name: "+ New Trip" }).boundingBox())!;
  expect(newTrip.y + newTrip.height).toBeLessThanOrEqual(page.viewportSize()!.height);
  // Without a partner, Recent Trips is open as before
  await band(page).getByRole("button", { name: "Stop showing Sample Hotel" }).click();
  await expect(page.getByRole("button", { name: "Recent Trips section" })).toHaveAttribute("aria-expanded", "true");
});
