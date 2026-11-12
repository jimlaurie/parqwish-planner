import { initializeApp, getApps } from "firebase/app";
import { getFirestore, initializeFirestore, type Firestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import type { FirebaseApp } from "firebase/app";
import { hasWebKit7DayRule } from "./storage-safety";

// Falls back to inert placeholders when unset (no .env.local — e.g. a fresh
// contributor checkout, or the guide/* static pages prerendering at build
// time via the root layout's AppInit). initializeApp/getAuth/getFirestore
// validate config shape synchronously at module load and throw on an empty
// apiKey; real Firebase calls make network requests that fail later at the
// call site instead, which is the degraded-but-non-crashing behavior we want
// when Cloud Sync isn't configured.
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "demo-api-key",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "demo.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "demo-project",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "demo-project.appspot.com",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "000000000000",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:000000000000:web:0000000000000000000000",
};

/**
 * Whether this build has its real Firebase settings (NEXT_PUBLIC_* are
 * inlined at build time). Without them Cloud Sync and joining can't work,
 * which the UI says plainly instead of a generic "Sign in failed" (that
 * placeholder config shipped live twice before npm run ship checked it).
 */
export const FIREBASE_CONFIGURED = Boolean(
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY && process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID && process.env.NEXT_PUBLIC_FIREBASE_APP_ID
);
if (!FIREBASE_CONFIGURED && typeof window !== "undefined") {
  console.error("[firebase] This build has no Firebase settings (.env.local was missing): Cloud Sync and joining trips won't work.");
}

// Prevent re-initialization in hot reload
const app =
  getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

/**
 * Firestore, long-polling in WebKit (Safari on a Mac, every browser on iPhone
 * and iPad). Its default streamed connection held back small updates there:
 * a Collection state change from Pal took 20–30 s to reach the Planner in
 * Safari but about 1 s in Chrome (12 Nov 2026), since Safari can buffer a
 * stream's small chunks. Long polling answers each update as a whole
 * response. Created here, before any getFirestore() elsewhere, which then
 * returns this instance.
 */
function createFirestore(firebaseApp: FirebaseApp): Firestore {
  if (typeof window === "undefined") return getFirestore(firebaseApp);
  if (!hasWebKit7DayRule(navigator.userAgent, navigator.maxTouchPoints ?? 0)) return getFirestore(firebaseApp);
  try {
    return initializeFirestore(firebaseApp, { experimentalForceLongPolling: true });
  } catch {
    return getFirestore(firebaseApp); // already created (hot reload)
  }
}

export const db = createFirestore(app);
export const auth = getAuth(app);
export default app;
