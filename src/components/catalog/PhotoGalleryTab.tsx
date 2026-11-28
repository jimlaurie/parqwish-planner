"use client";

// ==================== CATALOG PHOTO GALLERY ====================
// Opens on every photo in the catalog ("All photos", 27 Nov 2026: photos
// imported from Pal attach to their catalog item, which needn't be on the
// trip shown, so they didn't appear); "This trip" narrows to the trip, with
// its dates and Publish's include toggle.
// The management surface for every photo attached to this trip — filter by
// date and linked item type, control what shows up on Publish (shares
// excludedPhotoIds with the Publish page and AI Export, so a toggle here is
// instantly reflected there), link standalone imported photos to one or more
// catalog items, and delete standalone photos. Collection items got on this
// trip show too, and open on the Collection page. Photos already embedded in a
// ride/outfit/collection item are read-only here beyond the Publish toggle — see
// the plan's delete-safety rationale (Wish/PackingItem photos can reach Pal
// on the next Cloud Sync push; TripPhoto never syncs to Pal at all).

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { requestShareOpen } from "@/lib/pending-share";
import { useAllTripPhotos, PHOTO_CATEGORY_CHIPS, type PhotoScope, type TripPhotoEntry } from "@/hooks/use-all-trip-photos";
import { useAppStore } from "@/lib/store";
import { removeTripPhoto, updateTripPhotoLinks } from "@/hooks/use-trip-photos";
import PhotoGalleryCard from "@/components/catalog/PhotoGalleryCard";
import PhotoViewer from "@/components/PhotoViewer";
import { moveTripPhotoToItems, type AttachTarget } from "@/lib/photo-attach";
import PhotoItemLinkerModal from "@/components/catalog/PhotoItemLinkerModal";
import { datesBetween } from "@/lib/dates";

const getDatesBetween = datesBetween;

