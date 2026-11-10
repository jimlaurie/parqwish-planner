// The Collection page (dland-wishes docs/collections-design.md §7): the
// first visit's category picker, adding an item, the list view's sorting and
// filters, a field added in Categories becoming a column and a filter, and
// Play's collection zip export and import (§8b).
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
