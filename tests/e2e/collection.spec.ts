// The Collection page (dland-wishes docs/collections-design.md §7): the
// first visit's category picker, adding an item, the list view's sorting and
// filters, the Gallery view, a field added in Categories becoming a column
// and a filter, Play's collection zip export and import (§8b), and items got
// on a trip in Catalog › Photos.
// Collections are hidden unless the dev server has NEXT_PUBLIC_COLLECTIONS=1
// (Playwright's own server sets it, playwright.config.ts); against a server
// started without it these checks are skipped, and say why.
import { test, expect, type Page } from "@playwright/test";
import { seedTrip, rows, SEED } from "./helpers";

type Item = { id: string; name: string; category: string; state: string; details?: Record<string, unknown> };
type Settings = { enabled: string[]; firstRunDone: boolean; customFields?: Record<string, Array<{ name: string; type: string; choices?: string[] }>> };

const T = Date.parse("2026-11-01T12:00:00-07:00");
const SETTINGS = { id: "settings", enabled: ["pins", "plush"], userCategories: [], firstRunDone: true, createdAt: T, updatedAt: T };
const pin = (id: string, name: string, extra: Record<string, unknown> = {}) =>
  ({ id, name, category: "pins", state: "have", userId: "user_primary", createdAt: T, updatedAt: T, ...extra });
const PINS = [
  pin("col_1", "Figment 50th", { details: { edition: "Limited Edition", editionSize: 2500, year: 2022 }, acquired: { date: "2026-10-12" } }),
  pin("col_2", "Hatbox Ghost", { details: { edition: "Open Edition", year: 2019 }, quantity: 2 }),
  pin("col_3", "Castle 70th", { details: { edition: "Limited Release", editionSize: 300, year: 2025 } }),
  pin("col_4", "Dumbo", {}),
];

let warned = false;

/** Opens /collection, or skips the check when the server was started without the flag. */
async function openCollection(page: Page) {
  await page.goto("/collection");
  const off = page.getByText("Collections aren't available yet.");
  const on = page.getByRole("heading", { level: 1 }).or(page.getByRole("dialog", { name: "What do you collect?" }));
  await expect(off.or(on).first()).toBeVisible();
  if (await off.isVisible()) {
    const why = "Skipped: the dev server on :3000 was started without NEXT_PUBLIC_COLLECTIONS=1, so Collections are hidden. Stop it (or start it with the flag) to run these checks.";
    if (!warned) console.warn(why);
    warned = true;
    test.skip(true, why);
  }
}

const rowNames = (page: Page) => page.getByTestId("collection-row").locator("td:first-child span.font-semibold").allTextContents();

test("The first visit asks what you collect, and + Add saves an item to the chosen category", async ({ page }) => {
  await seedTrip(page, { ...SEED, collectionItems: [], collectionSettings: [] });
  await openCollection(page);
  const picker = page.getByRole("dialog", { name: "What do you collect?" });
  await picker.getByRole("checkbox", { name: /Pins/ }).click();
  await picker.getByRole("button", { name: "Done" }).click();
  await expect(picker).toBeHidden();
  await expect(page.getByRole("heading", { level: 1, name: /Pins/ })).toBeVisible();
  const [settings] = await rows<Settings>(page, "collectionSettings");
  expect(settings.enabled).toEqual(["pins"]);
  expect(settings.firstRunDone).toBe(true);

  await page.getByRole("button", { name: "+ Add" }).click();
  const add = page.getByRole("dialog", { name: "Add to collection" });
  await add.getByLabel("Name").fill("Figment 50th");
  await add.getByText("More details").click();
  await add.getByRole("radiogroup", { name: "Edition" }).getByRole("radio", { name: "Limited Edition" }).click();
  await add.getByRole("button", { name: "Save" }).click();
  await expect(add).toBeHidden();
  await expect(page.getByTestId("collection-item").filter({ hasText: "Figment 50th" })).toBeVisible();
  const items = await rows<Item>(page, "collectionItems");
  expect(items.map((i) => [i.name, i.category, i.state, i.details?.edition])).toEqual([["Figment 50th", "pins", "have", "Limited Edition"]]);
});

