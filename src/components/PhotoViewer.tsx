"use client";

import { useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface PhotoViewerProps {
  photos: string[];
  currentIndex: number;
  onClose: () => void;
  onChangeIndex: (index: number) => void;
}

export default function PhotoViewer({
  photos,
  currentIndex,
  onClose,
  onChangeIndex,
}: PhotoViewerProps) {
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

        {/* Image */}
        <motion.img
          key={currentIndex}
          src={photos[currentIndex]}
          alt={`Photo ${currentIndex + 1} of ${total}`}
          className="max-w-[90vw] max-h-[80vh] rounded-lg object-contain"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          onClick={(e) => e.stopPropagation()}
        />

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
