// ==================== COLLECTION OWNERS ====================
// Whose a collection item is (docs/collections-design.md §13). An account's
// collection is one shelf shared by its Trip Users: each item's `userId` is
// the Trip User who owns it, or "shared" for a thing the household owns
// together. An item with no userId (made before owners could be chosen, or
// when no Trip User was active) is the primary user's, as the Planner treats
// other records without one. Collaborators on other accounts never see a
// collection: it lives under the account (users/{uid}), not in shared trips.
//
// The view shows everything by default ("Everyone"), and a filter by person
// once the items have two or more owners. A person's filter shows their items
// and the shared ones.

import type { CollectionItem } from "./types/collection";

/** The owner of a thing the household owns together. */
export const COLLECTION_SHARED_OWNER = "shared";
/** The filter that shows every item. */
export const COLLECTION_EVERYONE = "everyone";
const PRIMARY_TRIP_USER = "user_primary";

/** A Trip User as the collection shows them. */
export interface CollectionTripUser {
  id: string;
  name: string;
  color: string;
}

/** One choice in the person filter: Everyone, a Trip User, or Shared. */
export interface CollectionOwnerChip {
  /** COLLECTION_EVERYONE, a Trip User id, or COLLECTION_SHARED_OWNER. */
  id: string;
  label: string;
  /** The Trip User's colour (none for Everyone and Shared). */
  color?: string;
  /** Items this chip shows. */
  count: number;
}

/** The item's owner: a Trip User id, or COLLECTION_SHARED_OWNER. */
export function collectionOwnerOf(item: Pick<CollectionItem, "userId">): string {
  return item.userId || PRIMARY_TRIP_USER;
}

/** Trip Users in the order both apps list them: the primary user, then guests by number. */
export function orderCollectionTripUsers<U extends { id: string }>(users: U[]): U[] {
  const rank = (id: string) => (id === PRIMARY_TRIP_USER ? -1 : Number(/^user_guest_(\d+)$/.exec(id)?.[1] ?? Number.MAX_SAFE_INTEGER));
  return [...users].sort((a, b) => rank(a.id) - rank(b.id) || a.id.localeCompare(b.id));
}

/** Items the filter shows: all for Everyone, only shared ones for Shared, a person's own plus the shared ones. */
export function filterCollectionByOwner(items: CollectionItem[], filter: string): CollectionItem[] {
  if (!filter || filter === COLLECTION_EVERYONE) return items;
  if (filter === COLLECTION_SHARED_OWNER) return items.filter((i) => collectionOwnerOf(i) === COLLECTION_SHARED_OWNER);
  return items.filter((i) => {
    const owner = collectionOwnerOf(i);
    return owner === filter || owner === COLLECTION_SHARED_OWNER;
  });
}

/**
 * The person filter's chips: Everyone, each Trip User who owns items (in the
 * users' order), then Shared when there are shared items. None when the items
 * have fewer than two owners, so one person's collection shows no filter.
 * An owner who isn't a Trip User here gets no chip (their items show under Everyone).
 */
export function collectionOwnerChips(items: CollectionItem[], users: CollectionTripUser[]): CollectionOwnerChip[] {
  const owned = new Map<string, number>();
  for (const item of items) {
    const owner = collectionOwnerOf(item);
    owned.set(owner, (owned.get(owner) ?? 0) + 1);
  }
  const shared = owned.get(COLLECTION_SHARED_OWNER) ?? 0;
  const people = users.filter((u) => owned.has(u.id));
  if (people.length + (shared ? 1 : 0) < 2) return [];
  return [
    { id: COLLECTION_EVERYONE, label: "Everyone", count: items.length },
    ...people.map((u) => ({ id: u.id, label: u.name, color: u.color, count: (owned.get(u.id) ?? 0) + shared })),
    ...(shared ? [{ id: COLLECTION_SHARED_OWNER, label: "Shared", count: shared }] : []),
  ];
}

/** The filter to use: the previous one while it's still a chip, else Everyone. */
export function pickCollectionOwnerFilter(chips: CollectionOwnerChip[], previous: string | undefined): string {
  return previous && chips.some((c) => c.id === previous) ? previous : COLLECTION_EVERYONE;
}

/** The editor's owner choices: each Trip User, then Shared. None when the account has one Trip User. */
export function collectionOwnerChoices(users: CollectionTripUser[]): { value: string; label: string; color?: string }[] {
  if (users.length < 2) return [];
  return [...users.map((u) => ({ value: u.id, label: u.name, color: u.color })), { value: COLLECTION_SHARED_OWNER, label: "Shared" }];
}

/** A removed Trip User's items, handed to the primary user and stamped `now` (only the ones that change). */
export function reassignCollectionOwner(items: CollectionItem[], removedUserId: string, now: number): CollectionItem[] {
  if (!removedUserId || removedUserId === PRIMARY_TRIP_USER || removedUserId === COLLECTION_SHARED_OWNER) return [];
  return items.filter((i) => i.userId === removedUserId).map((i) => ({ ...i, userId: PRIMARY_TRIP_USER, updatedAt: now }));
}

/** An imported item's owner here: kept when it's one of this account's Trip Users or Shared, otherwise Shared. */
export function importedCollectionOwner(userId: string | undefined, tripUserIds: string[]): string {
  const owner = userId || PRIMARY_TRIP_USER;
  return owner === COLLECTION_SHARED_OWNER || tripUserIds.includes(owner) ? owner : COLLECTION_SHARED_OWNER;
}
