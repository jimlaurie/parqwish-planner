import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

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

// Prevent re-initialization in hot reload
const app =
  getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const db = getFirestore(app);
export const auth = getAuth(app);
export default app;
