// ==================== UNIVERSAL SYNC (PWA) ====================
// File-based data transfer for PWA ↔ mobile sync and trip archiving.
// Mirrors mobile's utils/UniversalSync.js for the PWA side.

import { pwaToSyncPayload, syncPayloadToPwa, linkPhotoManifest } from "./sync-translate";
import db from "./db";
import { useAppStore } from "./store";
import type {
  SyncEnvelopeV2,
  SyncCategory,
  SyncPayload,
  ImportMode,
  PhotoManifestEntry,
  PhotoZipManifest,
} from "./sync-types";
import { CATEGORY_META, ALL_CATEGORIES } from "./sync-types";
import { isValidDate, isValidEnvelope } from "@shared/validation";
import { wishTagToSyncCategory } from "@shared/sync-helpers";
import JSZip from "jszip";

// ==================== CODE GENERATION & VERIFICATION ====================

/**
 * Generate a random 6-digit numeric code for sync verification.
 */
export function generateSyncCode(): string {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  const code = (100000 + (array[0] % 900000)).toString();
  return code;
}

/**
 * SHA-256 hash of a string. Returns hex string.
 * Falls back to a simple djb2-based hex string when crypto.subtle is
 * unavailable (non-HTTPS / insecure context during local dev).
 */
export async function hashCode(code: string): Promise<string> {
  // crypto.subtle is only available in secure contexts (HTTPS / localhost).
  if (typeof crypto !== "undefined" && crypto.subtle) {
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(code);
      const hashBuffer = await crypto.subtle.digest("SHA-256", data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    } catch {
      // Fall through to the simple fallback below.
    }
  }
  // Insecure-context fallback: djb2 hash, zero-padded to 64 hex chars so the
  // string length matches SHA-256 output and round-trip verification still works.
  let h = 5381;
  for (let i = 0; i < code.length; i++) {
    h = ((h << 5) + h) ^ code.charCodeAt(i);
    h = h >>> 0; // keep as unsigned 32-bit
  }
  return h.toString(16).padStart(8, "0").repeat(8);
}

/**
 * Verify a code against a stored hash.
 */
export async function verifyImportCode(
  envelope: SyncEnvelopeV2,
  code: string
): Promise<boolean> {
  if (!envelope.codeHash) return true; // No code required (archive or legacy)
  const inputHash = await hashCode(code);
  return inputHash === envelope.codeHash;
}

// ==================== DATE HELPERS ====================

/**
 * Generate array of YYYY-MM-DD date strings between start and end (inclusive).
 */
