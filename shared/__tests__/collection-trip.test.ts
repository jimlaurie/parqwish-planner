import { collectionAddedOnTrip, gotOnTrip, tripRecapLine } from "../collection-trip";
import type { CollectionItem } from "../types/collection";

const T = 1_700_000_000_000;
const TRIP = { id: "trip_1", startDate: "2026-10-14", endDate: "2026-10-17" };
const item = (id: string, extra: Partial<CollectionItem> = {}): CollectionItem =>
  ({ id, name: id, category: "pins", state: "have", createdAt: T, updatedAt: T, ...extra });

describe("gotOnTrip", () => {
  it("counts an item that names the trip, whatever its date", () => {
    expect(gotOnTrip(item("a", { acquired: { tripId: "trip_1", date: "2026-12-01" } }), TRIP)).toBe(true);
    expect(gotOnTrip(item("b", { acquired: { tripId: "trip_2", date: "2026-10-15" } }), TRIP)).toBe(false);
  });

  it("counts an item with no trip by its date, inclusive of both ends", () => {
    expect(gotOnTrip(item("c", { acquired: { date: "2026-10-14" } }), TRIP)).toBe(true);
    expect(gotOnTrip(item("d", { acquired: { date: "2026-10-17" } }), TRIP)).toBe(true);
    expect(gotOnTrip(item("e", { acquired: { date: "2026-10-18" } }), TRIP)).toBe(false);
    expect(gotOnTrip(item("f", { acquired: { how: "gift" } }), TRIP)).toBe(false);
    expect(gotOnTrip(item("g"), TRIP)).toBe(false);
  });

  it("never counts a Want, and still counts one traded away since", () => {
    expect(gotOnTrip(item("h", { state: "want", acquired: { tripId: "trip_1" } }), TRIP)).toBe(false);
    expect(gotOnTrip(item("i", { state: "gone", acquired: { tripId: "trip_1" } }), TRIP)).toBe(true);
  });
});

describe("collectionAddedOnTrip", () => {
  it("lists them by the day they came, then by name, undated last", () => {
    const list = collectionAddedOnTrip([
      item("Stitch", { acquired: { tripId: "trip_1" } }),
      item("Figment", { acquired: { date: "2026-10-16" } }),
      item("Ariel", { acquired: { tripId: "trip_1", date: "2026-10-16" } }),
      item("Dumbo", { acquired: { date: "2026-10-14" } }),
      item("Other", { acquired: { date: "2026-11-01" } }),
    ], TRIP);
    expect(list.map((i) => i.id)).toEqual(["Dumbo", "Ariel", "Figment", "Stitch"]);
  });
});

describe("tripRecapLine", () => {
  it("says how and when it came", () => {
    expect(tripRecapLine(item("a", { acquired: { how: "traded", date: "2026-10-14" } }))).toBe("Traded · Wed, Oct 14");
    expect(tripRecapLine(item("b", { acquired: { how: "bought" } }))).toBe("Bought");
    expect(tripRecapLine(item("c", { acquired: { date: "2026-10-15" } }))).toBe("Thu, Oct 15");
    expect(tripRecapLine(item("d"))).toBe("");
  });
});
