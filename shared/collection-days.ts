// ==================== COLLECTION DAYS ====================
// Wants and Trades on a park day (docs/collections-design.md §14): + Day puts
// the item itself on a day, as Shopping's + Day does, and the day's list (Pal's
// Home, the Planner's Preview) shows it under Collection: "Look for" a Want,
// "Bring to trade" a Trade. Ticking it there is Got it (a Want becomes Have,
// with how and when) or Traded it (a Trade loses one from its count, or
// becomes Gone). The tick remembers what it changed (`dayTicks`), so unticking
// puts back only what it wrote and leaves anything typed since alone.
// Pure: the clock and the trip come from the caller.

import type {
  CollectionAcquiredHow,
  CollectionDayTick,
  CollectionDayTickParts,
  CollectionGoneHow,
  CollectionItem,
} from "./types/collection";

/** Why an item is on a day's list. */
export type CollectionDayRole = "look" | "bring";

export const COLLECTION_DAY_ROLE_LABELS: Record<CollectionDayRole, string> = {
  look: "Look for",
  bring: "Bring to trade",
};

/** The choices for Got it on a Want. */
export const COLLECTION_GOT_IT_HOW: { value: CollectionAcquiredHow; label: string }[] = [
  { value: "bought", label: "Bought" }, { value: "traded", label: "Traded" },
  { value: "gift", label: "Gift" }, { value: "found", label: "Found" },
];

/** The choices for Traded it on a Trade. */
export const COLLECTION_TRADED_IT_HOW: { value: CollectionGoneHow; label: string }[] = [
  { value: "traded", label: "Traded" }, { value: "sold", label: "Sold" }, { value: "gift", label: "Gave away" },
];

// ==================== PUTTING ITEMS ON DAYS ====================

/** + Day is offered on Wants and Trades. */
export function canPlanCollectionDay(item: Pick<CollectionItem, "state">): boolean {
  return item.state === "want" || item.state === "trade";
}

export function isOnCollectionDay(item: Pick<CollectionItem, "days">, date: string): boolean {
  return !!item.days?.includes(date);
}

/** The item with `date` added to its days, or taken off. A tick on that day stays, as history. */
export function toggleCollectionDay(item: CollectionItem, date: string, now: number): CollectionItem {
  const days = new Set(item.days ?? []);
  if (days.has(date)) days.delete(date);
  else days.add(date);
  const sorted = [...days].sort();
  return { ...item, days: sorted.length ? sorted : undefined, updatedAt: now };
}

/** The item with exactly these days (the editor's Days row). */
export function setCollectionDays(item: CollectionItem, dates: string[], now: number): CollectionItem {
  const sorted = [...new Set(dates)].sort();
  const same = sorted.join() === (item.days ?? []).join();
  if (same) return item;
  return { ...item, days: sorted.length ? sorted : undefined, updatedAt: now };
}

/**
 * The dates the editor's Days row offers: the trip's, else the picked date,
 * plus any the item is already on (so they can be taken off).
 */
export function collectionDayChoices(tripDates: string[], picked: string | null | undefined, current: string[] | undefined): string[] {
  const base = tripDates.length ? tripDates : picked ? [picked] : [];
  return [...new Set([...base, ...(current ?? [])])].sort();
}

