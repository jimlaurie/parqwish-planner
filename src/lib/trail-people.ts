// ==================== TRAILS BY PERSON ====================
// Who recorded each GPS trail, and which colour their line gets. A day can
// have one TripTrail row per Trip User; Publish shows each as its own line
// (map, trail cards, PDF) instead of merging every point into one path,
// which zigzagged between people who split up.
//
// A person is an account plus one of its Trip Users (src/lib/trail-ids.ts):
// a collaborator's trail shows under their name and colour (owner-badge.ts),
// never as one of our own Trip Users who happens to share its id, and the
// Trip User filter (our own people) shows collaborators only with "All".

import type { TripTrail, User } from "@/lib/db";
import type { TripMember } from "@shared/types/trip";
import { resolveOwnerBadge } from "@/lib/owner-badge";

/** The line colour when only one person recorded trails (unchanged from before per-person lines). */
export const SINGLE_TRAIL_COLOR = "#FFA500";
/** A trail whose Trip User isn't on this device (e.g. a removed group member). */
export const UNKNOWN_PERSON_COLOR = "#9E9E9E";
/** Dark edge drawn under pale person colours so they read on light map tiles. */
export const TRAIL_CASING_COLOR = "#1C1C28";

export interface TrailPerson {
  trailId: string;
  userId: string;
  name: string;
  color: string;
  /** Recorded on this account (or the account isn't known); false for a collaborator */
  mine: boolean;
}

/** Who's looking: their account, and the trip's members for collaborators' names. */
export interface TrailViewer {
  myUid?: string;
  members?: Record<string, TripMember>;
}

type TrailOwner = Pick<TripTrail, "id" | "userId" | "authorUid">;

/** True unless the trail was recorded on another account. */
export function isMyTrail(trail: Pick<TripTrail, "authorUid">, myUid?: string): boolean {
  return !trail.authorUid || !myUid || trail.authorUid === myUid;
}

/** One key per person: account (or "me") and Trip User. */
export function personKey(trail: Pick<TripTrail, "userId" | "authorUid">, myUid?: string): string {
  return `${isMyTrail(trail, myUid) ? "me" : trail.authorUid}:${trail.userId}`;
}

/** Who recorded a trail: one of our Trip Users, a collaborator by name, or a neutral "Someone else". */
export function trailPerson(trail: TrailOwner, usersById: ReadonlyMap<string, User>, viewer: TrailViewer = {}): TrailPerson {
  if (!isMyTrail(trail, viewer.myUid)) {
    const badge = resolveOwnerBadge(trail, { userMap: new Map(usersById), members: viewer.members, myUid: viewer.myUid });
    return { trailId: trail.id, userId: trail.userId, name: badge?.name ?? "Collaborator", color: badge?.color ?? UNKNOWN_PERSON_COLOR, mine: false };
  }
  const user = usersById.get(trail.userId);
  return {
    trailId: trail.id,
    userId: trail.userId,
    name: user?.name ?? "Someone else",
    color: user?.color ?? UNKNOWN_PERSON_COLOR,
    mine: true,
  };
}

/** Our primary user first, then our people by name, then collaborators, so legends and cards keep a steady order. */
export function comparePeople(a: Pick<TrailPerson, "userId" | "name" | "mine">, b: Pick<TrailPerson, "userId" | "name" | "mine">): number {
  if (a.mine !== b.mine) return a.mine ? -1 : 1;
  const aPrimary = a.mine && a.userId === "user_primary";
  const bPrimary = b.mine && b.userId === "user_primary";
  if (aPrimary !== bPrimary) return aPrimary ? -1 : 1;
  return a.name.localeCompare(b.name);
}

/**
 * True when the trails come from more than one person. Then each line takes
 * its person's colour and a legend names them; a single person's trail keeps
 * the classic single colour, with nothing extra to explain.
 */
export function usesPersonColors(trails: ReadonlyArray<Pick<TripTrail, "userId" | "authorUid">>, myUid?: string): boolean {
  return new Set(trails.map((t) => personKey(t, myUid))).size > 1;
}

/** The line colour for a person, given whether this view is colouring by person. */
export function lineColor(person: Pick<TrailPerson, "color">, byPerson: boolean): string {
  return byPerson ? person.color : SINGLE_TRAIL_COLOR;
}

/** Trails for the Trip User filter shared with the rest of the app (null = everyone). The filter names our own people, so collaborators show only with everyone. */
export function trailsForFilter<T extends Pick<TripTrail, "userId" | "authorUid">>(trails: T[], filter: string[] | null, myUid?: string): T[] {
  return filter ? trails.filter((t) => isMyTrail(t, myUid) && filter.includes(t.userId)) : trails;
}

export function usersByIdMap(users: User[] | undefined): Map<string, User> {
  return new Map((users ?? []).map((u) => [u.id, u]));
}
