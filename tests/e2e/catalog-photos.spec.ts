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
import { seedTrip, fakeParkData, atParkTime, SEED } from "./helpers";

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
