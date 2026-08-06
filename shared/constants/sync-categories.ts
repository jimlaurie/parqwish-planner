// ==================== SYNC CATEGORY METADATA ====================

import type { SyncCategory, SyncPayload } from "../types/sync";

export interface CategoryMeta {
  label: string;
  icon: string;
  storageKey: string;
  dataType: "array" | "object";
  payloadKey: keyof SyncPayload;
}

// Lightning Lanes and Photo Spots ("places") were previously listed here as
// selectable categories but never actually exported (their payloadKey pointed
// at "rides", and neither platform ever populated it for them — a confirmed
// bug, not a design). Removed rather than fixed at the time: both are still
// captured day-of by the "day_items" category, since every Lightning Lane
// booking and Place add calls syncScheduledDayItem (RidesScreen.tsx,
// QuickAddPlaceModal.tsx, DiningEventsScreen.tsx) — that part hasn't changed.
//
// "places" is re-added below with a real, working payloadKey. This is not a
// repeat of the same bug: rides/shows/dining/wishes each sync as *two*
// things — a durable catalog record (db.wishes/db.packingItems, reusable
// across days) *and* a day_items snapshot when scheduled. Places only ever
// had the day_items half; this closes that gap for the catalog half, without
// touching how day_items itself works. Lightning Lanes remain day_items-only
// — there's no reusable "catalog" concept for a same-day booking the way
// there is for a place someone might revisit or reference across days.
export const CATEGORY_META: Record<SyncCategory, CategoryMeta> = {
  rides: { label: "Rides", icon: "🎢", storageKey: "ridePreferencesByDate", dataType: "object", payloadKey: "rides" },
  shows: { label: "Shows", icon: "🎭", storageKey: "scheduledShows", dataType: "array", payloadKey: "shows" },
  dining: { label: "Dining", icon: "🍽️", storageKey: "scheduledDining", dataType: "array", payloadKey: "dining" },
  outfits: { label: "Outfits", icon: "👗", storageKey: "outfitsByDate", dataType: "array", payloadKey: "outfits" },
  equipment: { label: "Equipment", icon: "🎒", storageKey: "equipmentByDate", dataType: "array", payloadKey: "equipment" },
  sundries: { label: "Sundries", icon: "🧴", storageKey: "sundriesByDate", dataType: "array", payloadKey: "sundries" },
  shopping: { label: "Shopping", icon: "🛍️", storageKey: "shoppingItemsByDate", dataType: "array", payloadKey: "shopping" },
  wishes: { label: "Wishes", icon: "⭐", storageKey: "wishesByDate", dataType: "array", payloadKey: "wishes" },
  places: { label: "Places", icon: "📍", storageKey: "photoSpotsByDate", dataType: "array", payloadKey: "places" },
  trail: { label: "GPS Trail", icon: "📍", storageKey: "geoTrailByDate", dataType: "array", payloadKey: "trails" },
  scheduled_events: { label: "Schedule (legacy)", icon: "🗓️", storageKey: "scheduledEventsByDate", dataType: "array", payloadKey: "scheduledEvents" },
  day_items: { label: "Day Plan", icon: "📅", storageKey: "dayItemsByDate", dataType: "object", payloadKey: "dayItems" },
};

export const ALL_CATEGORIES: SyncCategory[] = Object.keys(CATEGORY_META) as SyncCategory[];
