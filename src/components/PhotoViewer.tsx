"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { canSharePhotos, copyPhoto, downloadPhoto, sharePhoto, type PhotoActionResult } from "@/lib/photo-share";

interface PhotoViewerProps {
  photos: string[];
  currentIndex: number;
  onClose: () => void;
  onChangeIndex: (index: number) => void;
  /** A line under each photo (its item), by index. */
  captions?: string[];
  /** Show Share…, Download and Copy image under the photo (Catalog › Photos). */
  shareable?: boolean;
}

const RESULT_NOTES: Record<string, string> = {
  "download:done": "Downloaded",
  "copy:done": "Copied — paste it into a message or document",
  "copy:unsupported": "This browser can't copy images",
  "share:unsupported": "This browser can't share photos",
  failed: "That didn't work. Please try again.",
};

export default function PhotoViewer({
  photos,
  currentIndex,
  onClose,
  onChangeIndex,
  captions,
  shareable = false,
}: PhotoViewerProps) {
  const [note, setNote] = useState<string | null>(null);
  const [canShare, setCanShare] = useState(false);
  useEffect(() => { setCanShare(shareable && canSharePhotos()); }, [shareable]);
  useEffect(() => { setNote(null); }, [currentIndex]);
  const caption = captions?.[currentIndex];

  const act = async (kind: "share" | "download" | "copy"): Promise<void> => {
    const src = photos[currentIndex];
    const result: PhotoActionResult = kind === "share" ? await sharePhoto(src, caption)
      : kind === "download" ? await downloadPhoto(src, caption)
      : await copyPhoto(src);
    if (result === "cancelled") return;
    setNote(RESULT_NOTES[`${kind}:${result}`] ?? (result === "failed" ? RESULT_NOTES.failed : null));
  };
  const total = photos.length;
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < total - 1;

  const handlePrev = useCallback(() => {
    if (hasPrev) onChangeIndex(currentIndex - 1);
  }, [hasPrev, currentIndex, onChangeIndex]);

  const handleNext = useCallback(() => {
    if (hasNext) onChangeIndex(currentIndex + 1);
  }, [hasNext, currentIndex, onChangeIndex]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") handlePrev();
      if (e.key === "ArrowRight") handleNext();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, handlePrev, handleNext]);

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[60] flex items-center justify-center"
        style={{ backgroundColor: "rgba(0, 0, 0, 0.85)" }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-label={`Photo viewer, ${currentIndex + 1} of ${total}`}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center
                     cursor-pointer text-white/70 hover:text-white transition-colors z-10"
          style={{ backgroundColor: "rgba(255,255,255,0.1)" }}
          aria-label="Close photo viewer"
        >
          {"\u2715"}
        </button>

        {/* Counter */}
        {total > 1 && (
          <div
            className="absolute top-4 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-medium"
            style={{ backgroundColor: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)" }}
          >
            {currentIndex + 1} of {total}
          </div>
        )}

        {/* Image, with its caption and actions when asked for */}
        <div className="flex flex-col items-center gap-3" onClick={(e) => e.stopPropagation()}>
          <motion.img
            key={currentIndex}
            src={photos[currentIndex]}
            alt={caption || `Photo ${currentIndex + 1} of ${total}`}
            className={`max-w-[90vw] ${caption || shareable ? "max-h-[68vh]" : "max-h-[80vh]"} rounded-lg object-contain`}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
          />
          {caption && (
            <p className="text-sm font-medium text-center max-w-[80vw]" style={{ color: "rgba(255,255,255,0.9)" }}>{caption}</p>
          )}
          {shareable && (
            <div className="flex items-center gap-2 flex-wrap justify-center" role="group" aria-label="Photo actions">
              {canShare && (
                <button type="button" onClick={() => { void act("share"); }}
                  className="px-4 py-2 rounded-full text-sm font-semibold cursor-pointer"
                  style={{ backgroundColor: "var(--color-accent-publish)", color: "#000" }}>
                  Share…
                </button>
              )}
              <button type="button" onClick={() => { void act("download"); }}
                className="px-4 py-2 rounded-full text-sm font-medium cursor-pointer text-white"
                style={{ backgroundColor: "rgba(255,255,255,0.14)" }}>
                Download
              </button>
              <button type="button" onClick={() => { void act("copy"); }}
                className="px-4 py-2 rounded-full text-sm font-medium cursor-pointer text-white"
                style={{ backgroundColor: "rgba(255,255,255,0.14)" }}>
                Copy image
              </button>
            </div>
          )}
          {note && <p role="status" className="text-xs" style={{ color: "rgba(255,255,255,0.75)" }}>{note}</p>}
        </div>

        {/* Prev arrow */}
        {hasPrev && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handlePrev();
            }}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full
                       flex items-center justify-center cursor-pointer text-white/70
                       hover:text-white transition-colors"
            style={{ backgroundColor: "rgba(255,255,255,0.1)" }}
            aria-label="Previous photo"
          >
            {"\u2039"}
          </button>
        )}

        {/* Next arrow */}
        {hasNext && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleNext();
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full
                       flex items-center justify-center cursor-pointer text-white/70
                       hover:text-white transition-colors"
            style={{ backgroundColor: "rgba(255,255,255,0.1)" }}
            aria-label="Next photo"
          >
            {"\u203A"}
          </button>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
