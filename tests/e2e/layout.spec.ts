// Page layouts: equal columns on Plan and Prepare (switching on the content
// area's width, not the window's), and Preview's compact header.
import { test, expect, type Page } from "@playwright/test";
import { seedTrip, fakeParkData, atParkTime } from "./helpers";

/**
 * The two columns' widths, or null when the page is stacked (no catalog
 * panel beside the list). One evaluate, so the panel can't vanish between
 * finding it and measuring it while the layout switches.
 */
async function columnWidths(page: Page): Promise<number[] | null> {
  return page.evaluate(() => {
    const panel = document.querySelector("[data-testid=catalog-panel]");
    if (!panel || !panel.parentElement) return null;
    return [...panel.parentElement.children].map((c) => Math.round(c.getBoundingClientRect().width));
  });
}

test.beforeEach(async ({ page }) => {
  await atParkTime(page);
  await fakeParkData(page);
  await seedTrip(page);
});

for (const pagePath of ["/plan", "/prepare"]) {
  test(`${pagePath}: two equal columns on a wide window, stacked when too narrow`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(pagePath);
    await expect(page.getByTestId("catalog-panel")).toBeVisible();
    const [a, b] = (await columnWidths(page))!;
    expect(Math.abs(a - b)).toBeLessThanOrEqual(2);

    await page.setViewportSize({ width: 1100, height: 1000 }); // content just fits two 380 px columns
    await expect.poll(() => columnWidths(page)).not.toBeNull();

    await page.setViewportSize({ width: 1000, height: 1000 }); // too narrow: stacked
    await expect.poll(() => columnWidths(page)).toBeNull();

    // Sidebar gone: room again. The click can land mid re-layout after the
    // resize, so confirm it collapsed (and click again if not)
    await expect(async () => {
      const collapse = page.getByRole("button", { name: "Collapse sidebar" });
      if (await collapse.isVisible()) await collapse.click();
      await expect(page.getByRole("button", { name: "Expand sidebar" })).toBeVisible({ timeout: 1000 });
    }).toPass();
    await expect.poll(() => columnWidths(page)).not.toBeNull();
  });
}

test("Preview: day tabs on the title row, hours on the counts row, left-aligned", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/preview");
  await page.getByRole("button", { name: /10\/15/ }).click(); // a day with posted hours
  const title = (await page.getByRole("heading", { level: 1, name: "Test Trip" }).boundingBox())!;
  const tab = (await page.getByRole("button", { name: /10\/15/ }).boundingBox())!;
  const hours = (await page.getByRole("note", { name: "Park hours" }).boundingBox())!;
  const counts = (await page.getByText(/scheduled$/).boundingBox())!;
  expect(Math.abs(tab.y + tab.height / 2 - (title.y + title.height / 2))).toBeLessThan(12); // same row
  expect(Math.abs(hours.y + hours.height / 2 - (counts.y + counts.height / 2))).toBeLessThan(12);
  expect(title.x).toBeLessThan(40); // left-aligned (24 px padding), not centred

  await page.setViewportSize({ width: 390, height: 844 }); // phone: tabs drop below the name
  const t2 = (await page.getByRole("heading", { level: 1, name: "Test Trip" }).boundingBox())!;
  const tab2 = (await page.getByRole("button", { name: /10\/15/ }).boundingBox())!;
  expect(tab2.y).toBeGreaterThan(t2.y + t2.height - 2);
});
