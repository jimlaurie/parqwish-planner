"use client";

import type { TripPhotoEntry } from "@/hooks/use-all-trip-photos";

const ACCENT = "var(--color-accent-publish)";

interface PhotoGalleryCardProps {
  photo: TripPhotoEntry;
  excluded: boolean;
  onToggleExclude: () => void;
  onJumpToItem?: () => void;
  onLink?: () => void; // TripPhoto only
  onDelete?: () => void; // TripPhoto only
}

export default function PhotoGalleryCard({
  photo,
  excluded,
  onToggleExclude,
  onJumpToItem,
  onLink,
  onDelete,
}: PhotoGalleryCardProps) {
  const isTripPhoto = photo.sourceType === "tripPhoto";
  const linkCount = (photo.linkedParkDataIds?.length ?? 0) + (photo.linkedWishIds?.length ?? 0);

  return (
    <div
      className="rounded-xl overflow-hidden flex flex-col"
      style={{
        backgroundColor: "var(--color-bg-card)",
        border: "1px solid var(--color-border-subtle)",
        opacity: excluded ? 0.55 : 1,
      }}
    >
      <div className="relative aspect-square">
        {/* eslint-disable-next-line @next/next/no-img-element -- data URI, next/image gains nothing here */}
        <img src={photo.url} alt={photo.caption || photo.linkedItemTitle} className="w-full h-full object-cover" />
        {excluded && (
          <div
            className="absolute top-2 left-2 text-[10px] font-semibold px-2 py-0.5 rounded-full"
            style={{ backgroundColor: "var(--color-overlay)", color: "var(--color-text-primary)" }}
          >
            Excluded from Publish
          </div>
        )}
      </div>

      <div className="p-2.5 flex flex-col gap-2">
        <button
          type="button"
          onClick={onJumpToItem}
          disabled={!onJumpToItem}
          className="text-left"
          style={{ cursor: onJumpToItem ? "pointer" : "default" }}
          title={onJumpToItem ? "Go to this item" : undefined}
        >
          <span className="flex items-center gap-1 text-[10px] font-semibold" style={{ color: ACCENT }}>
            {photo.categoryIcon} {photo.categoryLabel}
          </span>
          <span className="block text-xs truncate" style={{ color: "var(--color-text-primary)" }}>
            {photo.linkedItemTitle}
          </span>
        </button>

        {isTripPhoto && (
          <button
            type="button"
            onClick={onLink}
            className="text-[10px] px-2 py-1 rounded-lg text-left cursor-pointer"
            style={{
              color: linkCount > 0 ? ACCENT : "var(--color-text-dim)",
              border: `1px solid ${linkCount > 0 ? ACCENT : "var(--color-border-input)"}`,
            }}
          >
            {linkCount > 0 ? `Linked to ${linkCount} item${linkCount === 1 ? "" : "s"}` : "Link to items…"}
          </button>
        )}

        <div className="flex items-center justify-between gap-2 pt-1" style={{ borderTop: "1px solid var(--color-border-subtle)" }}>
          <button
            type="button"
            onClick={onToggleExclude}
            className="text-[10px] font-medium cursor-pointer"
            style={{ color: excluded ? "var(--color-text-dim)" : ACCENT }}
          >
            {excluded ? "Include in Publish" : "✓ In Publish"}
          </button>
          {isTripPhoto && onDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="text-[10px] font-medium cursor-pointer"
              style={{ color: "var(--color-error)" }}
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
