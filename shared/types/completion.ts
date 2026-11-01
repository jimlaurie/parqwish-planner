// ==================== TRIP COMPLETION TYPES ====================
// "Done on this trip" for a trip wish or packing item belongs to an account
// (a household): shared by its Trip Users, separate for each collaborator.
// Each account's tick is its own record, one per app, so households and
// apps never overwrite each other's (selections are whole-document
// last-write-wins). Stored at sharedTrips/{tripId}/completions/{id} in the
// usual encrypted envelope, with authorUid in plaintext for the rules.
// Design: dland-wishes docs/completion-design.md.

/** Which trip selection table the item is in. */
export type CompletionKind = "wish" | "packing";

/** pal: rolled up from Pal's day ticks. planner: ticked on the Planner's Plan or Prepare page. */
export type CompletionSource = "pal" | "planner";

export interface TripCompletion {
  /** `${kind}__${itemId}__${authorUid}__${source}` (shared/completions.ts completionDocId) */
  id: string;
  tripId: string;
  kind: CompletionKind;
  /** The wish id or packing item id, as in the selection id `${tripId}__${itemId}` */
  itemId: string;
  /** The account (household) this tick belongs to */
  authorUid: string;
  source: CompletionSource;
  /** ISO-8601, the first tick */
  completedAt: string;
  /** pal only: the trip dates (YYYY-MM-DD) it's ticked on in Pal, sorted */
  dates?: string[];
  /** ms since epoch, bumped on every write */
  updatedAt: number;
}
