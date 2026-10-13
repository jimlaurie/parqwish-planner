// ==================== TRIP TEMPLATES ====================
// What a template carries from a trip, and how a template becomes a new
// trip. A template keeps the reusable parts of a trip (wishes, packing,
// where you stay and how you get around, notes) and drops what belongs to
// one particular trip (dates, confirmation numbers, progress, the day-by-day
// schedule, photos, trails, collaborators). Pure functions; use-trips.ts
// does the database and Cloud Sync work.

import type { Trip, TripWishSelection, TripPackingSelection } from "@/lib/db";
import { isLocalOwner, DEFAULT_TRIP_USER_ID } from "@shared/selection-owners";
import type { SelectionOwner } from "@shared/types/wish";

/** The reusable content of a trip: travel details without dates or confirmations, notes, resorts. */
export function templateContentFrom(trip: Trip): Partial<Trip> {
  const content: Partial<Trip> = {};
  if (trip.resortIds) content.resortIds = [...trip.resortIds];
  if (trip.flights?.length) {
    content.flights = trip.flights.map(({ airline, flightNumber, from, to, notes }) => ({ airline, flightNumber, from, to, notes }));
  }
  if (trip.hotels?.length) content.hotels = trip.hotels.map(({ name, notes }) => ({ name, notes }));
  if (trip.transports?.length) content.transports = trip.transports.map(({ type, details, notes }) => ({ type, details, notes }));
  if (trip.notes) content.notes = trip.notes;
  return content;
}

/**
 * A new trip or template record holding `content`, with nothing from any
 * other trip's identity. A template's hotels carry no dates, so on a new
 * trip they're booked for the trip's own dates.
 */
export function newTripRecord(
  base: { id: string; name: string; startDate: string; endDate: string; isTemplate: boolean; now: number },
  content: Partial<Trip>,
): Trip {
  const hotels = !base.isTemplate && content.hotels
    ? content.hotels.map((h) => ({ ...h, checkIn: h.checkIn || base.startDate, checkOut: h.checkOut || base.endDate }))
    : content.hotels;
  return {
    ...content,
    ...(hotels ? { hotels } : {}),
    id: base.id,
    name: base.name,
    startDate: base.isTemplate ? "" : base.startDate,
    endDate: base.isTemplate ? "" : base.endDate,
    isTemplate: base.isTemplate,
    phase: "plan",
    createdAt: base.now,
    updatedAt: base.now,
  };
}

/**
 * The people a copied selection belongs to: this account's Trip Users only
 * (a collaborator's wish on a shared trip isn't yours to reuse), with their
 * account stamp cleared so the next push stamps it fresh. Falls back to the
 * primary user.
 */
export function copiedOwners(owners: SelectionOwner[] | undefined, userId: string | undefined, myUid?: string): SelectionOwner[] {
  const source = owners?.length ? owners : [{ userId: userId ?? DEFAULT_TRIP_USER_ID }];
  const local = source.filter((o) => isLocalOwner(o, myUid)).map((o) => ({ userId: o.userId }));
  return local.length ? local : [{ userId: DEFAULT_TRIP_USER_ID }];
}

/** Copies wish selections onto another trip, as fresh ideas (not done, not scheduled). */
export function copyWishSelections(sels: TripWishSelection[], tripId: string, now: number, myUid?: string): TripWishSelection[] {
  return sels.map((s) => {
    const owners = copiedOwners(s.owners, s.userId, myUid);
    const copy: TripWishSelection = {
      id: `${tripId}__${s.wishId}`,
      tripId,
      wishId: s.wishId,
      completed: false,
      status: "idea",
      addedAt: now,
      updatedAt: now,
      userId: owners[0].userId,
      owners,
    };
    if (s.maxWait !== undefined) copy.maxWait = s.maxWait;
    if (s.travelTime !== undefined) copy.travelTime = s.travelTime;
    return copy;
  });
}

/** Copies packing selections onto another trip, all unpacked. */
export function copyPackingSelections(sels: TripPackingSelection[], tripId: string, now: number, myUid?: string): TripPackingSelection[] {
  return sels.map((s) => {
    const owners = copiedOwners(s.owners, s.userId, myUid);
    return {
      id: `${tripId}__${s.itemId}`,
      tripId,
      itemId: s.itemId,
      completed: false,
      addedAt: now,
      updatedAt: now,
      userId: owners[0].userId,
      owners,
    };
  });
}

/** The default template's id, if one is starred. */
export function defaultTemplateId(templates: Pick<Trip, "id" | "isDefaultTemplate">[]): string | null {
  return templates.find((t) => t.isDefaultTemplate)?.id ?? null;
}
