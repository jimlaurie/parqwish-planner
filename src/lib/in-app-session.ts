// Deliberately its own module with zero other imports. AppInit.tsx sets
// this flag (it only ever mounts inside the (app) route group) and
// ContentLogoLink.tsx reads it — both need the same key, but neither
// should have to pull in the other's dependency graph (Dexie, Firebase,
// for AppInit) just to share one string.
export const IN_APP_SESSION_KEY = "parqwish-in-app-session";