export function getDateRange(startDate: string, endDate: string): string[] {
  if (!isValidDate(startDate)) throw new Error(`Invalid startDate: ${startDate}`);
  if (!isValidDate(endDate)) throw new Error(`Invalid endDate: ${endDate}`);

  const dates: string[] = [];
  const start = new Date(startDate + "T00:00:00");
  const end = new Date(endDate + "T00:00:00");

  const current = new Date(start);
  while (current <= end) {
    dates.push(current.toISOString().split("T")[0]);
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

// ==================== EXPORT FUNCTIONS ====================

/**
 * Get a quick preview of item counts for each category.
 * Optional userIds filter restricts to items owned by specific users.
 */
export async function getExportPreview(
  tripId: string,
  dates: string[],
  categoryKeys: SyncCategory[],
  userIds?: string[]
): Promise<Record<string, number>> {
  const payload = await pwaToSyncPayload(tripId, dates, userIds);
  const counts: Record<string, number> = {};

  for (const catKey of categoryKeys) {
    const meta = CATEGORY_META[catKey];
    if (!meta) continue;
    const payloadKey = meta.payloadKey as keyof SyncPayload;
    const items = payload[payloadKey];
    counts[catKey] = Array.isArray(items) ? items.length : 0;
  }

  return counts;
}

/**
 * Build a v2.0 export envelope with selected categories.
 * For sync type, generates a 6-digit code and includes its hash.
 * Optional userIds filter restricts to items owned by specific users.
 * Optional exportedByName overrides the exportedBy field (e.g., user name).
 */
export async function buildExportEnvelope(
  tripId: string,
  dates: string[],
  categoryKeys: SyncCategory[],
  tripName: string,
  type: "sync" | "archive" = "sync",
  userIds?: string[],
  exportedByName?: string
): Promise<{ envelope: SyncEnvelopeV2; code: string | null }> {
  const fullPayload = await pwaToSyncPayload(tripId, dates, userIds);
  const filteredPayload = filterPayloadByCategories(fullPayload, categoryKeys);

  // Generate code for sync mode
  let code: string | null = null;
  let codeHash: string | undefined;
  if (type === "sync") {
    code = generateSyncCode();
    codeHash = await hashCode(code);
  }

  // Use provided name, or fall back to trip name
  const trip = await db.trips.get(tripId);
  const exportedBy = exportedByName || trip?.name || tripName || "PWA Export";

  const exportedByUserId = useAppStore.getState().currentUserId;

  const envelope: SyncEnvelopeV2 = {
    version: "2.0",
    type,
    source: "pwa",
    encrypted: false,
    exportDate: new Date().toISOString(),
    exportedBy,
    exportedByUserId,
    categories: categoryKeys,
    dateRange: {
      startDate: dates[0] || "",
      endDate: dates[dates.length - 1] || "",
    },
    ...(codeHash ? { codeHash } : {}),
    data: filteredPayload,
  };

  return { envelope, code };
}

/**
 * Filter a SyncPayload to only include items from selected categories.
 */
function filterPayloadByCategories(
  payload: SyncPayload,
  categoryKeys: SyncCategory[]
): SyncPayload {
  const filtered: SyncPayload = {
    rides: [],
    shows: [],
    dining: [],
    wishes: [],
    outfits: [],
    equipment: [],
    sundries: [],
    shopping: [],
    places: [],
    photos: [],
    dayItems: [],
  };

  if (categoryKeys.includes("rides")) filtered.rides = payload.rides || [];
  if (categoryKeys.includes("shows")) filtered.shows = payload.shows || [];
  if (categoryKeys.includes("dining")) filtered.dining = payload.dining || [];
  if (categoryKeys.includes("wishes")) filtered.wishes = payload.wishes || [];
  if (categoryKeys.includes("outfits"))
    filtered.outfits = payload.outfits || [];
  if (categoryKeys.includes("equipment"))
    filtered.equipment = payload.equipment || [];
  if (categoryKeys.includes("sundries"))
    filtered.sundries = payload.sundries || [];
  if (categoryKeys.includes("shopping"))
    filtered.shopping = payload.shopping || [];
  // PWA doesn't create custom places yet (no importPlaces round-trip in that
  // direction), so payload.places is always empty coming from pwaToSyncPayload
  // — kept here for symmetry with mobile's filterPayloadByCategories and so
  // the "places" checkbox behaves consistently if that ever changes.
  if (categoryKeys.includes("places"))
    filtered.places = payload.places || [];

  // Photos: include if any photo-bearing category is selected
  const photoCategories: SyncCategory[] = [
    "outfits",
    "equipment",
    "sundries",
    "shopping",
    "wishes",
    "places",
  ];
  if (categoryKeys.some((k) => photoCategories.includes(k))) {
    filtered.photos = payload.photos || [];
  }

  if (categoryKeys.includes("trail") && payload.trails) {
    filtered.trails = payload.trails;
  }

  if (categoryKeys.includes("day_items")) {
    filtered.dayItems = payload.dayItems || [];
  }

  if (categoryKeys.includes("scheduled_events")) {
    filtered.scheduledEvents = payload.scheduledEvents || [];
  }

  return filtered;
}

/**
 * Returns true on iOS / Android where the native share sheet is genuinely
 * useful (AirDrop to another device, Save to Files, share to app, etc.).
 * On macOS / Windows / Linux the share sheet only shows AirDrop / Mail /
 * Messages with no "Save to Downloads" option, so we skip it there.
 */
function isMobileShareSupported(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
}

/**
 * Try Web Share API (mobile share sheet) first, fall back to anchor download.
 * Share sheet is only used on iOS/Android where it has a "Save to Files"
 * option. On macOS/desktop the file goes straight to the Downloads folder.
 */
async function shareOrDownload(blob: Blob, filename: string): Promise<void> {
  if (isMobileShareSupported() && typeof navigator !== "undefined" && navigator.canShare) {
    const file = new File([blob], filename, { type: "application/json" });
    if (navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file] });
        return;
      } catch (err) {
        // User cancelled share sheet — that's fine, don't fall through to download
        if (err instanceof Error && err.name === "AbortError") return;
        // Other errors: fall through to download
      }
    }
  }
  // Anchor download: macOS always lands here; iOS/Android only if share fails
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Share or download a JSON file. Uses Web Share API on mobile (opens iOS/Android
 * share sheet) with fallback to anchor download on desktop.
 */
