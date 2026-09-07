"use client";

// ==================== CATALOG PHOTO GALLERY ====================
// The management surface for every photo attached to this trip — filter by
// date and linked item type, control what shows up on Publish (shares
// excludedPhotoIds with the Publish page and AI Export, so a toggle here is
// instantly reflected there), link standalone imported photos to one or more
// catalog items, and delete standalone photos. Photos already embedded in a
// ride/outfit/etc. item are read-only here beyond the Publish toggle — see
// the plan's delete-safety rationale (Wish/PackingItem photos can reach Pal
// on the next Cloud Sync push; TripPhoto never syncs to Pal at all).

import { useMemo, useState } from "react";
import { useAllTripPhotos, PHOTO_CATEGORY_CHIPS, type TripPhotoEntry } from "@/hooks/use-all-trip-photos";
import { useAppStore } from "@/lib/store";
import { removeTripPhoto, updateTripPhotoLinks } from "@/hooks/use-trip-photos";
import PhotoGalleryCard from "@/components/catalog/PhotoGalleryCard";
import PhotoItemLinkerModal from "@/components/catalog/PhotoItemLinkerModal";

function getDatesBetween(start: string, end: string): string[] {
  const dates: string[] = [];
  const current = new Date(start + "T12:00:00");
  const last = new Date(end + "T12:00:00");
  while (current <= last) {
    dates.push(current.toISOString().slice(0, 10));
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

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
  const { photos, loading } = useAllTripPhotos(tripId);
  const { excludedPhotoIds, togglePhotoExclusion } = useAppStore();
  const [dateFilter, setDateFilter] = useState<string | "all">("all");
  const [categoryFilter, setCategoryFilter] = useState<string | "all">("all");
  const [linkingPhoto, setLinkingPhoto] = useState<TripPhotoEntry | null>(null);

  const dates = useMemo(
    () => (tripStartDate && tripEndDate ? getDatesBetween(tripStartDate, tripEndDate) : []),
    [tripStartDate, tripEndDate]
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
      if (dateFilter !== "all" && p.date !== dateFilter) return false;
      if (categoryFilter !== "all" && p.categoryId !== categoryFilter) return false;
      return true;
    });
  }, [photos, dateFilter, categoryFilter]);

  const handleJumpToItem = (photo: TripPhotoEntry) => {
    if (!onNavigateToItemTab) return;
    if (photo.sourceType === "wish") onNavigateToItemTab("wishes");
    else if (photo.sourceType === "packing") onNavigateToItemTab(photo.categoryId);
  };

  const handleDelete = async (photo: TripPhotoEntry) => {
    if (!confirm("Delete this photo? This can't be undone.")) return;
    await removeTripPhoto(photo.itemId);
  };

  const handleConfirmLink = async (parkDataIds: string[], wishIds: string[]) => {
    if (!linkingPhoto) return;
    await updateTripPhotoLinks(linkingPhoto.itemId, { parkDataIds, wishIds });
    setLinkingPhoto(null);
  };

  if (!tripId) return null;

  return (
    <div className="flex flex-col gap-4">
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

      {loading && (
        <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>Loading photos…</p>
      )}

      {!loading && filtered.length === 0 && (
        <p className="text-sm py-8 text-center" style={{ color: "var(--color-text-dim)" }}>
          {photos.length === 0
            ? "No photos on this trip yet — add some from any item, or import from your device on the Play page."
            : "No photos match this filter."}
        </p>
      )}

      <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))" }}>
        {filtered.map((photo) => (
          <PhotoGalleryCard
            key={photo.id}
            photo={photo}
            excluded={excludedSet.has(photo.id)}
            onToggleExclude={() => tripId && togglePhotoExclusion(tripId, photo.id)}
            onJumpToItem={
              photo.sourceType === "wish" || photo.sourceType === "packing"
                ? () => handleJumpToItem(photo)
                : undefined
            }
            onLink={photo.sourceType === "tripPhoto" ? () => setLinkingPhoto(photo) : undefined}
            onDelete={photo.sourceType === "tripPhoto" ? () => handleDelete(photo) : undefined}
          />
        ))}
      </div>

      {linkingPhoto && tripId && (
        <PhotoItemLinkerModal
          tripId={tripId}
          initialParkDataIds={linkingPhoto.linkedParkDataIds ?? []}
          initialWishIds={linkingPhoto.linkedWishIds ?? []}
          onConfirm={handleConfirmLink}
          onClose={() => setLinkingPhoto(null)}
        />
      )}
    </div>
  );
}
