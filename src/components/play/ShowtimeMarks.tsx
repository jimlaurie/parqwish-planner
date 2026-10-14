"use client";

// ==================== SHOWTIME MARKS ====================
// While a show is dragged over the Preview timeline, the slots holding its
// listed showtimes are marked (lib/showtimes.ts) and a note says what day
// those times are for. The Preview page provides the marks for the show
// being dragged; TimelineSlot and Timeline read them here, so the layouts
// in between don't have to pass them along.

import { createContext, useContext } from "react";
import type { SlotMark } from "@/lib/showtimes";

export interface ShowtimeDragHints {
  showTitle: string;
  marks: Record<string, SlotMark>;
  note: string;
}

export const ShowtimeMarksContext = createContext<ShowtimeDragHints | null>(null);

export function useShowtimeDragHints(): ShowtimeDragHints | null {
  return useContext(ShowtimeMarksContext);
}

const GOLD = "var(--color-gold)";

/** The slot's showtime label, drawn over its top-right corner. */
export function SlotShowtimeLabel({ slot }: { slot: string }) {
  const mark = useShowtimeDragHints()?.marks[slot];
  if (!mark?.label) return null;
  return (
    <span
      className="absolute -top-2 right-2 z-10 px-1.5 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap pointer-events-none"
      style={{ backgroundColor: GOLD, color: "var(--color-bg-deep)" }}
    >
      {"\u{1F3AD}"} {mark.label}
    </span>
  );
}

/** Background and border for a slot that holds a showtime (stronger) or sits in a show's window. */
export function slotMarkStyle(kind: SlotMark["kind"] | undefined): React.CSSProperties | null {
  if (!kind) return null;
  return kind === "time"
    ? { backgroundColor: `color-mix(in srgb, ${GOLD} 16%, transparent)`, border: `1px solid color-mix(in srgb, ${GOLD} 60%, transparent)` }
    : { backgroundColor: `color-mix(in srgb, ${GOLD} 8%, transparent)`, border: `1px dashed color-mix(in srgb, ${GOLD} 40%, transparent)` };
}

/** Sticky note at the top of the timeline while a show is dragged. */
export function ShowtimeDragNote() {
  const hints = useShowtimeDragHints();
  if (!hints) return null;
  return (
    <div
      role="status"
      className="sticky top-0 z-20 mb-1 px-3 py-2 rounded-lg text-xs backdrop-blur-md"
      style={{
        backgroundColor: `color-mix(in srgb, ${GOLD} 14%, var(--color-bg-card))`,
        border: `1px solid color-mix(in srgb, ${GOLD} 45%, transparent)`,
        color: "var(--color-text-secondary)",
      }}
    >
      <span className="font-semibold" style={{ color: "var(--color-text-primary)" }}>{"\u{1F3AD}"} {hints.showTitle}</span>{" "}
      {hints.note}
    </div>
  );
}