export async function downloadExportFile(
  envelope: SyncEnvelopeV2,
  tripName: string,
  userName?: string
): Promise<void> {
  const jsonString = JSON.stringify(envelope, null, 2);
  const blob = new Blob([jsonString], { type: "application/json" });

  const safeTripName = (tripName || "ParQwish-Export")
    .replace(/[^a-zA-Z0-9-_ ]/g, "")
    .replace(/\s+/g, "-");
  const safeUserName = userName
    ? `-${userName.replace(/[^a-zA-Z0-9-_ ]/g, "").replace(/\s+/g, "-")}`
    : "";
  const dateStr = new Date().toISOString().split("T")[0];
  const filename = `ParQwish-${safeTripName}${safeUserName}-${dateStr}.json`;

  await shareOrDownload(blob, filename);
}

// ==================== IMPORT FUNCTIONS ====================

/**
 * Parse an import file and extract metadata.
 * Handles v2.0, v1.0 (legacy), and legacy wish-list format.
 */
export async function parseImportFile(
  file: File
): Promise<{
  envelope: SyncEnvelopeV2;
  metadata: ImportPreview;
}> {
  const text = await file.text();
  const parsed = JSON.parse(text);

  // Format recognition lives entirely in this chain — no separate upfront
  // guard — so a format's own branch condition is the only place that
  // decides whether it's accepted. A previous version had a duplicate
  // "is this a recognized shape" check ahead of this chain that didn't
  // stay in sync with it, silently making the v1.0 branch below dead code.
  let envelope: SyncEnvelopeV2;

  if (parsed.version === "2.0" && isValidEnvelope(parsed)) {
    envelope = parsed as unknown as SyncEnvelopeV2;
  } else if (parsed.version === "1.0" && parsed.items) {
    envelope = convertV1ToV2(parsed);
  } else if (parsed.wishes && Array.isArray(parsed.wishes)) {
    envelope = convertWishExportToV2(parsed);
  } else {
    throw new Error("Unrecognized file format");
  }

  const metadata = getImportPreview(envelope);
  return { envelope, metadata };
}

export interface ImportPreview {
  categories: SyncCategory[];
  dateRange: { startDate: string; endDate: string };
  itemCounts: Record<string, number>;
  source: string;
  exportDate: string;
  exportedBy: string;
  requiresCode: boolean;
  type: string;
}

/**
 * Get a preview of what's in an import envelope.
 */
export function getImportPreview(envelope: SyncEnvelopeV2): ImportPreview {
  const data = envelope.data || ({} as SyncPayload);
  const itemCounts: Record<string, number> = {};

  for (const catKey of ALL_CATEGORIES) {
    const meta = CATEGORY_META[catKey];
    if (!meta) continue;
    const payloadKey = meta.payloadKey as keyof SyncPayload;
    const items = data[payloadKey];
    itemCounts[catKey] = Array.isArray(items) ? items.length : 0;
  }

  return {
    categories: (envelope.categories || []) as SyncCategory[],
    dateRange: envelope.dateRange || { startDate: "", endDate: "" },
    itemCounts,
    source: envelope.source || "unknown",
    exportDate: envelope.exportDate || "",
    exportedBy: envelope.exportedBy || "Unknown",
    requiresCode: !!envelope.codeHash,
    type: envelope.type || "archive",
  };
}

