// File transfer on the Play page: export the trip as a file with its
// 6-digit code, then import it on "another device" (a fresh browser
// profile with the same trip but nothing in it). Nothing leaves the machine:
// the file is a local download and the code is checked in the page.
import fs from "node:fs";
import { test, expect, type Browser, type Page } from "@playwright/test";
import { seedTrip, fakeParkData, atParkTime, rows, SEED } from "./helpers";

/** The same trip on a second device, before anything has been sent to it. */
const EMPTY_TRIP: typeof SEED = { ...SEED, wishes: [], tripWishSelections: [], dayItems: [] };

/** Exports the seeded trip from Play; returns the file's path and its code. */
async function exportTrip(page: Page): Promise<{ file: string; code: string }> {
  await seedTrip(page);
  await page.goto("/play");
  for (const section of ["Select Dates", "Categories"]) {
    await page.getByText(section, { exact: true }).locator("..").getByText("Select All").click();
  }
  await expect(page.getByText(/^Total: \d+ items selected$/)).toBeVisible();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: /Download Export File/ }).click();
  const file = await (await download).path();
  await expect(page.getByText("File downloaded successfully!")).toBeVisible();
  const code = (await page.getByText("Share this verification code").locator("xpath=following-sibling::div[1]").innerText()).replace(/\D/g, "");
  expect(code).toMatch(/^\d{6}$/);
  return { file, code };
}

/** A second device: a fresh profile with the same faked data and clock. */
async function otherDevice(browser: Browser): Promise<Page> {
  const { baseURL, timezoneId, viewport, locale } = test.info().project.use;
  const page = await (await browser.newContext({ baseURL, timezoneId, viewport, locale })).newPage();
  await atParkTime(page);
  await fakeParkData(page);
  await seedTrip(page, EMPTY_TRIP);
  await page.goto("/play");
  await page.getByRole("button", { name: /📥 Import/ }).click();
  return page;
}

async function enterCode(page: Page, code: string) {
  const digits = page.locator('input[inputmode="numeric"][maxlength="1"]');
  await expect(digits).toHaveCount(6);
  for (let i = 0; i < 6; i++) await digits.nth(i).fill(code[i]);
  await page.getByRole("button", { name: "Verify Code" }).click();
}

test.beforeEach(async ({ page }) => {
  await atParkTime(page);
  await fakeParkData(page);
});

test("Export a trip file, then import it on another device with its code", async ({ page, browser }) => {
  const { file, code } = await exportTrip(page);
  const text = fs.readFileSync(file, "utf8");
  expect(text).toContain("Space Mountain");
  expect(text).toContain("The Dapper Dans");

  const other = await otherDevice(browser);
  await other.locator('input[type="file"][accept=".json"]').first().setInputFiles(file);
  await enterCode(other, code);
  await expect(other.getByRole("button", { name: "✅ Code Verified" })).toBeVisible();
  await other.getByRole("button", { name: /Import Data/ }).click();
  await expect(other.getByText("Import Complete!")).toBeVisible();

  const titles = (await rows<{ title: string }>(other, "wishes")).map((w) => w.title).sort();
  expect(titles).toEqual(["Space Mountain", "The Dapper Dans"]);
  expect((await rows<{ title: string; date: string; scheduledTime?: string }>(other, "dayItems"))
    .map((d) => `${d.title} ${d.date} ${d.scheduledTime}`)).toEqual(["Space Mountain 2026-10-15 09:00"]);
  await other.goto("/plan");
  await expect(other.getByRole("heading", { name: "Space Mountain", exact: true })).toBeVisible();
  await expect(other.getByRole("heading", { name: "The Dapper Dans", exact: true })).toBeVisible();
});

test("A wrong code is refused and nothing can be imported", async ({ page, browser }) => {
  const { file, code } = await exportTrip(page);
  const wrong = code.slice(0, 5) + String((Number(code[5]) + 1) % 10);

  const other = await otherDevice(browser);
  await other.locator('input[type="file"][accept=".json"]').first().setInputFiles(file);
  await enterCode(other, wrong);
  await expect(other.getByRole("button", { name: "❌ Invalid Code" })).toBeVisible();
  await expect(other.getByRole("button", { name: /Import Data/ })).toHaveCount(0);
  expect(await rows(other, "wishes")).toEqual([]);
});
