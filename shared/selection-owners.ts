// ==================== TRIP WISH SELECTION OWNERS ====================
// A trip wish selection can be wanted by several people: several Trip Users
// on one account (the family), and Trip Users on collaborators' accounts.
// Trip User ids ("user_primary", "user_guest_1"…) are only unique within one
// account, so a person is the pair { userId, authorUid }. An owner with no
// authorUid belongs to this device's own account (it's stamped with the
// account's uid when pushed to Cloud Sync).
//
// Pure helpers: no I/O. Used by the Planner and, from the build after 82, Pal.

import type { SelectionOwner, TripWishSelection } from "./types/wish";

export const DEFAULT_TRIP_USER_ID = "user_primary";

type OwnedSelection = Pick<TripWishSelection, "userId" | "authorUid" | "owners">;

/** Everyone who wants this selection, oldest first. Never empty. */
export function selectionOwners(sel: OwnedSelection): SelectionOwner[] {
  if (sel.owners && sel.owners.length > 0) return sel.owners;
  return [{ userId: sel.userId ?? DEFAULT_TRIP_USER_ID, authorUid: sel.authorUid }];
}

/** The account an owner belongs to, treating "unset" as this account (`myUid`, or "local" when signed out). */
function accountOf(owner: SelectionOwner, myUid?: string): string {
  return owner.authorUid ?? myUid ?? "local";
}

export function isSameOwner(a: SelectionOwner, b: SelectionOwner, myUid?: string): boolean {
  return a.userId === b.userId && accountOf(a, myUid) === accountOf(b, myUid);
}

/** True when the owner is one of this account's own Trip Users. */
export function isLocalOwner(owner: SelectionOwner, myUid?: string): boolean {
  return !owner.authorUid || !myUid || owner.authorUid === myUid;
}

export function hasOwner(sel: OwnedSelection, owner: SelectionOwner, myUid?: string): boolean {
  return selectionOwners(sel).some((o) => isSameOwner(o, owner, myUid));
}

/** The owners and mirrored userId after adding someone (unchanged if already there). */
export function addSelectionOwner(
  sel: OwnedSelection,
  owner: SelectionOwner,
  myUid?: string
): { owners: SelectionOwner[]; userId: string } {
  const owners = selectionOwners(sel);
  const next = hasOwner(sel, owner, myUid) ? owners : [...owners, owner];
  return { owners: next, userId: next[0].userId };
}

/** The owners and mirrored userId after removing someone. `owners` is empty when nobody is left. */
export function removeSelectionOwner(
  sel: OwnedSelection,
  owner: SelectionOwner,
  myUid?: string
): { owners: SelectionOwner[]; userId: string | undefined } {
  const next = selectionOwners(sel).filter((o) => !isSameOwner(o, owner, myUid));
  return { owners: next, userId: next[0]?.userId };
}

/** Before pushing: owners added on this device without an account get the pushing account's uid. */
export function stampOwnerAccounts(owners: SelectionOwner[] | undefined, uid: string): SelectionOwner[] | undefined {
  return owners?.map((o) => (o.authorUid ? o : { ...o, authorUid: uid }));
}