/**
 * Execute the import into Dexie IndexedDB.
 * Optional userId stamps all imported items with that user.
 */
export async function executeImport(
  envelope: SyncEnvelopeV2,
  tripId: string,
  mode: ImportMode = "merge",
  userId?: string
): Promise<Record<string, number>> {
  const data = envelope.data;
  if (!data) throw new Error("No data in envelope");

  if (mode === "replace") {
    // For replace mode, clear existing trip data for the matching categories
    // only — not the whole junction table. tripWishSelections holds rides,
    // shows, AND wishes together (one table for all three), and
    // tripPackingSelections holds dining, outfits, equipment, sundries, AND
    // shopping together, so a selection's own category has to be resolved
    // via its underlying wish/packingItem before deciding whether to delete it.
    const categories = envelope.categories || ALL_CATEGORIES;
    const categorySet = new Set(categories);

    // wishTagToSyncCategory can also return "dining" — a dining-tagged wish
    // created directly via the catalog UI (not through file import, which
    // always writes dining to the packing side, see importDining) can still
    // live in the wish table, so "dining" has to be checked here too.
    const wishCategoriesToClear = new Set(
      (["rides", "shows", "dining", "wishes"] as const).filter((c) => categorySet.has(c))
    );
    if (wishCategoriesToClear.size > 0) {
      const wishSels = await db.tripWishSelections
        .where("tripId")
        .equals(tripId)
        .toArray();
      const wishes = await db.wishes.bulkGet(wishSels.map((ws) => ws.wishId));
      const idsToDelete = wishSels
        .filter((_, i) => {
          const wish = wishes[i];
          const cat = wish ? wishTagToSyncCategory(wish.tags) : undefined;
          return cat && wishCategoriesToClear.has(cat);
        })
        .map((ws) => ws.id);
      await db.tripWishSelections.bulkDelete(idsToDelete);
    }

    const PACKING_TYPE_TO_CATEGORY: Record<string, "dining" | "outfits" | "equipment" | "sundries" | "shopping"> = {
      dining: "dining", outfit: "outfits", equipment: "equipment", sundry: "sundries", shopping: "shopping",
    };
    const packingCategoriesToClear = new Set(
      (["dining", "outfits", "equipment", "sundries", "shopping"] as const).filter((c) => categorySet.has(c))
    );
    if (packingCategoriesToClear.size > 0) {
      const packSels = await db.tripPackingSelections
        .where("tripId")
        .equals(tripId)
        .toArray();
      const items = await db.packingItems.bulkGet(packSels.map((ps) => ps.itemId));
      const idsToDelete = packSels
        .filter((_, i) => {
          const item = items[i];
          const cat = item ? PACKING_TYPE_TO_CATEGORY[item.type] : undefined;
          return cat && packingCategoriesToClear.has(cat);
        })
        .map((ps) => ps.id);
      await db.tripPackingSelections.bulkDelete(idsToDelete);
    }

    // Itinerary items are only ever created by the rides/shows/dining
    // importers below (and only when the source item had a date) — clear
    // just the ones matching a selected category rather than every itinerary
    // item for the trip, which would also wipe manually-scheduled items of
    // other types (e.g. "place"/"shopping"/"wish") that this import will
    // never recreate.
    const ITIN_TYPE_TO_CATEGORY: Record<string, "rides" | "shows" | "dining"> = {
      ride: "rides", show: "shows", dining: "dining",
    };
    const itinCategoriesToClear = new Set(
      (["rides", "shows", "dining"] as const).filter((c) => categorySet.has(c))
    );
    if (itinCategoriesToClear.size > 0) {
      const itinItems = await db.itineraryItems
        .where("tripId")
        .equals(tripId)
        .toArray();
      const idsToDelete = itinItems
        .filter((i) => {
          const cat = i.itemType ? ITIN_TYPE_TO_CATEGORY[i.itemType] : undefined;
          return cat && itinCategoriesToClear.has(cat);
        })
        .map((i) => i.id);
      await db.itineraryItems.bulkDelete(idsToDelete);
    }

    // Remove scheduled events for this trip (if category is included)
    if (categories.includes("scheduled_events")) {
      const schedItems = await db.scheduledEvents
        .where("tripId")
        .equals(tripId)
        .toArray();
      await db.scheduledEvents.bulkDelete(schedItems.map((e) => e.id));
    }

    // Remove day items for this trip (if category is included)
    if (categories.includes("day_items")) {
      const dayItemRows = await db.dayItems
        .where("tripId")
        .equals(tripId)
        .toArray();
      await db.dayItems.bulkDelete(dayItemRows.map((d) => d.id));
    }

    // Remove GPS trails for this trip (if category is included)
    if (categories.includes("trail")) {
      const trailRows = await db.trails
        .where("tripId")
        .equals(tripId)
        .toArray();
      await db.trails.bulkDelete(trailRows.map((t) => t.id));
    }
  }

  const counts = await syncPayloadToPwa(data, tripId, userId);
  return counts;
}

