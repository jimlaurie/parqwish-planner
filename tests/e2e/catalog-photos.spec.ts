// Catalog › Photos (src/components/catalog/PhotoGalleryTab.tsx,
// src/hooks/use-all-trip-photos.ts). Reported 27 Nov 2026: photos imported
// from Pal didn't show there. The import attaches each photo to its catalog
// item, which needn't be on the trip shown, and the tab showed only the
// trip's; a photo with no matching item was dropped. Now the tab opens on
// every photo ("This trip" narrows it) and the import keeps the unmatched ones.
import fs from "fs";
import os from "os";
import path from "path";
import JSZip from "jszip";
import { test, expect, type Page } from "@playwright/test";
import { seedTrip, fakeParkData, atParkTime, rows, SEED } from "./helpers";

// A 1×1 PNG
const PIXEL = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
const set = { thumbnail: PIXEL, display: PIXEL, full: PIXEL };
const NOW = 1_792_000_000_000;

// Space Mountain (on the trip) and Churros (a catalog wish on no trip) each have a photo
const WITH_PHOTOS = {
  ...SEED,
  wishes: [
    ...SEED.wishes.map((w) => (w.id === "w_space" ? { ...w, photoSets: [set] } : w)),
    { id: "w_churros", title: "Churros", tags: ["eats"], priority: "C", photoSets: [set], createdAt: NOW, updatedAt: NOW },
  ],
};

async function openCatalogPhotos(page: Page) {
  await page.goto("/catalog");
  await page.getByRole("button", { name: /Photos/ }).first().click();
}

test.beforeEach(async ({ page }) => {
  await atParkTime(page);
  await fakeParkData(page);
});