/** A day chip's label, e.g. "Thu, Dec 3" (the date is a calendar day, so read at noon UTC). */
export function collectionDayLabel(ymd: string): string {
  const d = new Date(`${ymd}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return ymd;
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
}

// ==================== A DAY'S LIST ====================

/** The items on `date`, Wants first (by ticket, E first), then Trades, then by name. */
export function collectionItemsForDay<T extends CollectionItem>(items: T[], date: string): T[] {
  const rank = (i: CollectionItem) => (collectionDayRole(i, date) === "look" ? 0 : 1);
  const ticket = (i: CollectionItem) => (i.priority ? "EDCBA".indexOf(i.priority) : 9);
  return items
    .filter((i) => isOnCollectionDay(i, date))
    .sort((a, b) => rank(a) - rank(b) || ticket(a) - ticket(b) || (a.name || "").localeCompare(b.name || ""));
}

/** Look for (a Want, or one got on this day) or Bring to trade (a Trade, or one traded on it). */
export function collectionDayRole(item: CollectionItem, date: string): CollectionDayRole {
  const tick = item.dayTicks?.[date];
  if (tick) return tick.from === "want" ? "look" : "bring";
  return item.state === "trade" || item.state === "gone" ? "bring" : "look";
}

/** Ticked on this day, or no longer a Want or Trade (changed in the collection itself). */
export function isCollectionDayDone(item: CollectionItem, date: string): boolean {
  return !!item.dayTicks?.[date] || !canPlanCollectionDay(item);
}

/** The line under the item's name on the day's list. */
export function collectionDayLine(item: CollectionItem, date: string): string {
  const tick = item.dayTicks?.[date];
  if (tick) return tickedLine(tick, item);
  const role = COLLECTION_DAY_ROLE_LABELS[collectionDayRole(item, date)];
  if (item.state === "want") return role;
  if (item.state === "trade") {
    const extras = [(item.quantity ?? 1) > 1 ? `×${item.quantity}` : "", item.forSale ? "for sale" : ""].filter(Boolean);
    return [role, ...extras].join(" · ");
  }
  return item.state === "have" ? "In your collection" : "No longer in your collection";
}

function tickedLine(tick: CollectionDayTick, item: CollectionItem): string {
  if (tick.from === "want") {
    const how = COLLECTION_GOT_IT_HOW.find((h) => h.value === tick.how)?.label ?? "Got it";
    return `Got it · ${how}`;
  }
  const how = COLLECTION_TRADED_IT_HOW.find((h) => h.value === tick.how)?.label ?? "Traded";
  if (tick.after.state === "trade") return `${how} one · ${item.quantity ?? 1} left`;
  return how;
}

// ==================== TICKING ====================

function partsOf(item: CollectionItem): CollectionDayTickParts {
  return { state: item.state, quantity: item.quantity, acquired: item.acquired, gone: item.gone };
}

/** The parts a Got it or Traded it writes. */
function tickedParts(item: CollectionItem, date: string, how: CollectionAcquiredHow | CollectionGoneHow, tripId?: string): CollectionDayTickParts {
  if (item.state === "want") {
    const acquired = { ...item.acquired, date, how: how as CollectionAcquiredHow, ...(tripId ? { tripId } : {}) };
    return { state: "have", quantity: item.quantity, acquired, gone: item.gone };
  }
  const count = item.quantity ?? 1;
  if (count > 1) return { state: "trade", quantity: count - 1, acquired: item.acquired, gone: item.gone };
  return { state: "gone", quantity: item.quantity, acquired: item.acquired, gone: { date, how: how as CollectionGoneHow } };
}

/**
 * Got it on a Want (`how`: bought, traded, gift, found), filling in "How I got
 * it" with the day and the trip; or Traded it on a Trade (`how`: traded, sold,
 * gift), taking one off a count above one, else making it Gone. Unchanged if
 * it isn't a Want or Trade, or is already ticked on that day.
 */
export function tickCollectionDay(
  item: CollectionItem, date: string, how: CollectionAcquiredHow | CollectionGoneHow,
  context: { now: number; tripId?: string },
): CollectionItem {
  if (!canPlanCollectionDay(item) || item.dayTicks?.[date]) return item;
  const before = partsOf(item);
  const after = tickedParts(item, date, how, context.tripId);
  const tick: CollectionDayTick = { from: item.state as "want" | "trade", how, at: context.now, before, after };
  return withParts({ ...item, dayTicks: { ...item.dayTicks, [date]: tick }, updatedAt: context.now }, after);
}

/**
 * Undo the day's tick: each part goes back to what it was, but only while it
 * still reads what the tick wrote (a price or note typed since stays).
 * Unchanged if there's no tick on that day.
 */
export function untickCollectionDay(item: CollectionItem, date: string, now: number): CollectionItem {
  const tick = item.dayTicks?.[date];
  if (!tick) return item;
  const rest = { ...item.dayTicks };
  delete rest[date];
  const restored: CollectionDayTickParts = {
    state: same(item.state, tick.after.state) ? tick.before.state : item.state,
    quantity: same(item.quantity, tick.after.quantity) ? tick.before.quantity : item.quantity,
    acquired: same(item.acquired, tick.after.acquired) ? tick.before.acquired : item.acquired,
    gone: same(item.gone, tick.after.gone) ? tick.before.gone : item.gone,
  };
  return withParts({ ...item, dayTicks: Object.keys(rest).length ? rest : undefined, updatedAt: now }, restored);
}

function withParts(item: CollectionItem, parts: CollectionDayTickParts): CollectionItem {
  const out: CollectionItem = { ...item, state: parts.state, quantity: parts.quantity, acquired: parts.acquired, gone: parts.gone };
  for (const key of ["quantity", "acquired", "gone", "dayTicks", "days"] as const) {
    if (out[key] === undefined) delete out[key];
  }
  return out;
}

/** Equal as stored (JSON drops undefined keys, as Firestore and AsyncStorage do). */
function same(a: unknown, b: unknown): boolean {
  return JSON.stringify(sortKeys(a)) === JSON.stringify(sortKeys(b));
}

function sortKeys(value: unknown): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  return Object.fromEntries(Object.keys(value as object).sort()
    .filter((k) => (value as Record<string, unknown>)[k] !== undefined)
    .map((k) => [k, sortKeys((value as Record<string, unknown>)[k])]));
}
