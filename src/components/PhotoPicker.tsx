"use client";

// Photos for an item editor (wishes, packing, collection items): add from a
// file, or paste a copied image with ⌘V / Ctrl+V or the Paste button
// (src/lib/photo-paste.ts).

import { useRef, useState } from "react";
import { useIsPresent } from "framer-motion";
import { compressImageMultiRes, type PhotoResolutions } from "@/lib/image-utils";
import { canReadClipboardImages, pasteNote, readClipboardImages } from "@/lib/photo-paste";
import { usePhotoPaste } from "@/hooks/use-photo-paste";
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

  const [note, setNote] = useState<string | null>(null);
  // A dialog fading out stays mounted; it mustn't take a paste meant for the next one
  const present = useIsPresent();
  const [canPasteButton] = useState(canReadClipboardImages);

  const addFiles = async (files: File[]) => {
    const toProcess = files.slice(0, Math.max(0, maxPhotos - totalPhotos));
    if (toProcess.length < files.length) setNote(`Up to ${maxPhotos} photos per item.`);
    if (onChangeMultiRes) {
      const newSets: PhotoResolutions[] = [];
      for (const file of toProcess) {
        try {
          newSets.push(await compressImageMultiRes(file));
        } catch (error) {
          console.error("[PhotoPicker] Couldn't read a photo:", error);
        }
      }
      if (newSets.length > 0) onChangeMultiRes([...photoSets, ...newSets]);
    } else if (onChange) {
      // Legacy single-res path
      const { compressImage } = await import("@/lib/image-utils");
      const newPhotos: string[] = [];
      for (const file of toProcess) {
        try {
          newPhotos.push(await compressImage(file));
        } catch (error) {
          console.error("[PhotoPicker] Couldn't read a photo:", error);
        }
      }
      if (newPhotos.length > 0) onChange([...photos, ...newPhotos]);
    }
  };

  const handleAddPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    setNote(null);
    await addFiles(Array.from(files));
    // Reset input so same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  usePhotoPaste((files) => {
    setNote(null);
    void addFiles(files);
  }, present);

  const handlePasteButton = async () => {
    setNote(null);
    const read = await readClipboardImages();
    if (read.ok && read.files.length > 0) await addFiles(read.files);
    else setNote(pasteNote(read));
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
            title="Add photo (or paste one with ⌘V / Ctrl+V)"
          >
            <span className="text-lg">+</span>
          </button>
        )}
        {totalPhotos < maxPhotos && canPasteButton && (
          <button
            type="button"
            onClick={() => void handlePasteButton()}
            className="w-12 h-12 rounded-lg flex items-center justify-center cursor-pointer
                       border-2 border-dashed border-white/20 hover:border-white/40
                       transition-colors text-white/40 hover:text-white/60 text-[10px] font-semibold"
            aria-label="Paste photo"
            title="Paste a copied photo"
          >
            Paste
          </button>
        )}
      </div>
      {note && (
        <p className="mt-1 text-xs" role="status" style={{ color: "var(--color-text-secondary)" }}>
          {note}
        </p>
      )}

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
