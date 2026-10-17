// Park data caches are keyed to the build's version; older keys are removed at start-up.
import { test, expect } from "@playwright/test";
import pkg from "../../package.json" with { type: "json" };
import { seedTrip, fakeParkData } from "./helpers";

test("Earlier builds' and hand-versioned cache keys are removed; this build's stay", async ({ page }) => {
  await fakeParkData(page);
  await page.addInitScript(() => {
    if (sessionStorage.getItem("planted")) return;
    sessionStorage.setItem("planted", "1");
    for (const k of ["dland-park-data-cache-v6", "dland-wait-time-stats-cache-v3", "dland-park-hours-cache@0.0.1"]) localStorage.setItem(k, "{}");
  });
  await seedTrip(page);
  await page.goto("/plan");
  await expect.poll(() => page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith("dland-")).sort()))
    .toEqual(expect.arrayContaining([`dland-park-data-cache@${pkg.version}`]));
  const keys = await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith("dland-")));
  expect(keys.filter((k) => !k.endsWith(`@${pkg.version}`))).toEqual([]);
});