test("Catalog › Photos opens on every photo; This trip narrows to the trip's", async ({ page }) => {
  await seedTrip(page, WITH_PHOTOS);
  await openCatalogPhotos(page);
  const group = page.getByRole("group", { name: "Which photos" });
  await expect(group.getByRole("button", { name: "All photos" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText("Churros", { exact: true })).toBeVisible();
  await expect(page.getByText("Space Mountain", { exact: true })).toBeVisible();
  // Publish's include toggle is per trip, so it shows only in the trip view
  await expect(page.getByRole("button", { name: "✓ In Publish" })).toHaveCount(0);

  await group.getByRole("button", { name: "This trip" }).click();
  await expect(page.getByText("Space Mountain", { exact: true })).toBeVisible();
  await expect(page.getByText("Churros", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "✓ In Publish" })).toHaveCount(1);
});

test("A photo from Pal with no matching item is kept on the trip, not dropped", async ({ page }) => {
  await seedTrip(page);
  const zip = new JSZip();
  zip.file("photo1.png", PIXEL.split(",")[1], { base64: true });
  zip.file("manifest.json", JSON.stringify({
    version: "1.0", exportDate: "2026-10-15T17:00:00Z", source: "mobile",
    photos: [{ filename: "photo1.png", itemType: "collection", itemId: "coll_x", itemName: "Figment pin", date: "2026-10-15" }],
  }));
  const file = path.join(os.tmpdir(), `pal-photos-${Date.now()}.zip`);
  fs.writeFileSync(file, await zip.generateAsync({ type: "nodebuffer" }));

  await page.goto("/play");
  await page.getByRole("button", { name: /📥 Import/ }).click();
  await page.getByRole("button", { name: /🖼️ Photos/ }).click();
  await page.locator('input[type="file"][accept=".zip"]').setInputFiles(file);
  await expect(page.getByText(/1 with no matching item, kept on this trip/)).toBeVisible();

  await openCatalogPhotos(page);
  await expect(page.getByText("Figment pin").first()).toBeVisible();
});

/** A small photo of one colour, as a camera would hand Pal (PNG base64), made in the page. */
async function photoBase64(page: Page, colour: string): Promise<string> {
  return page.evaluate((c) => {
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 48;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = c;
    ctx.fillRect(0, 0, 64, 48);
    ctx.fillStyle = "#fff";
    ctx.fillRect(8, 8, 16, 16);
    return canvas.toDataURL("image/png").split(",")[1];
  }, colour);
}

async function importZip(page: Page, file: string) {
  await page.goto("/play");
  await page.getByRole("button", { name: /📥 Import/ }).click();
  await page.getByRole("button", { name: /🖼️ Photos/ }).click();
  await page.locator('input[type="file"][accept=".zip"]').setInputFiles(file);
  await expect(page.getByText("Photos Imported!")).toBeVisible();
}

test("Importing the same Pal photos again doesn't add them twice", async ({ page }) => {
  // Space Mountain's ride photo matches its wish; Matterhorn only its day item; a pin nothing
  const withMatterhorn = {
    ...SEED,
    dayItems: [...SEED.dayItems, {
      id: "di_matter", tripId: "trip_test", userId: "user_primary", date: "2026-10-15", scheduledTime: "11:00", durationMinutes: 30,
      sortOrder: 1, title: "Matterhorn Bobsleds", itemType: "ride", park: "Disneyland", land: "Fantasyland", priority: "B",
      sourceId: "disneyland__matterhorn", completed: false, createdAt: NOW, updatedAt: NOW,
    }],
  };
  await seedTrip(page, withMatterhorn);
  const zip = new JSZip();
  zip.file("ride.png", await photoBase64(page, "#2a6"), { base64: true });
  zip.file("matter.png", await photoBase64(page, "#36c"), { base64: true });
  zip.file("pin.png", await photoBase64(page, "#c33"), { base64: true });
  zip.file("manifest.json", JSON.stringify({
    version: "1.0", exportDate: "2026-10-15T17:00:00Z", source: "mobile",
    photos: [
      { filename: "ride.png", itemType: "ride", itemId: "disneyland__space-mountain", itemName: "Space Mountain", date: "2026-10-15" },
      { filename: "matter.png", itemType: "ride", itemId: "disneyland__matterhorn", itemName: "Matterhorn Bobsleds", date: "2026-10-15" },
      { filename: "pin.png", itemType: "collection", itemId: "coll_x", itemName: "Figment pin", date: "2026-10-15" },
    ],
  }));
  const file = path.join(os.tmpdir(), `pal-photos-again-${Date.now()}.zip`);
  fs.writeFileSync(file, await zip.generateAsync({ type: "nodebuffer" }));

  const counts = async () => {
    const wish = (await rows<{ id: string; photoSets?: unknown[] }>(page, "wishes")).find((w) => w.id === "w_space");
    const day = (await rows<{ id: string; photos?: unknown[] }>(page, "dayItems")).find((d) => d.id === "di_matter");
    return { wish: wish?.photoSets?.length ?? 0, day: day?.photos?.length ?? 0, kept: (await rows(page, "tripPhotos")).length };
  };

  await importZip(page, file);
  expect(await counts()).toEqual({ wish: 1, day: 1, kept: 1 });
  await importZip(page, file);
  expect(await counts()).toEqual({ wish: 1, day: 1, kept: 1 });
});

test("A photo opens large, steps to the next, and can be downloaded and copied", async ({ page, context, browserName }) => {
  await seedTrip(page, WITH_PHOTOS);
  await openCatalogPhotos(page);
  await page.getByRole("button", { name: "View Churros larger" }).click();
  const viewer = page.getByRole("dialog", { name: /Photo viewer, \d of 2/ });
  await expect(viewer).toBeVisible();
  await expect(viewer.getByText("Churros", { exact: true })).toBeVisible();

  const download = page.waitForEvent("download");
  await viewer.getByRole("button", { name: "Download" }).click();
  expect((await download).suggestedFilename()).toBe("churros.png");
  await expect(viewer.getByRole("status")).toHaveText("Downloaded");

  if (browserName === "chromium") {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await viewer.getByRole("button", { name: "Copy image" }).click();
    await expect(viewer.getByRole("status")).toHaveText(/Copied/);
    expect(await page.evaluate(async () => (await navigator.clipboard.read())[0].types)).toContain("image/png");
  }

  // The other photo, by arrow key; Escape closes
  await page.keyboard.press(await viewer.getByRole("button", { name: "Next photo" }).count() ? "ArrowRight" : "ArrowLeft");
  await expect(viewer.getByText("Space Mountain", { exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(viewer).toBeHidden();
});

test("An imported photo keeps its original as the full copy, and a re-import upgrades an older smaller one", async ({ page }) => {
  await seedTrip(page);
  const original = await photoBase64(page, "#963");
  const zip = new JSZip();
  zip.file("ride.png", original, { base64: true });
  zip.file("manifest.json", JSON.stringify({
    version: "1.0", exportDate: "2026-10-15T17:00:00Z", source: "mobile",
    photos: [{ filename: "ride.png", itemType: "ride", itemId: "disneyland__space-mountain", itemName: "Space Mountain", date: "2026-10-15" }],
  }));
  const file = path.join(os.tmpdir(), `pal-photos-full-${Date.now()}.zip`);
  fs.writeFileSync(file, await zip.generateAsync({ type: "nodebuffer" }));
  const sets = async () => (await rows<{ id: string; photoSets?: Array<{ full: string; display: string }> }>(page, "wishes"))
    .find((w) => w.id === "w_space")?.photoSets ?? [];

  await importZip(page, file);
  expect((await sets())[0].full).toBe(`data:image/png;base64,${original}`);

  // As a photo imported before 27 Nov 2026 was saved: the same display copy, a smaller full one
  await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((res, rej) => { const r = indexedDB.open("ParQwishPWA"); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
    const store = db.transaction("wishes", "readwrite").objectStore("wishes");
    await new Promise<void>((res) => {
      const q = store.get("w_space");
      q.onsuccess = () => { const w = q.result; w.photoSets[0].full = w.photoSets[0].display; store.put(w).onsuccess = () => res(); };
    });
    db.close();
  });
  expect((await sets())[0].full).not.toBe(`data:image/png;base64,${original}`);

  await importZip(page, file);
  const after = await sets();
  expect(after).toHaveLength(1);
  expect(after[0].full).toBe(`data:image/png;base64,${original}`);
});

// A collection, and a photo imported unmatched (kept on the trip, unlinked)
const T = 1_790_000_000_000;
const COLLECTION = {
  collectionSettings: [{ id: "settings", enabled: ["pins"], userCategories: [], firstRunDone: true, createdAt: T, updatedAt: T }],
  collectionItems: [{ id: "col_fig", name: "Figment 50th", category: "pins", state: "have", userId: "user_primary", createdAt: T, updatedAt: T }],
};
const UNLINKED = {
  tripPhotos: [{ id: "tphoto_1", tripId: "trip_test", date: "2026-10-15", photoSets: [set], caption: "Figment pin", createdAt: NOW }],
};

test("An unlinked photo is added to a collection item, and moves there", async ({ page }) => {
  await seedTrip(page, { ...SEED, ...COLLECTION, ...UNLINKED });
  await openCatalogPhotos(page);
  await page.getByRole("button", { name: "Add to items or tag a place…" }).click();
  const linker = page.getByRole("dialog", { name: "Link photo" });
  await expect(linker.getByRole("tab", { name: "Add to items" })).toHaveAttribute("aria-selected", "true");
  await linker.getByRole("textbox", { name: "Search" }).fill("figment");
  await linker.getByRole("button", { name: /Figment 50th/ }).click();
  await linker.getByRole("button", { name: "Add to item" }).click();

  await expect(page.getByRole("status").filter({ hasText: "Moved to" })).toHaveText(/Moved to Figment 50th/);
  const item = (await rows<{ id: string; photoSets?: unknown[] }>(page, "collectionItems")).find((i) => i.id === "col_fig");
  expect(item?.photoSets).toHaveLength(1);
  expect(await rows(page, "tripPhotos")).toHaveLength(0);
});

test("An editor adds a photo from the Photo Gallery", async ({ page }) => {
  await seedTrip(page, { ...WITH_PHOTOS, ...COLLECTION });
  await page.goto("/collection");
  await page.getByTestId("collection-item").filter({ hasText: "Figment 50th" }).click();
  const editor = page.getByRole("dialog", { name: "Edit collection item" });
  await editor.getByRole("button", { name: "Add from Photo Gallery" }).click();
  const picker = page.getByRole("dialog", { name: "Add from Photo Gallery" });
  await picker.getByRole("button", { name: /^.*Churros/ }).click();
  await picker.getByRole("button", { name: "Add photo" }).click();
  await expect(picker).toBeHidden();
  await expect(editor.getByRole("img", { name: "Photo 1" })).toBeVisible();
  await editor.getByRole("button", { name: "Save" }).click();
  await expect(editor).toBeHidden();
  await expect.poll(async () => (await rows<{ id: string; photoSets?: unknown[] }>(page, "collectionItems"))
    .find((i) => i.id === "col_fig")?.photoSets?.length).toBe(1);
  // A copy: the wish keeps its photo
  expect((await rows<{ id: string; photoSets?: unknown[] }>(page, "wishes")).find((w) => w.id === "w_churros")?.photoSets).toHaveLength(1);
});