// ==================== PHOTO ZIP IMPORT ====================

export interface PhotoImportResult {
  linked: number;
  created: number;
  skipped: number;
  skippedReasons: { notFound: number };
}

/**
 * Import a zip file produced by mobile's Photo Gallery "Export Zip" action.
 * Reads manifest.json + the referenced image files, then delegates the
 * actual Dexie writes (with two-tier id→name matching) to sync-translate.ts.
 * tripId/userId (when known) let an unmatched Place photo auto-create its
 * wish instead of being skipped — see linkPhotoManifest() for why.
 */
export async function importPhotoZip(
  file: File,
  tripId?: string,
  userId?: string
): Promise<PhotoImportResult> {
  const zip = await JSZip.loadAsync(await file.arrayBuffer());

  const manifestFile = zip.file("manifest.json");
  if (!manifestFile) {
    throw new Error("Not a valid photo export — missing manifest.json");
  }
  const manifestText = await manifestFile.async("text");
  const manifest = JSON.parse(manifestText) as PhotoZipManifest;

  if (manifest.version !== "1.0" || !Array.isArray(manifest.photos)) {
    throw new Error("Unrecognized photo manifest format");
  }

  const entries: Array<{ entry: PhotoManifestEntry; dataUri: string }> = [];
  for (const entry of manifest.photos) {
    const imgFile = zip.file(entry.filename);
    if (!imgFile) {
      console.warn("[UniversalSync] manifest references missing file:", entry.filename);
      continue;
    }
    const base64 = await imgFile.async("base64");
    const mimeType = entry.filename.endsWith(".png") ? "image/png" : "image/jpeg";
    entries.push({ entry, dataUri: `data:${mimeType};base64,${base64}` });
  }

  return linkPhotoManifest(entries, tripId, userId);
}

// ==================== LEGACY FORMAT CONVERTERS ====================

function convertV1ToV2(
  v1: { version: string; source: string; timestamp: string; dates: string[]; items: SyncPayload }
): SyncEnvelopeV2 {
  const dates = v1.dates || [];
  return {
    version: "2.0",
    type: "archive",
    source: (v1.source as "mobile" | "pwa") || "mobile",
    encrypted: false,
    exportDate: v1.timestamp || new Date().toISOString(),
    exportedBy: "Legacy Import",
    categories: detectCategoriesFromPayload(v1.items),
    dateRange: {
      startDate: dates[0] || new Date().toISOString().split("T")[0],
      endDate:
        dates[dates.length - 1] || new Date().toISOString().split("T")[0],
    },
    data: v1.items,
  };
}

