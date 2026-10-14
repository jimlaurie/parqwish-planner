// ==================== SHOWTIMES ====================
// Placing a show on the Preview timeline. shows.json lists each show's start
// times, or the windows a roaming show or character appears in, for ONE day:
// the day they were synced from ThemeParks.wiki, which only publishes the
// current day. The Planner reads that file live each day (park-data.ts),
// falling back to its deploy's copy. For another day it uses the history the
// sync keeps (a few weeks of daily snapshots, showtimeHistory.json): that
// day's own record if it's past, otherwise the latest same weekday (a show
// can be off midweek). Either way they're a guide, so the timeline suggests
// them (snapping a drop to one, marking slots, chips in the edit dialog) and
// never blocks other times. Pure functions; the data comes from
// park-data.ts via use-show-schedules.ts.

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

// ==================== WEEKDAY HISTORY ====================

/** One show's record for a day in showtimeHistory.json. */
interface HistoryEntry {
  t?: string[];
  r?: Array<{ s: string; e: string }>;
}

/** showtimeHistory.json: daily snapshots, keyed date → "park__show" → times. A show missing from a day wasn't on its schedule. */
export interface ShowtimeHistory {
  days: Record<string, Record<string, HistoryEntry>>;
}

/** A show's times for the day being planned, and what they're based on. */
export interface ShowGuess {
  schedule: ShowSchedule;
  note: string;
}

const MAX_WEEKDAYS = 6;
const CHECK_LATER = "They can change, so check closer to your visit.";

function weekdayName(day: string): string {
  return new Date(`${day}T12:00:00`).toLocaleDateString("en-US", { weekday: "long" });
}

function fromEntry(entry: HistoryEntry | undefined, duration?: number): ShowSchedule {
  return {
    times: entry?.t ?? [],
    ranges: (entry?.r ?? []).map((x) => ({ start: x.s, end: x.e })),
    duration,
  };
}

/** The recorded days on the same weekday as `day`, newest first, at most six. */
function sameWeekdays(history: ShowtimeHistory, day: string): string[] {
  const weekday = new Date(`${day}T12:00:00`).getDay();
  return Object.keys(history.days)
    .filter((d) => new Date(`${d}T12:00:00`).getDay() === weekday)
    .sort()
    .reverse()
    .slice(0, MAX_WEEKDAYS);
}

/** " (the same on the last 3 Tuesdays)", or "" when there's only one to go by. */
function agreement(same: number, of: number, weekday: string): string {
  if (of < 2) return "";
  return same === of ? ` (the same on the last ${of} ${weekday}s)` : ` (the same on ${same} of the last ${of} ${weekday}s)`;
}

/**
 * A show's times for `day`: the day's own (synced today, or recorded in the
 * history), else the latest same weekday in the history, else the latest
 * sync as a rough guide.
 */
export function showtimesForDay(
  id: string,
  latest: ShowSchedule,
  day: string | null,
  syncedOn: string | null,
  history: ShowtimeHistory | null,
): ShowGuess {
  const exact = (schedule: ShowSchedule, d: string) => ({ schedule, note: showtimesNote(schedule, d, d) });
  if (!day || day === syncedOn || !history) return { schedule: latest, note: showtimesNote(latest, day, syncedOn) };
  if (history.days[day]) return exact(fromEntry(history.days[day][id], latest.duration), day);

  const weekdays = sameWeekdays(history, day);
  if (!weekdays.length) return { schedule: latest, note: showtimesNote(latest, day, syncedOn) };
  const [newest] = weekdays;
  const pick = history.days[newest][id];
  const key = JSON.stringify(pick ?? null);
  const same = weekdays.filter((d) => JSON.stringify(history.days[d][id] ?? null) === key).length;
  const weekday = weekdayName(day);
  const schedule = fromEntry(pick, latest.duration);
  const when = `${weekday}, ${shortDate(newest)}`;
  const note = hasShowtimes(schedule)
    ? `Showtimes from ${when}${agreement(same, weekdays.length, weekday)}. ${CHECK_LATER}`
    : same === weekdays.length && same > 1
      ? `Not on the schedule on the last ${same} ${weekday}s. ${CHECK_LATER}`
      : `Not on the schedule on ${when}${agreement(same, weekdays.length, weekday)}. ${CHECK_LATER}`;
  return { schedule, note };
}
