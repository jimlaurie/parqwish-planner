"use client";

/**
 * web/src/lib/auth.ts
 *
 * Firebase Auth helpers for the ParQwish PWA.
 *
 * Strategy:
 *   - Anonymous auth is created automatically on first load (local-only mode)
 *   - Apple Sign In upgrades to a persistent cross-device identity
 *   - After Apple Sign In the UID is stable across all devices → sync activates
 *
 * Two different bars apply depending on what you're signing in FOR:
 *   - isSyncEnabled() (Apple only) gates the account's OWN personal wish/
 *     packing catalog syncing across that account's devices, and owning a
 *     shared trip (see shared/types/trip.ts design note: the Owner needs a
 *     real, durable identity — Apple is the only one built that meets that
 *     bar today).
 *   - canCollaborate() (any signed-in identity, including anonymous) gates
 *     participating in someone ELSE's shared trip as an Editor/Viewer. That
 *     bar is deliberately lower — Google Sign In, an email magic link, or
 *     even a bare anonymous session are all "durable enough" to hold a
 *     wrapped trip key and push/pull that one trip's content, even though
 *     they don't unlock the account's own cross-device catalog sync.
 */

import {
  getAuth,
  signInAnonymously,
  signInWithPopup,
  signInWithCredential,
  linkWithCredential,
  signOut as firebaseSignOut,
  OAuthProvider,
  GoogleAuthProvider,
  EmailAuthProvider,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  onAuthStateChanged,
  type User,
} from "firebase/auth";
import app from "./firebase";

export const auth = getAuth(app);

// ==================== ANONYMOUS AUTH ====================

/**
 * Sign in anonymously if no user exists yet.
 * Called once on app init — silent, no UI.
 *
 * auth.currentUser is null for a brief window on every page load even when
 * a real session (Apple, Google, ...) is persisted, because Firebase's
 * IndexedDB restore is async. Calling signInAnonymously() during that
 * window would silently discard the real session and replace it with a
 * fresh anonymous one — so wait for the first onAuthStateChanged callback
 * (fires exactly once with the resolved state) before deciding there's
 * really no one signed in.
 */
export async function ensureAuth(): Promise<User> {
  if (auth.currentUser) return auth.currentUser;
  const restored = await new Promise<User | null>((resolve) => {
    const unsub = onAuthStateChanged(auth, (u) => {
      unsub();
      resolve(u);
    });
  });
  if (restored) return restored;
  const { user } = await signInAnonymously(auth);
  return user;
}

// ==================== APPLE SIGN IN ====================

const appleProvider = new OAuthProvider("apple.com");
appleProvider.addScope("name");

/**
 * Apple Sign In via popup.
 *
 * If the current user is anonymous → links the Apple credential to the
 * anonymous account, preserving the UID and promoting it to permanent.
 *
 * If already signed in with Apple → signs in (no-op if same account).
 */
export async function signInWithApple(): Promise<User> {
  // Always use signInWithPopup — never linkWithPopup on anonymous accounts.
  // linkWithPopup gives the anonymous UID (session-specific). signInWithPopup
  // returns the canonical Apple-derived UID, consistent with mobile's
  // signInWithCredential. Same UID on every device → same Firestore path.
  const { user } = await signInWithPopup(auth, appleProvider);
  return user;
}

// ==================== GOOGLE SIGN IN ====================
// PWA-only (no mobile counterpart) — a lower-friction durable identity for
// trip collaborators who don't have an Apple ID. Same signInWithPopup
// reasoning as Apple: a canonical, device-independent Google-derived UID.

const googleProvider = new GoogleAuthProvider();

export async function signInWithGoogle(): Promise<User> {
  const { user } = await signInWithPopup(auth, googleProvider);
  return user;
}

// ==================== EMAIL MAGIC LINK ====================
// The lowest-friction durable option: no password, no app install, works
// from any browser. Two-step flow across a page reload (the user leaves to
// check email), so the email address has to be stashed locally to complete
// the sign-in when they come back via the link.

const EMAIL_FOR_SIGN_IN_KEY = "parqwish:emailForSignIn";

export async function sendMagicLink(email: string, redirectUrl: string): Promise<void> {
  await sendSignInLinkToEmail(auth, email, { url: redirectUrl, handleCodeInApp: true });
  window.localStorage.setItem(EMAIL_FOR_SIGN_IN_KEY, email);
}

/** Is this URL (typically the current page's URL) a magic-link sign-in callback? */
export function isMagicLinkUrl(url: string): boolean {
  return isSignInWithEmailLink(auth, url);
}

/**
 * Complete a magic-link sign-in from the callback URL.
 *
 * If the current session is anonymous, links the email credential to it in
 * place via linkWithCredential — same UID, now durable, so a trip joined
 * anonymously before this call stays joined under the same identity.
 * Otherwise signs in fresh (e.g. the link was opened in a new browser with
 * no prior anonymous session).
 *
 * Returns null if no stashed email is found (link opened on a different
 * device/browser than the one that requested it) — the caller should
 * prompt for the email address and retry with emailOverride.
 */
export async function completeMagicLink(url: string, emailOverride?: string): Promise<User | null> {
  const email = emailOverride ?? window.localStorage.getItem(EMAIL_FOR_SIGN_IN_KEY);
  if (!email) return null;

  const credential = EmailAuthProvider.credentialWithLink(email, url);
  const result = auth.currentUser?.isAnonymous
    ? await linkWithCredential(auth.currentUser, credential)
    : await signInWithCredential(auth, credential);

  window.localStorage.removeItem(EMAIL_FOR_SIGN_IN_KEY);
  return result.user;
}

// ==================== AUTH STATE ====================

export function onAuthChanged(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

/** True when the user has linked an Apple ID — the account's own personal
 *  wish/packing catalog syncs across its devices, and it can own (create)
 *  a shared trip. */
export function isSyncEnabled(user: User | null): boolean {
  if (!user) return false;
  return user.providerData.some((p) => p.providerId === "apple.com");
}

/** True for any signed-in identity — Apple, Google, email link, or a bare
 *  anonymous session. The bar for participating in someone else's shared
 *  trip as an Editor/Viewer; NOT sufficient to own (create) a trip. */
export function canCollaborate(user: User | null): boolean {
  return !!user;
}

/** True if this identity will survive clearing browser data or switching
 *  devices — Apple, Google, or a linked email. False for a bare anonymous
 *  session, which is real but device-local and unrecoverable if lost. */
export function hasDurableIdentity(user: User | null): boolean {
  if (!user) return false;
  return user.providerData.some((p) =>
    ["apple.com", "google.com", "password"].includes(p.providerId)
  );
}

/** Sign out completely — clears auth.currentUser so no further pushes happen */
export async function signOutSync(): Promise<void> {
  await firebaseSignOut(auth);
}
