// ==================== SHOWTIMES ====================
// Placing a show on the Preview timeline. shows.json lists each show's start
// times, or the windows a roaming show or character appears in, for ONE day:
// the day they were synced from ThemeParks.wiki, which only publishes the
// current day. The Planner reads that file live each day (park-data.ts),
// falling back to its deploy's copy. For any other day the times are a guide
// to the usual pattern, so the timeline suggests them (snapping a drop to
// one, marking slots, chips in the edit dialog) and never blocks other
// times. Pure functions; the data comes from park-data.ts via
// use-show-schedules.ts.

import { formatTime12 } from "@/lib/time-format";

export interface ShowSchedule {
  /** Start times, "HH:MM" (24-hour, park time). */
  times: string[];
  /** Windows the show performs in, for roaming shows and characters. */
  ranges: Array<{ start: string; end: string }>;
  /** Minutes, when known. */
  duration?: number;
}

/** A timeline slot's mark while a show is being dragged. */
export interface SlotMark {
  kind: "time" | "window";
  /** Shown on the slot: "1:10 PM", or the window "8:00 AM – 5:15 PM" on its first slot. */
  label?: string;
}

const SLOT_MINUTES = 30;

function toMinutes(time: string): number {
  const [hh, mm] = time.split(":").map(Number);
  return hh * 60 + mm;
}

function toTime(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

/** The 30-minute timeline slot a time falls in: "13:10" → "13:00". */
export function slotOf(time: string): string {
  const m = toMinutes(time);
  return toTime(m - (m % SLOT_MINUTES));
}

export function hasShowtimes(s: ShowSchedule | null | undefined): s is ShowSchedule {
  return !!s && (s.times.length > 0 || s.ranges.length > 0);
}

/** The first listed start time inside a slot, or null: dropping a 1:10 show on 1:00 gives 1:10. */
export function showtimeInSlot(s: ShowSchedule | null | undefined, slot: string): string | null {
  if (!s) return null;
  return s.times.find((t) => slotOf(t) === slot) ?? null;
}

/** True when a time is a listed start time or inside a listed window. */
export function isListedShowtime(s: ShowSchedule, time: string): boolean {
  if (s.times.includes(time)) return true;
  const m = toMinutes(time);
  return s.ranges.some((r) => m >= toMinutes(r.start) && m < toMinutes(r.end));
}

/** Which timeline slots to mark while this show is dragged. */
export function slotMarks(s: ShowSchedule): Record<string, SlotMark> {
  const marks: Record<string, SlotMark> = {};
  for (const r of s.ranges) {
    const start = toMinutes(r.start);
    const end = toMinutes(r.end);
    for (let m = start - (start % SLOT_MINUTES); m < end; m += SLOT_MINUTES) {
      marks[toTime(m)] ??= { kind: "window" };
    }
    marks[slotOf(r.start)] = { kind: "window", label: `${formatTime12(r.start)} – ${formatTime12(r.end)}` };
  }
  for (const t of s.times) {
    const slot = slotOf(t);
    const prev = marks[slot]?.kind === "time" ? marks[slot].label : undefined;
    marks[slot] = { kind: "time", label: prev ? `${prev}, ${formatTime12(t)}` : formatTime12(t) };
  }
  return marks;
}

/** "Oct 13" for a YYYY-MM-DD date. */
function shortDate(day: string): string {
  return new Date(`${day}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** The park-time (Pacific) date an ISO sync time falls on. */
export function syncDay(syncedAt: string | null): string | null {
  if (!syncedAt) return null;
  const d = new Date(syncedAt);
  return isNaN(d.getTime()) ? null : d.toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" });
}

/**
 * What the listed showtimes are worth for the day being planned: the real
 * schedule when it's the day they were synced, otherwise a guide.
 */
export function showtimesNote(s: ShowSchedule | null | undefined, day: string | null, syncedOn: string | null): string {
  const listed = hasShowtimes(s);
  if (!syncedOn) return listed ? "Listed showtimes can change. Check closer to your visit." : "No showtimes listed.";
  if (day === syncedOn) return listed ? `Showtimes for ${shortDate(day)}.` : `No showtimes listed for ${shortDate(day)}.`;
  return listed
    ? `Showtimes as of ${shortDate(syncedOn)}. They can change, so check closer to your visit.`
    : `No showtimes listed as of ${shortDate(syncedOn)}. Check closer to your visit.`;
}
