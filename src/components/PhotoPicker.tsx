"use client";

import { useRef, useState } from "react";
import { compressImageMultiRes, type PhotoResolutions } from "@/lib/image-utils";
import PhotoViewer from "@/components/PhotoViewer";

interface PhotoPickerProps {
  /** Multi-res photo sets (preferred) */
  photoSets?: PhotoResolutions[];
  /** Legacy single-res photos (backward compat) */
  photos?: string[];
  /** Called with updated multi-res photo sets */
  onChangeMultiRes?: (photoSets: PhotoResolutions[]) => void;
  /** Legacy callback — called with thumbnail array for backward compat */
  onChange?: (photos: string[]) => void;
  maxPhotos?: number;
}

export default function PhotoPicker({
  photoSets = [],
  photos = [],
  onChangeMultiRes,
  onChange,
  maxPhotos = 5,
}: PhotoPickerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  // Derive display data: prefer photoSets, fall back to legacy photos
  const hasMultiRes = photoSets.length > 0;
  const thumbnails = hasMultiRes
    ? photoSets.map((ps) => ps.thumbnail)
    : photos;
  const displayPhotos = hasMultiRes
    ? photoSets.map((ps) => ps.display)
    : photos;
  const totalPhotos = hasMultiRes ? photoSets.length : photos.length;

  const handleAddPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const remaining = maxPhotos - totalPhotos;
    const toProcess = Math.min(files.length, remaining);

    if (onChangeMultiRes) {
      // Multi-res path
      const newSets: PhotoResolutions[] = [];
      for (let i = 0; i < toProcess; i++) {
        try {
          const set = await compressImageMultiRes(files[i]);
          newSets.push(set);
        } catch {
          // Skip failed images
        }
      }
      if (newSets.length > 0) {
        onChangeMultiRes([...photoSets, ...newSets]);
      }
    } else if (onChange) {
      // Legacy single-res path
      const { compressImage } = await import("@/lib/image-utils");
      const newPhotos: string[] = [];
      for (let i = 0; i < toProcess; i++) {
        try {
          const compressed = await compressImage(files[i]);
          newPhotos.push(compressed);
        } catch {
          // Skip failed images
        }
      }
      if (newPhotos.length > 0) {
        onChange([...photos, ...newPhotos]);
      }
    }

    // Reset input so same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleRemove = (index: number) => {
    if (onChangeMultiRes && hasMultiRes) {
      onChangeMultiRes(photoSets.filter((_, i) => i !== index));
    } else if (onChange) {
      onChange(photos.filter((_, i) => i !== index));
    }
  };

  return (
    <>
      <div className="flex gap-2 flex-wrap">
        {/* Thumbnails */}
        {thumbnails.map((thumb, i) => (
          <div key={i} className="relative group">
            <img
              src={thumb}
              alt={`Photo ${i + 1}`}
              className="w-12 h-12 rounded-lg object-cover cursor-pointer
                         border border-white/10 hover:border-white/30 transition-colors"
              onClick={() => setViewerIndex(i)}
            />
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleRemove(i);
              }}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center
                         justify-center text-[10px] font-bold cursor-pointer opacity-0
                         group-hover:opacity-100 transition-opacity"
              style={{
                backgroundColor: "var(--color-error)",
                color: "white",
              }}
              aria-label={`Remove photo ${i + 1}`}
            >
              {"\u2715"}
            </button>
          </div>
        ))}

        {/* Add button */}
        {totalPhotos < maxPhotos && (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-12 h-12 rounded-lg flex items-center justify-center cursor-pointer
                       border-2 border-dashed border-white/20 hover:border-white/40
                       transition-colors text-white/40 hover:text-white/60"
            aria-label="Add photo"
          >
            <span className="text-lg">+</span>
          </button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleAddPhoto}
        aria-label="Upload photos"
      />

      {/* Full-size viewer — uses display resolution for lightbox */}
      {viewerIndex !== null && (
        <PhotoViewer
          photos={displayPhotos}
          currentIndex={viewerIndex}
          onClose={() => setViewerIndex(null)}
          onChangeIndex={setViewerIndex}
        />
      )}
    </>
  );
}
