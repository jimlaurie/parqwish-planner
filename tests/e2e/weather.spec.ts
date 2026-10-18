// Weather on Plan, Prepare and Preview: forecast days and typical days, the
// °F/°C switch, Prepare's packing tips, Preview's day line and hourly
// labels, and the fallbacks (an older deployed forecast, or none at all).
// Fixtures: the live forecast was fetched 15 Oct at 9:10 AM and covers the
// 15th (sunny, 93°, feels 97° at 3 PM) and 16th (showers, 60%); the deployed
// copy is from 12 Oct and 5° cooler on the 15th; the 17th is beyond both,
// so it's "typical" (79.5° / 58.2°, rain on 9% of years).
import { test, expect, type Page } from "@playwright/test";
import { seedTrip, fakeParkData, atParkTime } from "./helpers";

const days = (page: Page) => page.getByTestId("weather-day");
const day = (page: Page, md: string) => days(page).filter({ hasText: md });

test.beforeEach(async ({ page }) => {
  await atParkTime(page); // Thu 15 Oct, 10 AM
});

test("Plan shows the forecast for the next days and typical weather after, with where it came from", async ({ page }) => {
  await fakeParkData(page);
  await seedTrip(page);
  await page.goto("/plan");
  await expect(days(page)).toHaveCount(3); // 14 Oct is past
  await expect(day(page, "10/15")).toHaveAttribute("aria-label", "Thu 10/15: sunny, high 93°, low 62°, 10% chance of rain");
  await expect(day(page, "10/15")).toContainText("Forecast");
  await expect(day(page, "10/16")).toHaveAttribute("aria-label", "Fri 10/16: showers likely, high 76°, low 57°, 60% chance of rain");
  await expect(day(page, "10/17")).toHaveAttribute("aria-label", "Sat 10/17: typical for the date, high 80°, low 58°, rain on 9% of years");
  await expect(day(page, "10/17")).toContainText("Typical");
  await expect(page.getByText("Forecast: National Weather Service, updated 9:10 AM · Typical: 1991–2020 averages, Fullerton Municipal airport")).toBeVisible();
});

test("The °F/°C switch converts every temperature and is remembered", async ({ page }) => {
  await fakeParkData(page);
  await seedTrip(page);
  await page.goto("/plan");
  await page.getByRole("group", { name: "Temperature unit" }).getByRole("button", { name: "°C" }).click();
  await expect(day(page, "10/15")).toHaveAttribute("aria-label", /high 34°, low 17°/);
  await page.reload();
  await expect(day(page, "10/15")).toHaveAttribute("aria-label", /high 34°, low 17°/);
  await expect(page.getByRole("button", { name: "°C" })).toHaveAttribute("aria-pressed", "true");
});

test("Prepare's packing tips: rain, cool evenings and heat, and + Add opens the right sub-category", async ({ page }) => {
  await fakeParkData(page);
  await seedTrip(page);
  await page.goto("/prepare");
  const tips = page.getByRole("list", { name: "Packing tips from the weather" }).getByRole("listitem");
  await expect(tips).toHaveText([
    /Rain likely Fri \(up to 60%\): pack rain gear/,
    /Evenings down to 57°: bring a layer for after dark/,
    /Highs near 97°: sunscreen, a hat and water/,
  ]);
  // No Weather Gear in the catalog yet, so there's nothing to show, only to add
  await expect(tips.first().getByRole("button", { name: "Show Weather Gear" })).toHaveCount(0);
  await tips.first().getByRole("button", { name: "+ Add Weather Gear" }).click();
  await expect(page.getByRole("button", { name: "Weather Gear", exact: true, pressed: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Day Wear", exact: true, pressed: false })).toBeVisible();
});

test("Preview: the day's weather beside the park hours, and each hour's weather on the timeline", async ({ page }) => {
  await fakeParkData(page);
  await seedTrip(page);
  await page.goto("/preview");
  await page.getByRole("button", { name: /10\/15/ }).click();
  const line = page.getByRole("note", { name: "Weather" });
  await expect(line).toContainText("93° / 62°");
  await expect(line).toContainText("Sunny");
  await expect(line).toContainText(/Sunset 6:1[789] PM/); // NOAA: 6:18 PM
  await expect(line).toContainText("Forecast");
  const threePm = page.getByTestId("slot-15:00").locator("xpath=preceding-sibling::div[1]");
  await expect(threePm.getByTestId("hour-weather")).toContainText("92°");
  await expect(threePm.getByTestId("hour-weather")).toContainText("feels 97°");

  await page.getByRole("button", { name: /10\/16/ }).click();
  const fourPm = page.getByTestId("slot-15:00").locator("xpath=preceding-sibling::div[1]");
  await expect(fourPm.getByTestId("hour-weather")).toContainText("☔60%");
  await expect(fourPm.getByTestId("hour-weather")).toContainText("💨18 mph");

  await page.getByRole("button", { name: /10\/17/ }).click();
  await expect(line).toContainText("Typical");
  await expect(line).toContainText("☔ 9% of years");
  await expect(page.getByTestId("slot-15:00").locator("xpath=preceding-sibling::div[1]")).toContainText("~80°");
});

test("With Storage blocked, the deployed forecast is used and says how old it is", async ({ page }) => {
  await fakeParkData(page, "blocked");
  await seedTrip(page);
  await page.goto("/plan");
  await expect(day(page, "10/15")).toHaveAttribute("aria-label", /high 88°/);
  await expect(page.getByText(/Forecast from Oct 12, 2:10 PM \(a newer one couldn.t be loaded\)/)).toBeVisible();
});

test("With no weather at all, Plan says it couldn't be loaded", async ({ page }) => {
  await fakeParkData(page, "blocked");
  await page.route(/\/data\/weather\//, (route) => route.fulfill({ status: 404, body: "" }));
  await seedTrip(page);
  await page.goto("/plan");
  await expect(page.getByText("Weather couldn’t be loaded right now. Check your connection, or try again later.")).toBeVisible();
  await expect(days(page)).toHaveCount(0);
});

test("On a phone, Preview's header (hours, a ticketed event, the weather) fits without scrolling sideways", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await fakeParkData(page);
  await seedTrip(page);
  await page.goto("/preview");
  await page.getByRole("button", { name: /10\/16/ }).click(); // the fixture's ticketed-event night
  await expect(page.getByRole("note", { name: "Weather" })).toContainText("76° / 57°");
  await expect(page.getByText(/Special Ticketed Event/)).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});
