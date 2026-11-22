// ==================== COLLECTION ITEMS GOT ON A TRIP (pure) ====================
// Publish's "Added to your collection on this trip" (docs/collections-design.md
// §6): items whose "How I got it" names the trip (a Got it tick on a trip day
// sets it, as does Add to collection from a bought shopping item), or, for an
// item that names no trip, whose date falls within the trip's dates. A Want
// hasn't been got yet, so it never counts. No I/O.

import { COLLECTION_ACQUIRED_HOW } from "./collection-editor";
import type { CollectionItem } from "./types/collection";

export interface TripSpan { id: string; startDate: string; endDate: string }

/** Whether the item came on this trip. */
export function gotOnTrip(item: CollectionItem, trip: TripSpan): boolean {
  if (item.state === "want" || !item.acquired) return false;
  const { tripId, date } = item.acquired;
  if (tripId) return tripId === trip.id;
  return !!date && date >= trip.startDate && date <= trip.endDate;
}

/** The items got on the trip, by the day they came (undated last), then by name. */
export function collectionAddedOnTrip(items: CollectionItem[], trip: TripSpan): CollectionItem[] {
  return items.filter((i) => gotOnTrip(i, trip)).sort((a, b) =>
    (a.acquired?.date ?? "9999").localeCompare(b.acquired?.date ?? "9999")
      || (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base" }));
}

/** "Traded · Wed, Oct 14", "Bought", or "" when neither is known. */
export function tripRecapLine(item: CollectionItem): string {
  const how = COLLECTION_ACQUIRED_HOW.find((h) => h.value === item.acquired?.how)?.label;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(item.acquired?.date ?? "");
  const when = m
    ? new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12))
      .toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" })
    : "";
  return [how, when].filter(Boolean).join(" · ");
}
