// Wants and Trades on a park day: + Day, the day's list, and the Got it /
// Traded it ticks and their undo (docs/collections-design.md §14).
import {
  canPlanCollectionDay, collectionDayChoices, collectionDayLabel, collectionDayLine, collectionDayRole, collectionItemsForDay, isCollectionDayDone,
  isOnCollectionDay, setCollectionDays, tickCollectionDay, toggleCollectionDay, untickCollectionDay,
} from "../collection-days";
import type { CollectionItem } from "../types/collection";

const T = 1_700_000_000_000;
const DAY = "2026-12-03";
const item = (id: string, extra: Partial<CollectionItem> = {}): CollectionItem =>
  ({ id, name: id, category: "pins", state: "want", createdAt: T, updatedAt: T, ...extra });

describe("+ Day", () => {
  it("is offered on Wants and Trades only", () => {
    expect(["want", "trade", "have", "gone"].map((state) => canPlanCollectionDay({ state } as CollectionItem)))
      .toEqual([true, true, false, false]);
  });

  it("adds the day in order, and takes it off again", () => {
    const on = toggleCollectionDay(item("a", { days: ["2026-12-04"] }), DAY, T + 1);
    expect(on.days).toEqual([DAY, "2026-12-04"]);
    expect(on.updatedAt).toBe(T + 1);
    expect(isOnCollectionDay(on, DAY)).toBe(true);
    const off = toggleCollectionDay(toggleCollectionDay(item("b"), DAY, T + 1), DAY, T + 2);
    expect(off.days).toBeUndefined();
  });

  it("sets the editor's days, leaving the item alone when they're the same", () => {
    const a = item("a", { days: [DAY] });
    expect(setCollectionDays(a, [DAY], T + 5)).toBe(a);
    expect(setCollectionDays(a, ["2026-12-05", DAY, DAY], T + 5).days).toEqual([DAY, "2026-12-05"]);
    expect(setCollectionDays(a, [], T + 5).days).toBeUndefined();
  });
});

describe("the editor's Days row", () => {
  it("offers the trip's dates, else the picked one, and any the item is on", () => {
    expect(collectionDayChoices(["2026-12-02", DAY], "2026-12-09", ["2026-11-20"])).toEqual(["2026-11-20", "2026-12-02", DAY]);
    expect(collectionDayChoices([], DAY, undefined)).toEqual([DAY]);
    expect(collectionDayChoices([], null, undefined)).toEqual([]);
  });

  it("names each day", () => {
    expect(collectionDayLabel(DAY)).toBe("Thu, Dec 3");
  });
});

describe("a day's list", () => {
  it("holds the day's items: Wants by ticket (E first), then Trades, then by name", () => {
    const items = [
      item("trader", { state: "trade", days: [DAY] }),
      item("a-want", { priority: "A", days: [DAY] }),
      item("grail", { priority: "E", days: [DAY] }),
      item("elsewhere", { days: ["2026-12-04"] }),
    ];
    expect(collectionItemsForDay(items, DAY).map((i) => i.id)).toEqual(["grail", "a-want", "trader"]);
  });

  it("says why each is there", () => {
    expect(collectionDayLine(item("w", { days: [DAY] }), DAY)).toBe("Look for");
    expect(collectionDayLine(item("t", { state: "trade", quantity: 3, forSale: true }), DAY)).toBe("Bring to trade · ×3 · for sale");
    expect(collectionDayRole(item("t", { state: "trade" }), DAY)).toBe("bring");
  });

  it("counts an item changed to Have in the collection itself as done", () => {
    expect(isCollectionDayDone(item("h", { state: "have", days: [DAY] }), DAY)).toBe(true);
    expect(collectionDayLine(item("h", { state: "have" }), DAY)).toBe("In your collection");
  });
});

describe("Got it", () => {
  it("makes a Want Have, with the day, how and the trip", () => {
    const got = tickCollectionDay(item("w", { days: [DAY], acquired: { pricePaid: "$5" } }), DAY, "traded", { now: T + 9, tripId: "trip1" });
    expect(got.state).toBe("have");
    expect(got.acquired).toEqual({ pricePaid: "$5", date: DAY, how: "traded", tripId: "trip1" });
    expect(isCollectionDayDone(got, DAY)).toBe(true);
    expect(collectionDayRole(got, DAY)).toBe("look");
    expect(collectionDayLine(got, DAY)).toBe("Got it · Traded");
  });

  it("is undone by unticking: back to a Want, with How I got it as before", () => {
    const before = item("w", { days: [DAY], priority: "C", acquired: { pricePaid: "$5" } });
    const undone = untickCollectionDay(tickCollectionDay(before, DAY, "bought", { now: T + 9 }), DAY, T + 10);
    expect(undone).toEqual({ ...before, updatedAt: T + 10 });
  });

  it("keeps what was typed since when it's unticked", () => {
    const got = tickCollectionDay(item("w", { days: [DAY] }), DAY, "bought", { now: T + 9 });
    const priced = { ...got, acquired: { ...got.acquired, pricePaid: "$20" } };
    const undone = untickCollectionDay(priced, DAY, T + 10);
    expect(undone.state).toBe("want");
    expect(undone.acquired).toEqual(priced.acquired);
  });

  it("does nothing to a Have, or twice on one day", () => {
    const have = item("h", { state: "have" });
    expect(tickCollectionDay(have, DAY, "bought", { now: T })).toBe(have);
    const got = tickCollectionDay(item("w"), DAY, "bought", { now: T + 1 });
    expect(tickCollectionDay(got, DAY, "found", { now: T + 2 })).toBe(got);
  });
});

describe("Traded it", () => {
  it("takes one off a count above one, staying a Trade", () => {
    const traded = tickCollectionDay(item("t", { state: "trade", quantity: 3 }), DAY, "traded", { now: T + 1 });
    expect(traded.state).toBe("trade");
    expect(traded.quantity).toBe(2);
    expect(collectionDayLine(traded, DAY)).toBe("Traded one · 2 left");
    expect(untickCollectionDay(traded, DAY, T + 2).quantity).toBe(3);
  });

  it("makes the last one Gone, with the day and how, and unticking brings it back", () => {
    const before = item("t", { state: "trade", forSale: true });
    const sold = tickCollectionDay(before, DAY, "sold", { now: T + 1 });
    expect(sold.state).toBe("gone");
    expect(sold.gone).toEqual({ date: DAY, how: "sold" });
    expect(collectionDayLine(sold, DAY)).toBe("Sold");
    expect(untickCollectionDay(sold, DAY, T + 2)).toEqual({ ...before, updatedAt: T + 2 });
  });

  it("leaves a state changed since alone when unticked", () => {
    const sold = tickCollectionDay(item("t", { state: "trade" }), DAY, "sold", { now: T + 1 });
    const moved = { ...sold, state: "have" as const };
    expect(untickCollectionDay(moved, DAY, T + 2).state).toBe("have");
  });

  it("survives a trip through JSON, as storage and sync keep it", () => {
    const traded = tickCollectionDay(item("t", { state: "trade", quantity: 2 }), DAY, "traded", { now: T + 1 });
    const stored = JSON.parse(JSON.stringify(traded)) as CollectionItem;
    expect(untickCollectionDay(stored, DAY, T + 2).quantity).toBe(2);
  });
});
