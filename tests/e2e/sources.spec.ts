// Where the data came from (src/lib/data-sources.ts): the Play page lists
// every source, pages that depend on one say when it isn't live, a failure
// reads differently from "not available yet", and a fallback isn't saved
// for the day, so the next load tries the live files again.
// Fixtures: live files from 15 Oct, the deployed stats from 10 Oct.
import { test, expect, type Page } from "@playwright/test";
import { seedTrip, fakeParkData, atParkTime } from "./helpers";

const source = (page: Page, key: string) => page.getByTestId(`source-${key}`);

test.beforeEach(async ({ page }) => {
  await atParkTime(page);
});

test("Play lists where each kind of data came from, all live", async ({ page }) => {
  await fakeParkData(page);
  await seedTrip(page);
  await page.goto("/play");
  await expect(source(page, "parkData")).toContainText("Included with this version");
  await expect(source(page, "shows")).toContainText("Showtimes Live, updated Oct 15, 6:00 AM");
  await expect(source(page, "restaurants")).toContainText("Live, updated Oct 15");
  await expect(source(page, "waitTimeStats")).toContainText("Typical waits Live, updated Oct 15, 4:00 AM");
  await expect(source(page, "rideReliability")).toContainText("Live");
  await expect(source(page, "weatherForecast")).toContainText("Live");
  await expect(source(page, "weatherNormals")).toContainText("Included with this version");
  await page.goto("/plan");
  await expect(page.getByRole("note", { name: "Typical waits source" })).toHaveCount(0);
});

test("With Storage blocked, each live file says it's the deployed copy, and from when", async ({ page }) => {
  await fakeParkData(page, "blocked");
  await seedTrip(page);
  await page.goto("/play");
  await expect(source(page, "shows")).toContainText("Copy deployed with the Planner, from Oct 15, 6:00 AM (the live copy couldn't be loaded)");
  await expect(source(page, "waitTimeStats")).toContainText("Copy deployed with the Planner, from Oct 10, 4:00 AM");
  await expect(source(page, "weatherForecast")).toContainText("Copy deployed with the Planner, from Oct 12");
  await expect(source(page, "showtimeHistory")).toContainText("Couldn't be loaded");

  // and the pages that use them say so
  await page.goto("/plan");
  await expect(page.getByRole("note", { name: "Typical waits source" })).toHaveText("🕘 Typical waits from Oct 10, 4:00 AM (the latest couldn't be loaded)");
  await page.goto("/preview/heat-map");
  await expect(page.getByRole("note", { name: "Typical waits source" })).toContainText("from Oct 10");
});

test("When the stats can't be loaded at all, the Analytics pages say so (not 'check back tonight')", async ({ page }) => {
  await fakeParkData(page, "blocked");
  await page.route(/\/data\/(waitTimeStats|rideReliabilityStats)\.json/, (route) => route.fulfill({ status: 404, body: "" }));
  await seedTrip(page);
  await page.goto("/preview/heat-map");
  await expect(page.getByText("Wait time data couldn’t be loaded right now. Check your connection, or try again later.")).toBeVisible();
  await page.goto("/preview/reliability");
  await expect(page.getByText("Reliability data couldn’t be loaded right now. Check your connection, or try again later.")).toBeVisible();
  await page.goto("/plan");
  await expect(page.getByRole("note", { name: "Typical waits source" })).toHaveText("⚠️ Typical waits couldn't be loaded right now");
});

test("A fallback isn't saved for the day: the next load tries live again", async ({ page }) => {
  await fakeParkData(page, "blocked");
  await seedTrip(page);
  await page.goto("/play");
  await expect(source(page, "shows")).toContainText("Copy deployed");
  await expect(source(page, "waitTimeStats")).toContainText("Copy deployed");

  await page.unrouteAll({ behavior: "ignoreErrors" });
  await fakeParkData(page, "live");
  await page.reload();
  await expect(source(page, "shows")).toContainText("Live, updated");
  // the deployed stats were kept for an hour only, so they're still the deployed copy now…
  await expect(source(page, "waitTimeStats")).toContainText("Copy deployed");
  // …and live once that hour has passed
  await page.clock.setFixedTime(new Date("2026-10-15T11:05:00-07:00"));
  await page.reload();
  await expect(source(page, "waitTimeStats")).toContainText("Live, updated Oct 15");
});
