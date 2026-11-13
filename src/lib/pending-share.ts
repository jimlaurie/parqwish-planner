// ==================== SHARE OPEN ====================
// After the /share page saves what was shared (src/lib/share-save.ts), the
// page that holds it opens its editor so the details can be set: the Catalog
// for a wish, outfit, gear, sundry, shopping or dining item, the Collection
// page for a collection item. /share leaves the request here (sessionStorage,
// so it outlives the route change) and the page takes it once its data is in.

import type { PlannerShareDestination } from "@/lib/share-save";

export interface ShareOpenRequest {
  dest: PlannerShareDestination;
  itemId: string;
}

const KEY = "parqwish:shareOpen";

export function requestShareOpen(request: ShareOpenRequest): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(request));
  } catch (err) {
    console.warn("[pending-share] couldn't keep the request; the item is saved but its editor won't open:", err);
  }
}

/** The waiting request for one of these destinations, taken so it opens only once. */
export function takeShareOpen(dests: readonly PlannerShareDestination[]): ShareOpenRequest | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const request = JSON.parse(raw) as ShareOpenRequest;
    if (!dests.includes(request.dest)) return null;
    sessionStorage.removeItem(KEY);
    return request;
  } catch {
    return null;
  }
}
