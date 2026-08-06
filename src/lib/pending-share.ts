// ==================== PENDING SHARE ====================
// When content is shared to ParQwish via the Web Share Target, the /share page
// stores it here before navigating to the destination. Each destination page
// can call consumePendingShare() on mount to pick it up and pre-populate forms.

export type ShareDestination =
  | "flight"
  | "hotel"
  | "dining"
  | "wish"
  | "shopping"
  | "note";

export interface PendingShare {
  title: string;
  text: string;
  url: string;
  destination: ShareDestination;
  sharedAt: number;
}

const KEY = "parqwish:pendingShare";

export function storePendingShare(share: PendingShare): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(share));
  } catch {}
}

/** Returns and clears the pending share, or null if none. */
export function consumePendingShare(): PendingShare | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    sessionStorage.removeItem(KEY);
    return JSON.parse(raw) as PendingShare;
  } catch {
    return null;
  }
}

export function hasPendingShare(): boolean {
  try {
    return sessionStorage.getItem(KEY) !== null;
  } catch {
    return false;
  }
}