function convertWishExportToV2(
  wishData: { exportedBy?: string; exportDate?: string; wishes: Array<Record<string, unknown>> }
): SyncEnvelopeV2 {
  const today = new Date().toISOString().split("T")[0];
  const wishes = (wishData.wishes || []).map(
    (w: Record<string, unknown>, i: number) => ({
      id:
        (w.id as string) || `wish_import_${Date.now()}_${i}`,
      title: (w.title as string) || (w.name as string) || "",
      description: (w.description as string) || "",
      tags: (w.tags as string[]) || [],
      priority: (w.priority as string) || "C",
      completed: (w.completed as boolean) || false,
      url: (w.url as string) || "",
      notes: (w.notes as string) || "",
      date: today,
    })
  );

  return {
    version: "2.0",
    type: "archive",
    source: "mobile",
    encrypted: false,
    exportDate: wishData.exportDate || new Date().toISOString(),
    exportedBy: wishData.exportedBy || "Legacy Import",
    categories: ["wishes"],
    dateRange: { startDate: today, endDate: today },
    data: {
      rides: [],
      shows: [],
      dining: [],
      wishes,
      outfits: [],
      equipment: [],
      sundries: [],
      shopping: [],
      places: [],
      photos: [],
    },
  };
}

function detectCategoriesFromPayload(payload: SyncPayload): SyncCategory[] {
  if (!payload) return [];
  const cats: SyncCategory[] = [];
  if (payload.rides?.length > 0) cats.push("rides");
  if (payload.shows?.length > 0) cats.push("shows");
  if (payload.dining?.length > 0) cats.push("dining");
  if (payload.wishes?.length > 0) cats.push("wishes");
  if (payload.outfits?.length > 0) cats.push("outfits");
  if (payload.equipment?.length > 0) cats.push("equipment");
  if (payload.sundries?.length > 0) cats.push("sundries");
  if (payload.shopping?.length > 0) cats.push("shopping");
  if ((payload.places?.length ?? 0) > 0) cats.push("places");
  if ((payload.trails?.length ?? 0) > 0) cats.push("trail");
  if ((payload.scheduledEvents?.length ?? 0) > 0) cats.push("scheduled_events");
  if ((payload.dayItems?.length ?? 0) > 0) cats.push("day_items");
  return cats;
}

// ==================== DATE REMAPPING ====================

/**
 * Remap all dates in a sync payload to a new date range and reset completed status.
 * The new range must cover the same number of days as the original.
 */
export function remapPayloadDates(
  envelope: SyncEnvelopeV2,
  newStartDate: string
): SyncEnvelopeV2 {
  if (!isValidDate(newStartDate)) throw new Error(`Invalid newStartDate: ${newStartDate}`);

  const data = envelope.data;

  // Collect all unique dates from payload
  const dateSet = new Set<string>();
  const arrays: unknown[][] = [data.rides, data.shows, data.dining, data.wishes, data.outfits, data.equipment, data.sundries, data.shopping];
  for (const arr of arrays) {
    if (arr) for (const item of arr) {
      const rec = item as { date?: string };
      if (rec.date) dateSet.add(rec.date);
    }
  }
  const originalDates = Array.from(dateSet).sort();
  if (originalDates.length === 0) return envelope;

  // Build date mapping preserving day offsets
  const originBase = new Date(originalDates[0] + "T00:00:00");
  const newBase = new Date(newStartDate + "T00:00:00");
  const dateMap: Record<string, string> = {};
  for (const origDate of originalDates) {
    const orig = new Date(origDate + "T00:00:00");
    const dayOffset = Math.round((orig.getTime() - originBase.getTime()) / 86400000);
    const newDate = new Date(newBase.getTime() + dayOffset * 86400000);
    dateMap[origDate] = newDate.toISOString().split("T")[0];
  }

  // Remap helper — works on any sync item type
  function remapItem<T>(item: T): T {
    const remapped = { ...item } as T & { date?: string; completed?: boolean; purchased?: boolean };
    if (typeof remapped.date === "string" && dateMap[remapped.date]) {
      remapped.date = dateMap[remapped.date];
    }
    if ("completed" in remapped) remapped.completed = false;
    if ("purchased" in remapped) remapped.purchased = false;
    return remapped as T;
  }

  const newData: SyncPayload = {
    rides: (data.rides || []).map(remapItem),
    shows: (data.shows || []).map(remapItem),
    dining: (data.dining || []).map(remapItem),
    wishes: (data.wishes || []).map(remapItem),
    outfits: (data.outfits || []).map(remapItem),
    equipment: (data.equipment || []).map(remapItem),
    sundries: (data.sundries || []).map(remapItem),
    shopping: (data.shopping || []).map(remapItem),
    photos: data.photos || [],
    places: (data.places || []).map(remapItem),
    trails: data.trails || [],
    scheduledEvents: (data.scheduledEvents || []).map(remapItem),
    dayItems: (data.dayItems || []).map(remapItem),
  };

  const lastOriginal = originalDates[originalDates.length - 1];
  const newEndDate = dateMap[lastOriginal] || newStartDate;

  return {
    ...envelope,
    dateRange: { startDate: newStartDate, endDate: newEndDate },
    data: newData,
  };
}

