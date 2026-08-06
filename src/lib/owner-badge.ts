import type { User } from "@/lib/db";
import type { TripMember } from "@shared/types/trip";
import { USER_COLORS } from "@/hooks/use-users";

// ==================== OWNER BADGE RESOLUTION ====================
// Resolves "who added this" for a trip-content item (wish selection,
// packing selection, or day item) across collaborator accounts.
//
// userId alone is ambiguous: it's a locally-chosen Trip User id (e.g.
// "user_primary"), and every account has its own local Trip Users — ids
// collide across different collaborator accounts, so trusting userId blindly
// can misattribute another collaborator's item as your own. authorUid (the
// pushing account's real Firebase Auth uid, stamped at push time — see
// TripWishSelection.authorUid in shared/types/wish.ts) disambiguates whose
// Trip User namespace userId belongs to.

interface OwnedItem {
  userId?: string;
  authorUid?: string;
}

export interface OwnerBadge {
  name: string;
  color: string;
}

/**
 * Resolve the badge (name + color) for whoever added an item.
 * - No authorUid, or authorUid is my own account: trust userId as always —
 *   it's genuinely one of my own local Trip Users.
 * - authorUid is a different account: this is a collaborator's item. Show
 *   their trip-membership display name (set at invite-accept) with a color
 *   stably hashed from their uid, rather than trusting userId (which may
 *   collide with one of my own local Trip User ids).
 * Returns undefined only when there's truly nothing to show (e.g. a
 * collaborator with no recorded display name AND no members map at all).
 */
export function resolveOwnerBadge(
  item: OwnedItem,
  opts: {
    userMap: Map<string, User>;
    members?: Record<string, TripMember>;
    myUid?: string;
  }
): OwnerBadge | undefined {
  const { userMap, members, myUid } = opts;
  const isMine = !item.authorUid || item.authorUid === myUid;

  if (isMine) {
    const local = userMap.get(item.userId ?? "user_primary");
    return local ? { name: local.name, color: local.color } : undefined;
  }

  const member = members?.[item.authorUid!];
  const name = member?.displayName?.trim() || "Collaborator";
  return { name, color: colorForUid(item.authorUid!) };
}

/** Stable color for an account uid — same collaborator always renders the same color, without a color-assignment system. */
function colorForUid(uid: string): string {
  let hash = 0;
  for (let i = 0; i < uid.length; i++) {
    hash = (hash * 31 + uid.charCodeAt(i)) >>> 0;
  }
  return USER_COLORS[hash % USER_COLORS.length];
}
