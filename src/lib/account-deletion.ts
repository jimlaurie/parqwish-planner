/**
 * Account deletion — the Planner's counterpart of Pal's Settings › Data &
 * Sync › "Delete my account" (dland-wishes/utils/AccountDeletion.ts).
 *
 * deleteMyAccount():
 *   1. stops Cloud Sync's listeners, so nothing is pushed back mid-delete
 *   2. confirms it's really this person: a fresh Apple or Google popup for
 *      those accounts (an email-link or anonymous session has no popup, and
 *      the confirmation step in the UI stands in for it)
 *   3. the deleteAccount Cloud Function (dland-wishes/functions/deleteAccount.js)
 *      removes the account's synced data, its place in shared trips and its
 *      Firebase user
 *   4. signs out and turns Cloud Sync off here
 * The trips and wishes saved in this browser are untouched: local-first.
 *
 * Apple's grant isn't revoked from the web: Firebase's web Apple sign-in
 * gives no authorization code to exchange, so the function reports "no-code"
 * and the UI says where to remove it (Pal's deletion does revoke it).
 */

import { getFunctions, httpsCallable } from "firebase/functions";
import {
  GoogleAuthProvider, OAuthProvider, reauthenticateWithPopup, type User,
} from "firebase/auth";
import app, { auth } from "@/lib/firebase";
import { signOutSync } from "@/lib/auth";
import { stopSync } from "@/lib/wish-sync";

export interface AccountDeletionResult {
  trips: { deleted: number; handedOver: number; left: number };
  /** "revoked", or why Apple's grant wasn't revoked ("not-configured", "no-code", "failed") */
  apple: string;
}

/** Thrown when the person closes the Apple or Google popup: nothing was deleted. */
export class AccountDeletionCancelled extends Error {}

/** Which sign-in an account uses, for the confirmation step and the result message. */
export function signInKind(user: User | null): "apple" | "google" | "email" | "anonymous" | null {
  if (!user) return null;
  const ids = user.providerData.map((p) => p.providerId);
  if (ids.includes("apple.com")) return "apple";
  if (ids.includes("google.com")) return "google";
  if (ids.includes("password") || user.email) return "email";
  return "anonymous";
}

/** A fresh popup for Apple or Google accounts; nothing for the others. */
async function confirmIdentity(user: User): Promise<void> {
  const kind = signInKind(user);
  const provider = kind === "apple" ? new OAuthProvider("apple.com") : kind === "google" ? new GoogleAuthProvider() : null;
  if (!provider) return;
  try {
    await reauthenticateWithPopup(user, provider);
  } catch (err) {
    const code = (err as { code?: string }).code ?? "";
    if (code.includes("popup-closed") || code.includes("cancelled-popup")) throw new AccountDeletionCancelled();
    throw err;
  }
}

/** Deletes this person's ParQwish account. Throws AccountDeletionCancelled if they back out at the popup. */
export async function deleteMyAccount(onDisableSync: () => void): Promise<AccountDeletionResult> {
  const user = auth.currentUser;
  if (!user) throw new Error("Not signed in");
  stopSync();
  await confirmIdentity(user);
  const call = httpsCallable<{ authorizationCode: null }, AccountDeletionResult>(getFunctions(app, "us-central1"), "deleteAccount");
  const { data } = await call({ authorizationCode: null });
  console.log("[AccountDeletion] Account deleted:", JSON.stringify(data));
  await signOutSync().catch((err) => console.warn("[AccountDeletion] sign-out after deletion failed:", err));
  onDisableSync();
  return data;
}

/** The message shown when it's done, e.g. "One shared trip you created was handed to another member." */
export function describeDeletion({ trips, apple }: AccountDeletionResult, kind: ReturnType<typeof signInKind>): string {
  const parts: string[] = ["Your account is deleted."];
  const n = (count: number, one: string, many: string) => (count === 1 ? one : many.replace("#", String(count)));
  if (trips.handedOver) parts.push(n(trips.handedOver, "One shared trip you created was handed to another member.", "# shared trips you created were handed to other members."));
  if (trips.deleted) parts.push(n(trips.deleted, "One shared trip only you were in was deleted.", "# shared trips only you were in were deleted."));
  if (trips.left) parts.push(n(trips.left, "You left one trip someone else shared with you.", "You left # trips other people shared with you."));
  parts.push("Everything saved in this browser is still here, and Cloud Sync is off.");
  if (kind === "apple" && apple !== "revoked") {
    parts.push("To also remove ParQwish from your Apple ID, open Settings › your name › Sign-In & Security › Sign in with Apple on an iPhone, or account.apple.com.");
  }
  return parts.join(" ");
}
