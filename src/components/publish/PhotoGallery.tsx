"use client";

import { useState } from "react";
import PhotoViewer from "@/components/PhotoViewer";

const ACCENT = "var(--color-accent-publish)";

// ==================== TYPES ====================

interface Photo {
  id: string;
  url: string;
  caption: string;
}

interface PhotoGalleryProps {
  photos: Photo[];
  excludedIds: Set<string>;
  onToggleExclusion: (id: string) => void;
}

// ==================== COMPONENT ====================

export default function PhotoGallery({ photos, excludedIds, onToggleExclusion }: PhotoGalleryProps) {
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  if (photos.length === 0) {
    return (
      <div className="w-full max-w-4xl mb-8">
        <h2
          className="text-xs font-bold mb-3 uppercase tracking-wider"
          style={{ color: ACCENT }}
        >
          Trip Photos
        </h2>
        <div
          className="rounded-xl p-8 text-center"
          style={{
            backgroundColor: "var(--color-bg-card)",
            border: "1px solid var(--color-border-subtle)",
          }}
        >
          <span className="text-3xl mb-2 block">{"📷"}</span>
          <p className="text-sm" style={{ color: "var(--color-text-dim)" }}>
            No photos yet — add photos to your wishes and packing items
          </p>
        </div>
      </div>
    );
  }

  const includedCount = photos.filter((p) => !excludedIds.has(p.id)).length;
  const photoUrls = photos.map((p) => p.url);

  return (
    <div className="w-full max-w-4xl mb-8">
      {/* Section header */}
      <div className="flex items-baseline justify-between mb-3">
        <h2
          className="text-xs font-bold uppercase tracking-wider"
          style={{ color: ACCENT }}
        >
          Trip Photos ({photos.length})
        </h2>
        <span className="text-xs" style={{ color: "var(--color-text-dim)" }}>
          {includedCount === photos.length
            ? "All selected for PDF"
            : `${includedCount} of ${photos.length} selected for PDF`}
        </span>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
        {photos.map((photo, idx) => {
          const excluded = excludedIds.has(photo.id);
          return (
            <div
              key={photo.id}
              className="relative aspect-square rounded-xl overflow-hidden group"
              style={{ backgroundColor: "var(--color-bg-deep)" }}
            >
              {/* Photo — click opens lightbox */}
              <button
                onClick={() => setViewerIndex(idx)}
                className="absolute inset-0 w-full h-full cursor-pointer"
                aria-label={`View ${photo.caption}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.url}
                  alt={photo.caption}
                  className="w-full h-full object-cover transition-all duration-200 group-hover:scale-105"
                  // Safari-specific fix: rounded-xl + overflow-hidden on the
                  // parent plus a hover-triggered transform on this img is a
                  // known WebKit trigger for the image briefly disappearing
                  // during recompositing (worse with large data: URIs, which
                  // have no cached network layer to fall back on while the
                  // layer rebuilds). willChange pre-promotes the img to its
                  // own GPU layer at all times instead of only on hover, so
                  // there's no layer-creation moment for WebKit to glitch on.
                  style={{ opacity: excluded ? 0.35 : 1, willChange: "transform" }}
                />
              </button>

              {/* Caption overlay (hover) */}
              {!excluded && (
                <div
                  className="absolute inset-x-0 bottom-0 px-2 py-1.5 opacity-0
                               group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"
                  style={{ background: "linear-gradient(transparent, rgba(0,0,0,0.7))" }}
                >
                  <span className="text-[10px] text-white truncate block">
                    {photo.caption}
                  </span>
                </div>
              )}

              {/* Excluded overlay label */}
              {excluded && (
                <div
                  className="absolute inset-0 flex items-center justify-center pointer-events-none"
                >
                  <span
                    className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full"
                    style={{
                      background: "rgba(0,0,0,0.55)",
                      color: "rgba(255,255,255,0.7)",
                    }}
                  >
                    Excluded
                  </span>
                </div>
              )}

              {/* Selection badge — top-right */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleExclusion(photo.id);
                }}
                aria-label={excluded ? "Include in PDF" : "Exclude from PDF"}
                aria-pressed={!excluded}
                className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full flex items-center
                           justify-center transition-all duration-150 cursor-pointer
                           hover:scale-110 active:scale-95 z-10"
                style={
                  excluded
                    ? {
                        background: "rgba(0,0,0,0.45)",
                        border: "1.5px solid rgba(255,255,255,0.35)",
                      }
                    : {
                        background: "var(--color-accent-publish)",
                        border: "1.5px solid var(--color-accent-publish)",
                        boxShadow: "0 1px 4px rgba(0,0,0,0.4)",
                      }
                }
              >
                {excluded ? (
                  // Minus / excluded icon
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                    <line x1="2" y1="5" x2="8" y2="5" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                ) : (
                  // Check icon
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                    <polyline points="2,5 4,7.5 8,2.5" stroke="var(--color-bg-deep)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Lightbox */}
      {viewerIndex !== null && (
        <PhotoViewer
          photos={photoUrls}
          currentIndex={viewerIndex}
          onClose={() => setViewerIndex(null)}
          onChangeIndex={setViewerIndex}
        />
      )}
    </div>
  );
}