test("The list view sorts by a column, filters by choice and range, and a row opens its item", async ({ page }) => {
  await seedTrip(page, { ...SEED, collectionItems: PINS, collectionSettings: [SETTINGS] });
  await openCollection(page);
  await page.getByRole("button", { name: "List", exact: true }).click();
  await expect(page.getByTestId("collection-row")).toHaveCount(4);
  for (const column of ["Edition", "Edition size", "Series or set", "Year", "Event or season", "Exclusive to", "Date"]) {
    await expect(page.getByRole("columnheader", { name: column, exact: true })).toBeVisible();
  }

  const size = page.getByRole("button", { name: "Edition size", exact: true });
  await size.click();
  expect(await rowNames(page)).toEqual(["Castle 70th", "Figment 50th", "Dumbo", "Hatbox Ghost"]); // blanks last, in the tab's order
  await expect(page.getByRole("columnheader", { name: "Edition size" })).toHaveAttribute("aria-sort", "ascending");
  await size.click();
  expect(await rowNames(page)).toEqual(["Figment 50th", "Castle 70th", "Dumbo", "Hatbox Ghost"]); // blanks stay last
  await page.getByRole("button", { name: "Edition", exact: true }).click();
  expect(await rowNames(page)).toEqual(["Hatbox Ghost", "Figment 50th", "Castle 70th", "Dumbo"]); // the choices' own order

  await page.getByLabel("Filter by Edition").selectOption("Limited Release");
  expect(await rowNames(page)).toEqual(["Castle 70th"]);
  await expect(page.getByText("1 of 4 items")).toBeVisible();
  await page.getByLabel("Filter by Edition").selectOption({ label: "Edition: left blank" });
  expect(await rowNames(page)).toEqual(["Dumbo"]);
  await page.getByRole("button", { name: "Clear filters" }).click();
  await page.getByLabel("Year from").fill("2020");
  expect(await rowNames(page)).toEqual(["Figment 50th", "Castle 70th"]);
  await page.getByLabel("Year to").fill("2021");
  await expect(page.getByText("No items match these filters.")).toBeVisible();
  await page.getByRole("button", { name: "Clear filters" }).click();
  await page.getByLabel("Search names and tags").fill("ghost");
  expect(await rowNames(page)).toEqual(["Hatbox Ghost"]);

  await page.getByTestId("collection-row").first().click();
  const editor = page.getByRole("dialog", { name: "Edit collection item" });
  await expect(editor.getByLabel("Name")).toHaveValue("Hatbox Ghost");
  await editor.getByRole("button", { name: "Cancel" }).click();

  // The view is remembered
  await page.reload();
  await expect(page.getByRole("button", { name: "List", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("collection-row")).toHaveCount(4);
});

// A 1×1 PNG: the photos are data URLs on the Planner
const PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
const photo = () => ({ thumbnail: PNG, display: PNG, full: PNG });

test("The gallery view shows only photos, filters as the list does, and opens a photo or its item", async ({ page }) => {
  const WITH_PHOTOS = PINS.map((p) =>
    p.id === "col_1" ? { ...p, photoSets: [photo(), photo()] } : p.id === "col_3" ? { ...p, photoSets: [photo()] } : p);
  await seedTrip(page, { ...SEED, collectionItems: WITH_PHOTOS, collectionSettings: [SETTINGS] });
  await openCollection(page);
  await page.getByRole("button", { name: "Gallery", exact: true }).click();
  const gallery = page.getByTestId("collection-gallery");
  await expect(gallery.getByRole("button", { name: /^View photo of/ })).toHaveCount(3);
  await expect(page.getByText("3 photos", { exact: true })).toBeVisible();
  await expect(page.getByText("2 items have no photo, so they aren't shown. List shows every item.")).toBeVisible();

  await page.getByLabel("Filter by Edition").selectOption("Limited Release");
  await expect(gallery.getByRole("button", { name: /^View photo of/ })).toHaveCount(1);
  await expect(page.getByText("1 of 3 photos")).toBeVisible();

  await gallery.getByRole("button", { name: "View photo of Castle 70th" }).click();
  await expect(page.getByRole("dialog", { name: "Photo viewer, 1 of 1" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: /Photo viewer/ })).toBeHidden();
  await gallery.getByRole("button", { name: "Open Castle 70th" }).click();
  const editor = page.getByRole("dialog", { name: "Edit collection item" });
  await expect(editor.getByLabel("Name")).toHaveValue("Castle 70th");
  await editor.getByRole("button", { name: "Cancel" }).click();

  await page.reload();
  await expect(page.getByRole("button", { name: "Gallery", exact: true })).toHaveAttribute("aria-pressed", "true");
});

test("Catalog › Photos shows the photos of items got on the trip, and one opens its item", async ({ page }) => {
  const ON_TRIP = [
    pin("col_1", "Figment 50th", { photoSets: [photo()], acquired: { date: "2026-10-15", tripId: "trip_test" } }),
    pin("col_2", "Hatbox Ghost", { photoSets: [photo()], acquired: { date: "2026-09-01", tripId: "trip_other" } }),
    pin("col_3", "Castle 70th", { photoSets: [photo()] }),
  ];
  await seedTrip(page, { ...SEED, collectionItems: ON_TRIP, collectionSettings: [SETTINGS] });
  await openCollection(page);
  await page.goto("/catalog");
  await page.getByRole("button", { name: /Photos/ }).first().click();
  const card = page.getByTitle("Go to this item").filter({ hasText: "Figment 50th" });
  await expect(card).toBeVisible();
  await expect(card).toContainText("Collection");
  await expect(page.getByTitle("Go to this item").filter({ hasText: /Hatbox Ghost|Castle 70th/ })).toHaveCount(0);

  await card.click();
  await expect(page).toHaveURL(/\/collection/);
  const editor = page.getByRole("dialog", { name: "Edit collection item" });
  await expect(editor.getByLabel("Name")).toHaveValue("Figment 50th");
});

test("A choice field added in Categories becomes a list column and a filter", async ({ page }) => {
  await seedTrip(page, { ...SEED, collectionItems: PINS, collectionSettings: [SETTINGS] });
  await openCollection(page);
  await page.getByRole("button", { name: "Categories", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Collection categories" });
  await dialog.getByRole("button", { name: "+ Add a field" }).click();
  await dialog.getByRole("textbox", { name: "Name", exact: true }).fill("Size");
  await dialog.getByRole("radio", { name: "Choice list" }).click();
  await dialog.getByLabel("Choice 1", { exact: true }).fill("Small");
  await dialog.getByLabel("Choice 2", { exact: true }).fill("Large");
  await dialog.getByRole("button", { name: "Save field" }).click();
  await expect(dialog.getByRole("button", { name: "Edit Size" })).toBeVisible();
  const [settings] = await rows<Settings>(page, "collectionSettings");
  expect(settings.customFields?.pins?.map((f) => [f.name, f.type, f.choices])).toEqual([["Size", "choice", ["Small", "Large"]]]);
  await dialog.getByRole("button", { name: "Done" }).click();

  await page.getByRole("button", { name: "List", exact: true }).click();
  await expect(page.getByRole("columnheader", { name: "Size", exact: true })).toBeVisible();
  await page.getByLabel("Filter by Size").selectOption({ label: "Size: left blank" });
  await expect(page.getByTestId("collection-row")).toHaveCount(4);
  await page.getByLabel("Filter by Size").selectOption("Small");
  await expect(page.getByText("No items match these filters.")).toBeVisible();
});

test("Play exports the collection as a zip, and importing it back finds every item already there", async ({ page }) => {
  await seedTrip(page, { ...SEED, collectionItems: PINS, collectionSettings: [SETTINGS] });
  await openCollection(page);
  await page.goto("/play");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download 4 items" }).click();
  const file = await (await download).path();
  await expect(page.getByRole("status").filter({ hasText: "Exported" })).toContainText("Exported 4 items and 0 photos");

  await page.getByLabel("Collection zip").setInputFiles(file);
  await expect(page.getByText(/4 items and 0 photos, from Planner/)).toBeVisible();
  await page.getByRole("button", { name: "Keep mine" }).click();
  await page.getByRole("button", { name: "Import collection" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Added" })).toContainText("Added 0, updated 0, skipped 4");
  expect(await rows<Item>(page, "collectionItems")).toHaveLength(4);
});

test("Categories' “I trade these” box saves what was clicked", async ({ page }) => {
  await seedTrip(page, { ...SEED, collectionItems: PINS, collectionSettings: [SETTINGS] });
  await openCollection(page);
  await page.getByRole("button", { name: "Categories", exact: true }).click();
  const box = page.getByRole("dialog", { name: "Collection categories" }).getByLabel("I trade these");
  await expect(box).toBeChecked(); // Pins trade by default
  await box.click();
  await expect(box).not.toBeChecked();
  await expect.poll(async () => (await rows<Settings & { builtInOverrides?: Record<string, { trades?: boolean }> }>(page, "collectionSettings"))[0].builtInOverrides?.pins?.trades).toBe(false);
  await box.click();
  await expect(box).toBeChecked();
});

test("Straight after an item is deleted, the next one opens and deletes: a closing editor takes no clicks", async ({ page }) => {
  await seedTrip(page, { ...SEED, collectionItems: PINS, collectionSettings: [SETTINGS] });
  await openCollection(page);
  const editor = page.getByRole("dialog", { name: "Edit collection item" });
  await page.getByTestId("collection-item").filter({ hasText: "Figment 50th" }).click();
  await editor.getByRole("button", { name: "Delete" }).click();
  await editor.getByRole("button", { name: "Delete" }).click();
  // A person's next click comes while the editor is still fading out; force skips Playwright's wait for it
  await page.waitForTimeout(100);
  await page.getByTestId("collection-item").filter({ hasText: "Hatbox Ghost" }).click({ force: true });
  await expect(editor.getByLabel("Name")).toHaveValue("Hatbox Ghost");
  await expect(editor.getByText("Delete this item from your collection?")).toBeHidden();
  await editor.getByRole("button", { name: "Delete" }).click();
  await editor.getByRole("button", { name: "Delete" }).click();
  await expect.poll(async () => (await rows<Item>(page, "collectionItems")).map((i) => i.name).sort()).toEqual(["Castle 70th", "Dumbo"]);
});

test("At 1024 px the top bar shows Collection beside Catalog, with room for everything", async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 800 });
  await seedTrip(page, { ...SEED, collectionItems: PINS, collectionSettings: [SETTINGS] });
  await openCollection(page);
  const catalog = page.getByRole("link", { name: "Catalog", exact: true });
  const collection = page.getByRole("link", { name: "Collection", exact: true });
  await expect(catalog).toBeVisible();
  await expect(collection).toBeVisible();
  const [a, b] = [await catalog.boundingBox(), await collection.boundingBox()];
  expect(b!.x).toBeGreaterThan(a!.x + a!.width - 1);
  expect(Math.abs(b!.y - a!.y)).toBeLessThan(2); // same row
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  for (const name of ["Home", "Publish", "Help"]) {
    const box = await page.getByRole(name === "Help" ? "button" : "link", { name: new RegExp(`^${name}`) }).first().boundingBox();
    expect(box!.y).toBeLessThan(56);
  }
  await page.getByRole("button", { name: /^Help/ }).click();
  await expect(page.getByRole("link", { name: /Pins, buckets/ })).toHaveCount(0);
  await page.screenshot({ path: "test-results/topbar-1024.png", clip: { x: 0, y: 0, width: 1024, height: 60 } });
});

test("A family's collection shows everyone's items, filters by person, and an item can be made Shared", async ({ page }) => {
  const SAM = { id: "user_guest_1", name: "Sam", color: "#87CEEB", role: "guest", createdAt: T, updatedAt: T };
  const FAMILY = [
    pin("col_1", "Figment 50th", { userId: "user_primary" }),
    pin("col_2", "Hatbox Ghost", { userId: "user_guest_1" }),
    pin("col_3", "Castle 70th", { userId: "shared" }),
  ];
  await seedTrip(page, { ...SEED, users: [...SEED.users, SAM], collectionItems: FAMILY, collectionSettings: [SETTINGS] });
  await openCollection(page);
  const filter = page.getByRole("group", { name: "Whose items" });
  const tiles = page.getByTestId("collection-item");
  // Everyone by default, with a dot for each owner
  await expect(filter.getByRole("button", { name: /Everyone/ })).toHaveAttribute("aria-pressed", "true");
  await expect(tiles).toHaveCount(3);
  await expect(page.getByTestId("collection-owner-dot")).toHaveCount(3);
  // A person: theirs and the shared ones
  await filter.getByRole("button", { name: /Sam/ }).click();
  await expect(tiles).toHaveCount(2);
  await expect(tiles.filter({ hasText: "Hatbox Ghost" })).toBeVisible();
  await expect(tiles.filter({ hasText: "Castle 70th" })).toBeVisible();
  await filter.getByRole("button", { name: /Shared/ }).click();
  await expect(tiles).toHaveCount(1);

  // The editor asks whose it is; making Sam's pin Shared saves it so
  await filter.getByRole("button", { name: /Everyone/ }).click();
  await tiles.filter({ hasText: "Hatbox Ghost" }).click();
  const editor = page.getByRole("dialog", { name: "Edit collection item" });
  const whose = editor.getByRole("radiogroup", { name: "Whose is it?" });
  await expect(whose.getByRole("radio", { name: "Sam" })).toBeChecked();
  await whose.getByRole("radio", { name: "Shared" }).click();
  await editor.getByRole("button", { name: "Save" }).click();
  await expect(editor).toBeHidden();
  await expect.poll(async () => (await rows<Item & { userId?: string }>(page, "collectionItems")).find((i) => i.id === "col_2")?.userId).toBe("shared");
  // Sam now owns nothing, so there's no chip for them
  await expect(filter.getByRole("button", { name: /Sam/ })).toHaveCount(0);
});

test("One person's collection has no person filter, and a new item is theirs", async ({ page }) => {
  await seedTrip(page, { ...SEED, collectionItems: PINS, collectionSettings: [SETTINGS] });
  await openCollection(page);
  await expect(page.getByTestId("collection-item")).toHaveCount(4);
  await expect(page.getByRole("group", { name: "Whose items" })).toHaveCount(0);
  await expect(page.getByTestId("collection-owner-dot")).toHaveCount(0);
  await page.getByRole("button", { name: "+ Add" }).click();
  const add = page.getByRole("dialog", { name: "Add to collection" });
  await expect(add.getByRole("radiogroup", { name: "Whose is it?" })).toHaveCount(0);
  await add.getByLabel("Name").fill("Dole Whip pin");
  await add.getByRole("button", { name: "Save" }).click();
  await expect.poll(async () => (await rows<Item & { userId?: string }>(page, "collectionItems")).find((i) => i.name === "Dole Whip pin")?.userId).toBe("user_primary");
});

test("Removing a Trip User hands their collection items to the primary user", async ({ page }) => {
  const SAM = { id: "user_guest_1", name: "Sam", color: "#87CEEB", role: "guest", createdAt: T, updatedAt: T };
  await seedTrip(page, { ...SEED, users: [...SEED.users, SAM], collectionItems: [pin("col_2", "Hatbox Ghost", { userId: "user_guest_1" })], collectionSettings: [SETTINGS] });
  await page.goto("/plan");
  // as group.spec.ts does: click Remove once the page is ready, and wait for the question
  const group = page.getByRole("button", { name: "Group section" }).locator("..");
  await expect(async () => {
    await group.getByRole("button", { name: "Remove Sam" }).click();
    await expect(page.getByRole("heading", { name: "Remove Sam?" })).toBeVisible({ timeout: 2000 });
  }).toPass();
  await page.getByRole("button", { name: "Remove", exact: true }).click();
  await expect.poll(async () => (await rows<Item & { userId?: string }>(page, "collectionItems"))[0]?.userId).toBe("user_primary");
});