// ==================== CATALOG EXPORT/IMPORT ====================

/** Envelope shape for catalog-only exports (not date/trip-specific). */
export interface CatalogExportEnvelope {
  version: "2.0";
  type: "catalog";
  source: "pwa";
  exportDate: string;
  wishes: Array<Record<string, unknown>>;
  packingItems: Array<Record<string, unknown>>;
  ensembles: Array<Record<string, unknown>>;
}

/**
 * Export the entire catalog (wishes, packing items, ensembles).
 * Returns the envelope and triggers browser download.
 */
export async function exportCatalog(): Promise<CatalogExportEnvelope> {
  const wishes = await db.wishes.toArray();
  const packingItems = await db.packingItems.toArray();
  const ensembles = await db.ensembles.toArray();

  const envelope: CatalogExportEnvelope = {
    version: "2.0",
    type: "catalog",
    source: "pwa",
    exportDate: new Date().toISOString(),
    wishes: wishes as unknown as Array<Record<string, unknown>>,
    packingItems: packingItems as unknown as Array<Record<string, unknown>>,
    ensembles: ensembles as unknown as Array<Record<string, unknown>>,
  };

  return envelope;
}

/**
 * Import a catalog export file. Merge mode skips existing IDs; replace clears first.
 */
export async function importCatalog(
  envelope: CatalogExportEnvelope,
  mode: ImportMode = "merge"
): Promise<{ wishes: number; packingItems: number; ensembles: number }> {
  const counts = { wishes: 0, packingItems: 0, ensembles: 0 };

  if (mode === "replace") {
    await db.wishes.clear();
    await db.packingItems.clear();
    await db.ensembles.clear();
  }

  // Import wishes
  for (const w of envelope.wishes || []) {
    const wish = w as unknown as { id: string };
    if (!wish.id) continue;
    if (mode === "merge") {
      const existing = await db.wishes.get(wish.id);
      if (existing) continue;
    }
    await db.wishes.put(w as never);
    counts.wishes++;
  }

  // Import packing items
  for (const p of envelope.packingItems || []) {
    const item = p as unknown as { id: string };
    if (!item.id) continue;
    if (mode === "merge") {
      const existing = await db.packingItems.get(item.id);
      if (existing) continue;
    }
    await db.packingItems.put(p as never);
    counts.packingItems++;
  }

  // Import ensembles
  for (const e of envelope.ensembles || []) {
    const ens = e as unknown as { id: string };
    if (!ens.id) continue;
    if (mode === "merge") {
      const existing = await db.ensembles.get(ens.id);
      if (existing) continue;
    }
    await db.ensembles.put(e as never);
    counts.ensembles++;
  }

  return counts;
}

// ==================== TEMPLATE EXPORT/IMPORT ====================

