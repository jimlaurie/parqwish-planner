// ==================== AI EXPORT ====================
// Builds an AI-friendly package from this trip's Publish data — a flat,
// narrative-shaped JSON (day-by-day, plain-language fields) plus a matching
// zip of full-resolution photos — so the user can paste/attach it into
// whatever AI chat they already use to draft a trip recap, captions, or a
// highlight script. Deliberately NOT the sync wire format (SyncEnvelopeV2):
// that's built for merge/replace round-tripping between devices (internal
// IDs, tombstones, parkDataId) — noise for an LLM prompt. This is a
// separate, purpose-built transform reading the same usePublishData() shape
// the rest of the Publish page already renders from.

import JSZip from "jszip";
import type { PublishData } from "@/hooks/use-publish-data";
import type { TripTrail } from "@/lib/db";

// ==================== TYPES ====================

export interface AIExportItem {
  time: string | null; // "9:15 AM" or null for Anytime items
  type: string;         // "ride", "show", "dining", ...
  title: string;
  land?: string;
  park?: string;
  notes?: string;
  completed: boolean;
}

export interface AIExportDay {
  date: string;
  dayOfTrip: number;
  displayDate: string;
  items: AIExportItem[];
  photoCount: number;
  walkingMiles: number | null;
  walkingMinutes: number | null;
}

export interface AIExportPackage {
  generatedAt: string;
  trip: {
    name: string;
    startDate: string;
    endDate: string;
    nights: number;
    hotels: string[];
    notes?: string;
  };
  days: AIExportDay[];
  overallStats: {
    itemsCompleted: number;
    itemsPlanned: number;
    photosTaken: number;
    milesWalked: number | null;
    favoriteLand: string | null;
  };
  hasGpsTrails: boolean;
}

// ==================== HELPERS ====================

function to12Hour(hhmm?: string): string | null {
  if (!hhmm) return null;
  const [hStr, mStr] = hhmm.split(":");
  let h = parseInt(hStr, 10);
  const period = h >= 12 ? "PM" : "AM";
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;
  return `${h}:${mStr} ${period}`;
}

function daysBetweenInclusive(start: string, end: string): number {
  const a = new Date(start + "T12:00:00");
  const b = new Date(end + "T12:00:00");
  return Math.round((b.getTime() - a.getTime()) / 86400000) + 1;
}

// ==================== BUILD PACKAGE ====================

/**
 * Builds the AI-friendly trip package. `trails` is optional — pass the
 * trip's TripTrail rows (from `db.trails`) when available to fold GPS
 * walking-distance stats into each day and the overall totals.
 */
