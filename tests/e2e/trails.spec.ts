// GPS trails keyed by account and person (src/lib/trail-ids.ts,
// src/lib/trail-people.ts): two collaborators recording the same day under
// "user_primary" are two trails, not one, and a collaborator's trail is
// named and coloured as theirs, never as one of our own Trip Users.
import { test, expect } from "@playwright/test";
import { seedTrip, SEED, TRIP_ID } from "./helpers";
import { isSameRecording, legacyTrailRowId, trailDocId, trailRowId } from "../../src/lib/trail-ids";
import { comparePeople, personKey, trailPerson, trailsForFilter, usesPersonColors } from "../../src/lib/trail-people";
import type { TripTrail, User } from "../../src/lib/db";

const ME = "uid-me";
const FRIEND = "uid-friend";
const DATE = "2026-10-15";

function trail(authorUid: string | undefined, userId: string, start: number, lng = -117.919): TripTrail {
  const points = Array.from({ length: 6 }, (_, i) => ({
    latitude: 33.811 + i * 0.0004, longitude: lng + i * 0.0003, timestamp: start + i * 60_000, accuracy: 10,
  }));
  return {
    id: trailRowId(TRIP_ID, DATE, userId, authorUid), tripId: TRIP_ID, userId, authorUid, date: DATE,
    resolution: "high", points, distanceMiles: 0.2, durationMinutes: 5, pointCount: points.length, importedAt: 1,
  };
}

const users: User[] = [
  { id: "user_primary", name: "Mom", color: "#FFD700", isOwner: true } as User,
  { id: "user_guest_1", name: "Sam", color: "#87CEEB" } as User,
];
const byId = new Map(users.map((u) => [u.id, u]));
const members = { [FRIEND]: { role: "editor", displayName: "Riley", joinedAt: "2026-10-01" } } as never;

test.describe("trail ids", () => {
  test("synced trails are keyed by account; older ones keep the two-part id", () => {
    expect(trailDocId(DATE, "user_primary", ME)).toBe(`${DATE}__${ME}__user_primary`);
    expect(trailDocId(DATE, "user_primary")).toBe(`${DATE}__user_primary`);
    expect(trailRowId(TRIP_ID, DATE, "user_primary", FRIEND)).toBe(`${TRIP_ID}__${DATE}__${FRIEND}__user_primary`);
    expect(legacyTrailRowId(TRIP_ID, DATE, "user_primary")).toBe(`${TRIP_ID}__${DATE}__user_primary`);
    // The same Trip User on two accounts no longer shares an id
    expect(trail(ME, "user_primary", 1).id).not.toBe(trail(FRIEND, "user_primary", 1).id);
  });

  test("an older copy is the same recording only when it starts at the same point", () => {
    const a = trail(ME, "user_primary", 1000);
    expect(isSameRecording({ ...a, points: a.points.slice(0, 3) }, a)).toBe(true);
    expect(isSameRecording(trail(FRIEND, "user_primary", 2000), a)).toBe(false);
    expect(isSameRecording(trail(ME, "user_guest_1", 1000), a)).toBe(false);
  });
});

test.describe("trail people", () => {
  const mine = trail(ME, "user_primary", 1000);
  const sams = trail(ME, "user_guest_1", 1000);
  const friends = trail(FRIEND, "user_primary", 1000);

  test("a collaborator's trail is theirs, not our Trip User with the same id", () => {
    const viewer = { myUid: ME, members };
    expect(trailPerson(mine, byId, viewer)).toMatchObject({ name: "Mom", color: "#FFD700", mine: true });
    expect(trailPerson(friends, byId, viewer)).toMatchObject({ name: "Riley", mine: false });
    expect(trailPerson(friends, byId, viewer).color).not.toBe("#FFD700");
    expect(personKey(mine, ME)).not.toBe(personKey(friends, ME));
  });

  test("two accounts' user_primary are two people for colours and order", () => {
    expect(usesPersonColors([mine, friends], ME)).toBe(true);
    expect(usesPersonColors([mine], ME)).toBe(false);
    const people = [trailPerson(friends, byId, { myUid: ME, members }), trailPerson(sams, byId, { myUid: ME }), trailPerson(mine, byId, { myUid: ME })]
      .sort(comparePeople).map((p) => p.name);
    expect(people).toEqual(["Mom", "Sam", "Riley"]);
  });

  test("the Trip User filter names our people; collaborators show with everyone", () => {
    expect(trailsForFilter([mine, sams, friends], ["user_primary"], ME)).toEqual([mine]);
    expect(trailsForFilter([mine, sams, friends], null, ME)).toHaveLength(3);
  });

  test("a trail with no account (file import) or a signed-out viewer counts as ours", () => {
    const imported = { ...mine, authorUid: undefined };
    expect(trailPerson(imported, byId, { myUid: ME })).toMatchObject({ name: "Mom", mine: true });
    expect(trailPerson(friends, byId, {})).toMatchObject({ name: "Mom", mine: true });
  });
});

test("two accounts' trails on the same day are both kept and shown", async ({ page }) => {
  await seedTrip(page, { ...SEED, trails: [trail(ME, "user_primary", Date.parse(`${DATE}T17:00:00Z`)), trail(FRIEND, "user_primary", Date.parse(`${DATE}T18:00:00Z`), -117.921)] });
  await page.goto("/publish");
  // One card per trail: before account keys, the second would have replaced the first
  await expect(page.locator("button", { hasText: "Thursday, Oct 15" })).toHaveCount(2);
  const stored = await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((res, rej) => { const r = indexedDB.open("ParQwishPWA"); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
    const all = await new Promise<Array<{ id: string }>>((res) => { const q = db.transaction("trails").objectStore("trails").getAll(); q.onsuccess = () => res(q.result); });
    db.close();
    return all.map((t) => t.id).sort();
  });
  expect(stored).toEqual([`${TRIP_ID}__${DATE}__${FRIEND}__user_primary`, `${TRIP_ID}__${DATE}__${ME}__user_primary`]);
});