/** Envelope shape for template exports. */
export interface TemplateExportEnvelope {
  version: "2.0";
  type: "template";
  source: "pwa";
  exportDate: string;
  templates: Array<Record<string, unknown>>;
  /** Wish selections per template (keyed by tripId) */
  wishSelections: Record<string, Array<Record<string, unknown>>>;
  /** Packing selections per template (keyed by tripId) */
  packingSelections: Record<string, Array<Record<string, unknown>>>;
}

/**
 * Export all template trips with their selections.
 */
export async function exportTemplates(): Promise<TemplateExportEnvelope> {
  const templates = await db.trips.where("isTemplate").equals(1).toArray();

  const wishSelections: Record<string, Array<Record<string, unknown>>> = {};
  const packingSelections: Record<string, Array<Record<string, unknown>>> = {};

  for (const t of templates) {
    const ws = await db.tripWishSelections.where("tripId").equals(t.id).toArray();
    wishSelections[t.id] = ws as unknown as Array<Record<string, unknown>>;

    const ps = await db.tripPackingSelections.where("tripId").equals(t.id).toArray();
    packingSelections[t.id] = ps as unknown as Array<Record<string, unknown>>;
  }

  return {
    version: "2.0",
    type: "template",
    source: "pwa",
    exportDate: new Date().toISOString(),
    templates: templates as unknown as Array<Record<string, unknown>>,
    wishSelections,
    packingSelections,
  };
}

/**
 * Import template trips with their selections. Merge skips existing; replace clears first.
 */
export async function importTemplates(
  envelope: TemplateExportEnvelope,
  mode: ImportMode = "merge"
): Promise<{ templates: number; wishSelections: number; packingSelections: number }> {
  const counts = { templates: 0, wishSelections: 0, packingSelections: 0 };

  if (mode === "replace") {
    // Only remove template trips
    const existing = await db.trips.where("isTemplate").equals(1).toArray();
    for (const t of existing) {
      await db.tripWishSelections.where("tripId").equals(t.id).delete();
      await db.tripPackingSelections.where("tripId").equals(t.id).delete();
    }
    await db.trips.bulkDelete(existing.map((t) => t.id));
  }

  for (const t of envelope.templates || []) {
    const trip = t as unknown as { id: string };
    if (!trip.id) continue;
    if (mode === "merge") {
      const existing = await db.trips.get(trip.id);
      if (existing) continue;
    }
    await db.trips.put(t as never);
    counts.templates++;

    // Import associated wish selections
    for (const ws of envelope.wishSelections?.[trip.id] || []) {
      const sel = ws as unknown as { id: string };
      if (!sel.id) continue;
      if (mode === "merge") {
        const existing = await db.tripWishSelections.get(sel.id);
        if (existing) continue;
      }
      await db.tripWishSelections.put(ws as never);
      counts.wishSelections++;
    }

    // Import associated packing selections
    for (const ps of envelope.packingSelections?.[trip.id] || []) {
      const sel = ps as unknown as { id: string };
      if (!sel.id) continue;
      if (mode === "merge") {
        const existing = await db.tripPackingSelections.get(sel.id);
        if (existing) continue;
      }
      await db.tripPackingSelections.put(ps as never);
      counts.packingSelections++;
    }
  }

  return counts;
}

/**
 * Generic share/download helper for any JSON envelope.
 */
export async function downloadJsonFile(
  data: Record<string, unknown>,
  prefix: string
): Promise<void> {
  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: "application/json" });

  const dateStr = new Date().toISOString().split("T")[0];
  const filename = `ParQwish-${prefix}-${dateStr}.json`;

  await shareOrDownload(blob, filename);
}

// ==================== FUTURE ENCRYPTION HOOK ====================

/**
 * Placeholder for future AES-256-GCM decryption.
 * Currently returns the envelope as-is.
 */
export async function decryptEnvelope(
  envelope: SyncEnvelopeV2,
  // Future: code will be used for AES-256-GCM decryption
  code: string // eslint-disable-line @typescript-eslint/no-unused-vars
): Promise<SyncEnvelopeV2> {
  return envelope;
}
