// ==================== CHECK HELPERS ====================
// A made-up test trip seeded into IndexedDB, faked park data (the deploy's
// /data/ copy and the live Storage files), and a fixed park time, so the
// checks give the same answer every day. Nothing here touches real data:
// each check runs in a fresh browser profile.

import fs from "node:fs";
import path from "node:path";
import type { Page, Route } from "@playwright/test";

const FIXTURES = path.join(__dirname, "fixtures");
export const TRIP_ID = "trip_test";
const NOW = 1_792_000_000_000;

/** Thursday 15 Oct 2026, 10 AM at the park, unless a check says otherwise. */
export const PARK_MORNING = new Date("2026-10-15T10:00:00-07:00");

const fixture = (name: string) => fs.readFileSync(path.join(FIXTURES, name), "utf8");

export const SEED = {
  trips: [{
    id: TRIP_ID, name: "Test Trip", startDate: "2026-10-14", endDate: "2026-10-17", isTemplate: false, phase: "plan",
    hotels: [{ id: "h1", name: "Test Hotel", checkIn: "2026-10-14", checkOut: "2026-10-17" }],
    createdAt: NOW, updatedAt: NOW,
  }],
  users: [{ id: "user_primary", name: "Alex", color: "#FFD700", role: "primary", createdAt: NOW, updatedAt: NOW }],
  wishes: [
    { id: "w_dapper", title: "The Dapper Dans", tags: ["shows"], priority: "B", parkDataId: "disneyland__dapper-dans", parkDataName: "The Dapper Dans", park: "Disneyland", land: "Main Street U.S.A.", createdAt: NOW, updatedAt: NOW, userId: "user_primary" },
    { id: "w_space", title: "Space Mountain", tags: ["rides"], priority: "E", parkDataId: "disneyland__space-mountain", parkDataName: "Space Mountain", park: "Disneyland", land: "Tomorrowland", createdAt: NOW, updatedAt: NOW, userId: "user_primary" },
  ],
  tripWishSelections: [
    { id: `${TRIP_ID}__w_dapper`, tripId: TRIP_ID, wishId: "w_dapper", completed: false, status: "planned", addedAt: NOW, updatedAt: NOW, userId: "user_primary" },
    { id: `${TRIP_ID}__w_space`, tripId: TRIP_ID, wishId: "w_space", completed: false, status: "planned", addedAt: NOW, updatedAt: NOW, userId: "user_primary" },
  ],
  dayItems: [
    { id: "di_space", tripId: TRIP_ID, userId: "user_primary", date: "2026-10-15", scheduledTime: "09:00", durationMinutes: 30, sortOrder: 0, title: "Space Mountain", itemType: "wish", park: "Disneyland", land: "Tomorrowland", priority: "E", sourceId: "w_space", parkDataId: "disneyland__space-mountain", completed: false, createdAt: NOW, updatedAt: NOW },
  ],
};

/** Opens the app with the test trip in its database and selected. */
export async function seedTrip(page: Page, data: Record<string, unknown[]> = SEED): Promise<void> {
  await page.goto("/");
  await page.waitForFunction(() => indexedDB.databases().then((dbs) => dbs.some((d) => d.name === "ParQwishPWA")));
  await page.evaluate(async (seed) => {
    const db = await new Promise<IDBDatabase>((res, rej) => { const r = indexedDB.open("ParQwishPWA"); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
    const stores = Object.keys(seed).filter((s) => db.objectStoreNames.contains(s));
    await new Promise<void>((res, rej) => {
      const tx = db.transaction(stores, "readwrite");
      for (const s of stores) { tx.objectStore(s).clear(); for (const rec of (seed as Record<string, unknown[]>)[s]) tx.objectStore(s).put(rec); }
      tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error);
    });
    db.close();
    localStorage.setItem("parqwish-store", JSON.stringify({ state: { currentTripId: "trip_test", currentUserId: "user_primary", themePreference: "dark", cloudSyncEnabled: false }, version: 0 }));
    localStorage.setItem("pwa-install-dismissed", "1");
  }, data);
  await page.reload();
}

type LiveMode = "live" | "blocked";

/**
 * Serves the fixtures instead of real park data: the deploy's copy at
 * /data/*.json and the live files on Storage. "blocked" makes every Storage
 * request fail (as when CORS refused this site), to check the fallbacks.
 */
export async function fakeParkData(page: Page, mode: LiveMode = "live"): Promise<void> {
  const deployed: Record<string, string> = {
    "rides.json": fixture("rides.json"), "shows.json": fixture("shows.json"), "restaurants.json": fixture("restaurants-deployed.json"),
    "shops.json": fixture("shops.json"), "places.json": fixture("places.json"),
    // The deploy's forecast is days older than the live one (and 5° cooler on the 15th), to tell them apart
    "weather/forecast.json": fixture("weather-forecast-deployed.json"), "weather/normals.json": fixture("weather-normals.json"),
    // Nightly stats: the deployed copies are from 10 Oct, the live ones from 15 Oct
    "waitTimeStats.json": fixture("waitTimeStats-deployed.json"), "rideReliabilityStats.json": fixture("rideReliabilityStats-deployed.json"),
  };
  await page.route(/\/data\/[\w/-]+\.json(\?.*)?$/, (route) => {
    const name = new URL(route.request().url()).pathname.replace(/^.*?\/data\//, "");
    return deployed[name] ? route.fulfill({ contentType: "application/json", body: deployed[name] }) : route.continue();
  });
  await page.route(/^https:\/\/storage\.googleapis\.com\//, (route) => (mode === "blocked" ? route.abort("failed") : serveLive(route)));
}

function serveLive(route: Route) {
  const file = new URL(route.request().url()).pathname.replace(/^\/[^/]+\/data\//, "");
  const hours = file.match(/^hours\/(\d{4}-\d{2}-\d{2})\.json$/);
  // weather/forecast.json → weather-forecast.json
  const name = hours ? `hours-${hours[1]}.json` : file.replace("/", "-");
  const body = fs.existsSync(path.join(FIXTURES, name)) ? fixture(name) : null;
  // Storage answers 403 for a file that doesn't exist
  return body ? route.fulfill({ contentType: "application/json", body }) : route.fulfill({ status: 403, body: "AccessDenied" });
}

/** Fixes the page's clock at a park time (Date only; timers still run). */
export async function atParkTime(page: Page, when: Date = PARK_MORNING): Promise<void> {
  await page.clock.setFixedTime(when);
}

/** Drags with real pointer events (dnd-kit needs movement past its 8 px threshold). */
export async function drag(page: Page, from: { x: number; y: number }, to: { x: number; y: number }): Promise<void> {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(from.x + 12, from.y + 4, { steps: 3 });
  await page.mouse.move(to.x, to.y, { steps: 15 });
  await page.mouse.up();
}

/** Every record in one of the app's IndexedDB stores, for checking what a change saved. */
export async function rows<T = Record<string, unknown>>(page: Page, store: string): Promise<T[]> {
  return page.evaluate(async (name) => {
    const db = await new Promise<IDBDatabase>((res, rej) => { const r = indexedDB.open("ParQwishPWA"); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
    const all = await new Promise<unknown[]>((res) => { const q = db.transaction(name).objectStore(name).getAll(); q.onsuccess = () => res(q.result); });
    db.close();
    return all;
  }, store) as Promise<T[]>;
}

/** A trip's day items as stored, for checking what a drop saved. */
export async function dayItems(page: Page): Promise<Array<{ title: string; date: string; scheduledTime?: string; durationMinutes?: number }>> {
  return rows(page, "dayItems");
}