function formatTabDate(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

interface PhotoGalleryTabProps {
  tripId: string | null;
  tripStartDate?: string;
  tripEndDate?: string;
  onNavigateToItemTab?: (tab: string) => void;
}

export default function PhotoGalleryTab({ tripId, tripStartDate, tripEndDate, onNavigateToItemTab }: PhotoGalleryTabProps) {
  const [scope, setScope] = useState<PhotoScope>("all");
  const tripScope = scope === "trip" && !!tripId;
  const { photos, loading } = useAllTripPhotos(tripId, tripScope ? "trip" : "all");
  const { excludedPhotoIds, togglePhotoExclusion } = useAppStore();
  const [dateFilter, setDateFilter] = useState<string | "all">("all");
  const [categoryFilter, setCategoryFilter] = useState<string | "all">("all");
  const [linkingPhoto, setLinkingPhoto] = useState<TripPhotoEntry | null>(null);
  // The photo open large, by its place among the photos shown
  const [viewing, setViewing] = useState<number | null>(null);
  const router = useRouter();

  // Day chips belong to the trip view; the catalog spans every trip
  const dates = useMemo(
    () => (tripScope && tripStartDate && tripEndDate ? getDatesBetween(tripStartDate, tripEndDate) : []),
    [tripScope, tripStartDate, tripEndDate]
  );

  const excludedSet = useMemo(
    () => new Set(tripId ? (excludedPhotoIds[tripId] ?? []) : []),
    [excludedPhotoIds, tripId]
  );

  const categoriesPresent = useMemo(() => {
    const ids = new Set(photos.map((p) => p.categoryId));
    return PHOTO_CATEGORY_CHIPS.filter((c) => ids.has(c.id));
  }, [photos]);

  const filtered = useMemo(() => {
    return photos.filter((p) => {
      if (tripScope && dateFilter !== "all" && p.date !== dateFilter) return false;
      if (categoryFilter !== "all" && p.categoryId !== categoryFilter) return false;
      return true;
    });
  }, [photos, dateFilter, categoryFilter, tripScope]);

  const scopeChip = (value: PhotoScope, label: string) => (
    <button
      key={value}
      type="button"
      onClick={() => { setScope(value); setDateFilter("all"); }}
      aria-pressed={scope === value}
      className="text-xs px-3 py-1.5 rounded-full cursor-pointer"
      style={{
        backgroundColor: scope === value ? "var(--color-accent-publish)" : "var(--color-surface-raised)",
        color: scope === value ? "#000" : "var(--color-text-muted)",
      }}
    >
      {label}
    </button>
  );

  const handleJumpToItem = (photo: TripPhotoEntry) => {
    // A collection item opens in its editor on the Collection page (as a shared page does)
    if (photo.sourceType === "collection") {
      requestShareOpen({ dest: "collection", itemId: photo.itemId });
      router.push("/collection");
      return;
    }
    if (!onNavigateToItemTab) return;
    if (photo.sourceType === "wish") onNavigateToItemTab("wishes");
    else if (photo.sourceType === "packing") onNavigateToItemTab(photo.categoryId);
  };

  const handleDelete = async (photo: TripPhotoEntry) => {
    if (!confirm("Delete this photo? This can't be undone.")) return;
    await removeTripPhoto(photo.itemId);
  };

  // Add to items: the photo moves onto them (src/lib/photo-attach.ts); a line says where it went
  const [moveNote, setMoveNote] = useState<string | null>(null);
  const handleAddToItems = async (targets: AttachTarget[]) => {
    if (!linkingPhoto) return;
    const photo = { thumbnail: linkingPhoto.thumbnail, display: linkingPhoto.url, full: linkingPhoto.full };
    const result = await moveTripPhotoToItems(linkingPhoto.itemId, photo, targets);
    setLinkingPhoto(null);
    const names = (ts: AttachTarget[]) => ts.map((t) => t.name).join(", ");
    setMoveNote(result.moved
      ? `Moved to ${names(result.placed)}.${result.full.length ? ` ${names(result.full)} already had the most photos.` : ""}`
      : `Not moved: ${names(result.full) || "those items"} already had the most photos.`);
  };

  const handleConfirmLink = async (parkDataIds: string[], wishIds: string[]) => {
    if (!linkingPhoto) return;
    await updateTripPhotoLinks(linkingPhoto.itemId, { parkDataIds, wishIds });
    setLinkingPhoto(null);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Which photos: the whole catalog, or this trip's (with its days and Publish) */}
      <div className="flex items-center gap-2 flex-wrap" role="group" aria-label="Which photos">
        {scopeChip("all", "All photos")}
        {tripId && scopeChip("trip", "This trip")}
      </div>

      {/* Date filter */}
      {dates.length > 1 && (
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setDateFilter("all")}
            className="text-xs px-3 py-1.5 rounded-full cursor-pointer"
            style={{
              backgroundColor: dateFilter === "all" ? "var(--color-accent-publish)" : "var(--color-surface-raised)",
              color: dateFilter === "all" ? "#000" : "var(--color-text-muted)",
            }}
          >
            All dates
          </button>
          {dates.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDateFilter(d)}
              className="text-xs px-3 py-1.5 rounded-full whitespace-nowrap cursor-pointer"
              style={{
                backgroundColor: dateFilter === d ? "var(--color-accent-publish)" : "var(--color-surface-raised)",
                color: dateFilter === d ? "#000" : "var(--color-text-muted)",
              }}
            >
              {formatTabDate(d)}
            </button>
          ))}
        </div>
      )}

      {/* Category filter */}
      {categoriesPresent.length > 1 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => setCategoryFilter("all")}
            className="text-xs px-3 py-1 rounded-full cursor-pointer"
            style={{
              backgroundColor: categoryFilter === "all" ? "color-mix(in srgb, var(--color-accent-publish) 18%, transparent)" : "transparent",
              color: categoryFilter === "all" ? "var(--color-accent-publish)" : "var(--color-text-dim)",
              border: `1px solid ${categoryFilter === "all" ? "var(--color-accent-publish)" : "var(--color-border-subtle)"}`,
            }}
          >
            All
          </button>
          {categoriesPresent.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCategoryFilter(c.id)}
              className="text-xs px-3 py-1 rounded-full cursor-pointer whitespace-nowrap"
              style={{
                backgroundColor: categoryFilter === c.id ? "color-mix(in srgb, var(--color-accent-publish) 18%, transparent)" : "transparent",
                color: categoryFilter === c.id ? "var(--color-accent-publish)" : "var(--color-text-dim)",
                border: `1px solid ${categoryFilter === c.id ? "var(--color-accent-publish)" : "var(--color-border-subtle)"}`,
              }}
            >
              {c.icon} {c.label}
            </button>
          ))}
        </div>
      )}

      {moveNote && (
        <p role="status" className="text-xs px-3 py-2 rounded-lg" style={{ backgroundColor: "var(--color-surface-raised)", color: "var(--color-text-secondary)" }}>
          {moveNote}
        </p>
      )}

      {loading && (
        <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>Loading photos…</p>
      )}

      {!loading && filtered.length === 0 && (
        <p className="text-sm py-8 text-center" style={{ color: "var(--color-text-dim)" }}>
          {photos.length === 0
            ? (tripScope
              ? "No photos on this trip yet — add some from any item, or import from your device on the Play page."
              : "No photos yet — add some from any item, or import Pal's photos from Play.")
            : "No photos match this filter."}
        </p>
      )}

      <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))" }}>
        {filtered.map((photo, index) => (
          <PhotoGalleryCard
            key={photo.id}
            photo={photo}
            onView={() => setViewing(index)}
            excluded={tripScope && excludedSet.has(photo.id)}
            onToggleExclude={tripScope && tripId ? () => togglePhotoExclusion(tripId, photo.id) : undefined}
            onJumpToItem={
              photo.sourceType === "wish" || photo.sourceType === "packing" || photo.sourceType === "collection"
                ? () => handleJumpToItem(photo)
                : undefined
            }
            onLink={photo.sourceType === "tripPhoto" ? () => setLinkingPhoto(photo) : undefined}
            onDelete={photo.sourceType === "tripPhoto" ? () => handleDelete(photo) : undefined}
          />
        ))}
      </div>

      {viewing !== null && filtered[viewing] && (
        <PhotoViewer
          photos={filtered.map((p) => p.full || p.url)}
          captions={filtered.map((p) => p.caption || p.linkedItemTitle)}
          currentIndex={viewing}
          onClose={() => setViewing(null)}
          onChangeIndex={setViewing}
          shareable
        />
      )}

      {linkingPhoto && tripId && (
        <PhotoItemLinkerModal
          tripId={tripId}
          initialParkDataIds={linkingPhoto.linkedParkDataIds ?? []}
          initialWishIds={linkingPhoto.linkedWishIds ?? []}
          onConfirm={handleConfirmLink}
          onAddToItems={(targets) => { void handleAddToItems(targets); }}
          onClose={() => setLinkingPhoto(null)}
        />
      )}
    </div>
  );
}
