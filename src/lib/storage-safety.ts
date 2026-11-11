// ==================== STORAGE SAFETY ====================
// Whether this browser will keep the Planner's data (trips, wishes, packing,
// photos: all in IndexedDB, plus settings in localStorage).
//
// Safari (WebKit, which is every browser on iPhone and iPad) deletes a site's
// script-written storage after 7 days without the person interacting with
// it, unless the site runs as a Home Screen web app
// (https://webkit.org/tracking-prevention/). navigator.storage.persist() is
// granted mostly to Home Screen web apps there, and WebKit doesn't say a
// grant lifts the 7-day rule (https://webkit.org/blog/14403/). Chrome, Edge
// and Firefox have no such rule; persist() keeps data when the disk runs low.
//
// So: ask to persist (silently, where the browser doesn't prompt), and tell
// the person when their data is at risk and what keeps it: installing the
// Planner, or Cloud Sync with an Apple account (which brings back everything
// but full-size photos and a few local-only things).

export type StorageStatusKind =
  | "installed"   // a Home Screen / Dock / installed app: kept
  | "backed-up"   // Cloud Sync with an Apple account: comes back after a wipe
  | "persisted"   // the browser agreed to keep it (not Safari's 7-day rule)
  | "at-risk"     // a Safari tab with data and no backup
  | "best-effort" // another browser, not persisted: kept unless the disk runs low
  | "empty";      // nothing saved yet

export interface StorageEnv {
  /** Running as an installed app (display-mode standalone, or iOS's navigator.standalone). */
  standalone: boolean;
  /** navigator.storage.persisted(); null when the browser can't say. */
  persisted: boolean | null;
  /** A browser with WebKit's 7-day rule (Safari on a Mac, any browser on iPhone or iPad). */
  webkit7Day: boolean;
  /** Cloud Sync is on and signed in with an Apple account (its trips and catalog come back). */
  backedUp: boolean;
  /** The Planner has something worth keeping (a trip, a wish, a packing item). */
  hasData: boolean;
}

export interface StorageStatus {
  kind: StorageStatusKind;
  /** One line for Play, in the person's terms. */
  label: string;
}

const LABELS: Record<StorageStatusKind, string> = {
  installed: "Kept: the Planner is installed as an app on this device.",
  "backed-up": "Backed up with Cloud Sync. Full-size photos added here stay on this device only.",
  persisted: "Kept: this browser has agreed to keep the Planner's data.",
  "at-risk": "Safari can clear the Planner's data after 7 days without a visit. Install the Planner or turn on Cloud Sync to keep it.",
  "best-effort": "Kept by this browser, unless the device runs out of space.",
  empty: "Nothing saved on this device yet.",
};

/** What keeps (or threatens) this device's data. Pure. */
export function storageStatus(env: StorageEnv): StorageStatus {
  const kind = statusKind(env);
  return { kind, label: LABELS[kind] };
}

function statusKind(env: StorageEnv): StorageStatusKind {
  if (env.standalone) return "installed";
  if (env.backedUp) return "backed-up";
  if (!env.hasData) return "empty";
  if (env.webkit7Day) return "at-risk"; // a persist() grant doesn't lift the 7-day rule
  return env.persisted ? "persisted" : "best-effort";
}

// ==================== BROWSER DETECTION (pure) ====================

const IOS = /iPad|iPhone|iPod/;
const OTHER_ENGINES = /Chrome|Chromium|CriOS|Edg|OPR|Firefox|FxiOS|Android/;

/** iPhone or iPad, including iPadOS reporting itself as a Mac (touch points). */
export function isAppleMobile(userAgent: string, maxTouchPoints = 0): boolean {
  return IOS.test(userAgent) || (/Macintosh/.test(userAgent) && maxTouchPoints > 1);
}

/** Safari on a Mac. */
export function isMacSafari(userAgent: string, maxTouchPoints = 0): boolean {
  return /Macintosh/.test(userAgent) && maxTouchPoints <= 1 && /Safari\//.test(userAgent) && !OTHER_ENGINES.test(userAgent);
}

/** A browser with WebKit's 7-day rule: Safari on a Mac, or any browser on iPhone or iPad (all WebKit). */
export function hasWebKit7DayRule(userAgent: string, maxTouchPoints = 0): boolean {
  return isAppleMobile(userAgent, maxTouchPoints) || isMacSafari(userAgent, maxTouchPoints);
}

/** Firefox asks the person before granting persist(), so it's asked only from a button. */
export function persistPrompts(userAgent: string): boolean {
  return /Firefox\//.test(userAgent) && !/FxiOS/.test(userAgent);
}

/** How to install the Planner in this browser, or undefined when the browser has its own install button. */
export function installSteps(userAgent: string, maxTouchPoints = 0): string | undefined {
  if (isAppleMobile(userAgent, maxTouchPoints)) return "Tap the Share button, then “Add to Home Screen”.";
  if (isMacSafari(userAgent, maxTouchPoints)) return "In Safari, choose File › Add to Dock.";
  return undefined;
}

// ==================== BROWSER I/O ====================

/** Is the Planner running as an installed app? */
export function isStandalone(): boolean {
  try {
    return window.matchMedia("(display-mode: standalone)").matches
      || (navigator as unknown as { standalone?: boolean }).standalone === true;
  } catch {
    return false;
  }
}

/** navigator.storage.persisted(), or null where the browser can't say. */
export async function readPersisted(): Promise<boolean | null> {
  try {
    if (!navigator.storage?.persisted) return null;
    return await navigator.storage.persisted();
  } catch (error) {
    console.warn("[storage-safety] persisted() failed:", error);
    return null;
  }
}

/** Ask the browser to keep the Planner's data; true when it agreed. */
export async function requestPersistence(): Promise<boolean> {
  try {
    if (!navigator.storage?.persist) return false;
    if (await navigator.storage.persisted()) return true;
    const granted = await navigator.storage.persist();
    console.log(`[storage-safety] persist() ${granted ? "granted" : "not granted"}`);
    return granted;
  } catch (error) {
    console.warn("[storage-safety] persist() failed:", error);
    return false;
  }
}
