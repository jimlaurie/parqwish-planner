// ==================== TRAILS BY PERSON ====================
// Who recorded each GPS trail, and which colour their line gets. A day can
// have one TripTrail row per Trip User; Publish shows each as its own line
// (map, trail cards, PDF) instead of merging every point into one path,
// which zigzagged between people who split up.
//
// Trails are keyed by Trip User only (not by account yet), so a
// collaborator's trail is attributed to whichever of our own Trip Users has
// the same id — see "Trails by Person on Publish" in dland-wishes'
// docs/roadmap.md for the account-aware key that fixes this.

import type { TripTrail, User } from "@/lib/db";

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
}

type TrailOwner = Pick<TripTrail, "id" | "userId">;

/** The Trip User who recorded a trail, or a neutral "Someone else" when they aren't on this device. */
export function trailPerson(trail: TrailOwner, usersById: ReadonlyMap<string, User>): TrailPerson {
  const user = usersById.get(trail.userId);
  return {
    trailId: trail.id,
    userId: trail.userId,
    name: user?.name ?? "Someone else",
    color: user?.color ?? UNKNOWN_PERSON_COLOR,
  };
}

/** Primary user first, then by name, so legends and cards keep a steady order. */
export function comparePeople(a: Pick<TrailPerson, "userId" | "name">, b: Pick<TrailPerson, "userId" | "name">): number {
  if (a.userId === "user_primary" && b.userId !== "user_primary") return -1;
  if (b.userId === "user_primary" && a.userId !== "user_primary") return 1;
  return a.name.localeCompare(b.name);
}

/**
 * True when the trails come from more than one person. Then each line takes
 * its person's colour and a legend names them; a single person's trail keeps
 * the classic single colour, with nothing extra to explain.
 */
export function usesPersonColors(trails: ReadonlyArray<Pick<TripTrail, "userId">>): boolean {
  return new Set(trails.map((t) => t.userId)).size > 1;
}

/** The line colour for a person, given whether this view is colouring by person. */
export function lineColor(person: Pick<TrailPerson, "color">, byPerson: boolean): string {
  return byPerson ? person.color : SINGLE_TRAIL_COLOR;
}

/** Trails for the Trip User filter shared with the rest of the app (null = everyone). */
export function trailsForFilter<T extends Pick<TripTrail, "userId">>(trails: T[], filter: string[] | null): T[] {
  return filter ? trails.filter((t) => filter.includes(t.userId)) : trails;
}

export function usersByIdMap(users: User[] | undefined): Map<string, User> {
  return new Map((users ?? []).map((u) => [u.id, u]));
}
