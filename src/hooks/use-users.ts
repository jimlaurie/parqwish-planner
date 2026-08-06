"use client";

import { useLiveQuery } from "dexie-react-hooks";
import db, { type User } from "@/lib/db";
import { auth, isSyncEnabled } from "@/lib/auth";
import { pushTripUser, deleteTripUserRemote } from "@/lib/wish-sync";

// ==================== USER COLORS ====================

// Matches mobile app palette so user_guest_N gets the same color on both platforms
export const USER_COLORS = [
  "#FFD700", // Gold (primary)
  "#87CEEB", // Sky Blue
  "#98FB98", // Pale Green
  "#DDA0DD", // Plum
  "#F08080", // Light Coral
  "#87CEFA", // Light Sky Blue
];

const MAX_USERS = 6;

// ==================== SYNC HELPER ====================

function syncUser(user: User) {
  const authUser = auth.currentUser;
  if (!authUser || !isSyncEnabled(authUser)) return;
  pushTripUser(user, authUser.uid).catch(
    (err) => console.error("[use-users] sync push failed:", err)
  );
}

function syncUserDelete(user: User) {
  const authUser = auth.currentUser;
  if (!authUser || !isSyncEnabled(authUser)) return;
  deleteTripUserRemote(user, authUser.uid).catch(
    (err) => console.error("[use-users] sync delete push failed:", err)
  );
}

// ==================== ENSURE DEFAULT USER ====================

/** Creates the primary user if none exists. Safe to call multiple times. */
export async function ensureDefaultUser(): Promise<void> {
  const existing = await db.users.get("user_primary");
  if (existing) return;

  const now = Date.now();
  const user: User = {
    id: "user_primary",
    name: "Me",
    color: USER_COLORS[0],
    role: "primary",
    createdAt: now,
    updatedAt: now,
  };
  await db.users.add(user);
  syncUser(user);
}

// ==================== HELPERS ====================

function nextGuestId(users: User[]): string {
  const guestNums = users
    .filter((u) => u.id.startsWith("user_guest_"))
    .map((u) => parseInt(u.id.replace("user_guest_", ""), 10))
    .filter((n) => !isNaN(n));

  const next = guestNums.length > 0 ? Math.max(...guestNums) + 1 : 1;
  return `user_guest_${next}`;
}

function nextColor(users: User[]): string {
  return USER_COLORS[users.length % USER_COLORS.length];
}

// ==================== MAIN HOOK ====================

export function useUsers() {
  const users = useLiveQuery(() => db.users.toArray());

  /** Add a new guest user. Returns the created user or null if at capacity. */
  const addUser = async (name: string): Promise<User | null> => {
    const existing = await db.users.toArray();
    if (existing.length >= MAX_USERS) return null;

    const now = Date.now();
    const user: User = {
      id: nextGuestId(existing),
      name,
      color: nextColor(existing),
      role: "guest",
      createdAt: now,
      updatedAt: now,
    };

    await db.users.add(user);
    syncUser(user);
    return user;
  };

  /** Create or update a user from mobile sync data. */
  const upsertFromMobile = async (
    mobileUserId: string,
    name: string,
    isOwner: boolean
  ): Promise<User> => {
    const existing = await db.users.get(mobileUserId);
    if (existing) {
      if (existing.name !== name) {
        await db.users.update(mobileUserId, { name, updatedAt: Date.now() });
      }
      return { ...existing, name };
    }

    const allUsers = await db.users.toArray();
    const now = Date.now();
    const user: User = {
      id: mobileUserId,
      name,
      color: nextColor(allUsers),
      role: isOwner ? "primary" : "guest",
      createdAt: now,
      updatedAt: now,
      syncedFromMobile: true,
    };

    await db.users.add(user);
    return user;
  };

  /** Update user name and/or color. */
  const updateUser = async (
    id: string,
    updates: Partial<Pick<User, "name" | "color">>
  ): Promise<void> => {
    await db.users.update(id, { ...updates, updatedAt: Date.now() });
    const updated = await db.users.get(id);
    if (updated) syncUser(updated);
  };

  /**
   * Delete a guest user and reassign their items to the primary user.
   * Primary user cannot be deleted. Deletion is synced as a name-verified
   * tombstone — see SyncedTripUser in shared/sync/firestore-schema.ts.
   */
  const deleteUser = async (id: string): Promise<void> => {
    if (id === "user_primary") return;

    const user = await db.users.get(id);

    // Reassign owned items to primary user
    await db.tripWishSelections
      .where("userId")
      .equals(id)
      .modify({ userId: "user_primary" });

    await db.tripPackingSelections
      .where("userId")
      .equals(id)
      .modify({ userId: "user_primary" });

    await db.dayItems
      .where("userId")
      .equals(id)
      .modify({ userId: "user_primary" });

    await db.users.delete(id);

    if (user) syncUserDelete(user);
  };

  /** Look up a single user by ID. */
  const getUserById = (id: string): User | undefined => {
    return (users ?? []).find((u) => u.id === id);
  };

  /** Build a map of userId → User for efficient lookups. */
  const userMap = new Map((users ?? []).map((u) => [u.id, u]));

  return {
    users: users ?? [],
    userMap,
    addUser,
    upsertFromMobile,
    updateUser,
    deleteUser,
    getUserById,
    loading: users === undefined,
    atCapacity: (users ?? []).length >= MAX_USERS,
  };
}