export function buildAIExportPackage(
  data: PublishData,
  trails: TripTrail[] = []
): AIExportPackage {
  const { trip } = data;

  const trailsByDate = new Map<string, TripTrail[]>();
  for (const t of trails) {
    const list = trailsByDate.get(t.date) ?? [];
    list.push(t);
    trailsByDate.set(t.date, list);
  }

  const landCounts: Record<string, number> = {};

  const days: AIExportDay[] = data.days.map((day, idx) => {
    const items: AIExportItem[] = day.items.map((item) => {
      if (item.land) landCounts[item.land] = (landCounts[item.land] ?? 0) + 1;
      return {
        time: to12Hour(item.scheduledTime),
        type: item.itemType,
        title: item.title,
        land: item.land || undefined,
        park: item.park || undefined,
        notes: item.notes || undefined,
        completed: item.completed,
      };
    });

    const dayTrails = trailsByDate.get(day.date) ?? [];
    const walkingMiles = dayTrails.length > 0
      ? Math.round(dayTrails.reduce((sum, t) => sum + t.distanceMiles, 0) * 10) / 10
      : null;
    const walkingMinutes = dayTrails.length > 0
      ? Math.round(dayTrails.reduce((sum, t) => sum + t.durationMinutes, 0))
      : null;

    // Only itineraryItems (DayItemRecord) carry a date — wish/packing
    // photos in allPhotos aren't day-scoped in this data model, so day-level
    // counts come straight from that day's own scheduled items.
    const photoCount = day.items.reduce((sum, item) => sum + (item.photos?.length ?? 0), 0);

    return {
      date: day.date,
      dayOfTrip: idx + 1,
      displayDate: day.displayDate,
      items,
      photoCount,
      walkingMiles,
      walkingMinutes,
    };
  });

  const totalMiles = trails.length > 0
    ? Math.round(trails.reduce((sum, t) => sum + t.distanceMiles, 0) * 10) / 10
    : null;

  const favoriteLand = Object.entries(landCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  const hotelNames = (trip.hotels ?? [])
    .map((h) => h.name)
    .filter((n): n is string => !!n);

  return {
    generatedAt: new Date().toISOString(),
    trip: {
      name: trip.name,
      startDate: trip.startDate,
      endDate: trip.endDate,
      nights: trip.startDate && trip.endDate
        ? Math.max(0, daysBetweenInclusive(trip.startDate, trip.endDate) - 1)
        : 0,
      hotels: hotelNames,
      notes: trip.notes || undefined,
    },
    days,
    overallStats: {
      itemsCompleted: data.completedItineraryItems,
      itemsPlanned: data.totalItineraryItems,
      photosTaken: data.allPhotos.length,
      milesWalked: totalMiles,
      favoriteLand,
    },
    hasGpsTrails: trails.length > 0,
  };
}

// ==================== PROMPT TEMPLATES ====================

export interface AIPromptTemplate {
  id: string;
  label: string;
  description: string;
  build: (pkg: AIExportPackage) => string;
}

export const AI_PROMPT_TEMPLATES: AIPromptTemplate[] = [
  {
    id: "recap-post",
    label: "Trip Recap Blog Post",
    description: "A warm, first-person recap for Medium, a blog, or a family newsletter.",
    build: (pkg) =>
      `Write a warm, first-person trip recap blog post about our ${pkg.trip.name} trip ` +
      `(${pkg.trip.startDate} to ${pkg.trip.endDate}). Use the attached JSON for the ` +
      `day-by-day details — rides, shows, dining, and highlights. Keep it conversational, ` +
      `pick out a few standout moments per day rather than listing everything, and close ` +
      `with an overall highlight. Attached photos are from the trip and can be referenced ` +
      `by day if useful.\n\n[Paste or attach the exported trip-data.json here]`,
  },
  {
    id: "day-captions",
    label: "Day-by-Day Photo Captions",
    description: "Short captions per day, for a scrapbook or photo book.",
    build: (pkg) =>
      `Using the attached JSON for our ${pkg.trip.name} trip, write one short, punchy ` +
      `caption (under 20 words) for each day listed, capturing that day's highlight. ` +
      `Format as a simple numbered list, one caption per day.\n\n` +
      `[Paste or attach the exported trip-data.json here]`,
  },
  {
    id: "highlight-script",
    label: "Highlight Reel Script",
    description: "A short voiceover script for a video recap.",
    build: (pkg) =>
      `Write a short (60-90 second) voiceover script for a highlight reel video of our ` +
      `${pkg.trip.name} trip, based on the attached JSON. Punchy, upbeat, and structured ` +
      `as a handful of beats (not day-by-day) — open strong, hit 3-4 standout moments, ` +
      `close with a warm sign-off.\n\n[Paste or attach the exported trip-data.json here]`,
  },
];

// ==================== DOWNLOAD / COPY HELPERS ====================

function safeName(name: string): string {
  return name.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "") || "trip";
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadAIExportJSON(pkg: AIExportPackage, tripName: string): void {
  const blob = new Blob([JSON.stringify(pkg, null, 2)], { type: "application/json" });
  downloadBlob(blob, `ParQwish-${safeName(tripName)}-trip-data.json`);
}

export async function copyAIExportJSON(pkg: AIExportPackage): Promise<void> {
  await navigator.clipboard.writeText(JSON.stringify(pkg, null, 2));
}

export async function copyPrompt(template: AIPromptTemplate, pkg: AIExportPackage): Promise<void> {
  await navigator.clipboard.writeText(template.build(pkg));
}

// ==================== PHOTOS ZIP ====================

/** Extracts the base64 payload and extension from a data: URI. */
function parseDataUri(dataUri: string): { base64: string; ext: string } | null {
  const match = /^data:image\/(\w+);base64,(.+)$/.exec(dataUri);
  if (!match) return null;
  const ext = match[1] === "jpeg" ? "jpg" : match[1];
  return { base64: match[2], ext };
}

/**
 * Packs full-resolution copies of this trip's photos into a zip, alongside
 * a captions.json manifest (filename -> caption) so a multimodal AI (or the
 * user) can tell which photo is which without re-deriving it.
 */
export async function buildPhotosZip(
  photos: PublishData["allPhotos"],
  excludedIds: Set<string>
): Promise<Blob> {
  const zip = new JSZip();
  const captions: Record<string, string> = {};
  const usedNames = new Set<string>();

  photos
    .filter((p) => !excludedIds.has(p.id))
    .forEach((photo, idx) => {
      const parsed = parseDataUri(photo.full || photo.url);
      if (!parsed) return;
      let filename = `${String(idx + 1).padStart(3, "0")}-${safeName(photo.caption)}.${parsed.ext}`;
      // Guard against two photos landing on the same caption+index (shouldn't
      // happen given the index prefix, but zip entries must be unique).
      let suffix = 1;
      while (usedNames.has(filename)) {
        filename = `${String(idx + 1).padStart(3, "0")}-${safeName(photo.caption)}-${suffix++}.${parsed.ext}`;
      }
      usedNames.add(filename);
      zip.file(filename, parsed.base64, { base64: true });
      captions[filename] = photo.caption;
    });

  zip.file("captions.json", JSON.stringify(captions, null, 2));

  return zip.generateAsync({ type: "blob" });
}

export function downloadPhotosZip(blob: Blob, tripName: string): void {
  downloadBlob(blob, `ParQwish-${safeName(tripName)}-photos.zip`);
}
