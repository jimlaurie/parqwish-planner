"use client";

// ==================== TWO COLUMNS ====================
// Whether a page's content area is wide enough for two equal columns (the
// trip's list beside its catalog on Plan and Prepare). Measured on the
// content area itself, not the window, because the left sidebar opens and
// collapses: two columns as soon as each can be MIN_COLUMN wide, stacked
// below that, where card text would start wrapping badly. The same answer
// drives the CSS and where the catalog goes, so they can't disagree.

import { useCallback, useState } from "react";

const MIN_COLUMN = 380; // px; below this, wish and packing cards wrap their titles and chips
const GAP = 32;         // px, the gap-8 between the columns
export const TWO_COLUMN_MIN_WIDTH = MIN_COLUMN * 2 + GAP;

/** A ref callback for the content area, and whether it fits two columns (false until measured). */
export function useTwoColumns(): [(el: HTMLElement | null) => void, boolean] {
  const [twoColumns, setTwoColumns] = useState(false);
  const ref = useCallback((el: HTMLElement | null) => {
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setTwoColumns(entry.contentRect.width >= TWO_COLUMN_MIN_WIDTH));
    observer.observe(el);
    // Disconnect when the element goes away (React calls the ref with null)
    return () => observer.disconnect();
  }, []);
  return [ref, twoColumns];
}

/** The classes for the two-column grid, or none when stacked. */
export const twoColumnClasses = (two: boolean) => (two ? "grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-8 items-start" : "");
