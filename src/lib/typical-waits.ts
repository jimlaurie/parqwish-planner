// ==================== TYPICAL WAITS ====================
// Pure lookups over waitTimeStats.json (the nightly BigQuery medians behind
// the Wait Time Heat Map) for the Preview timeline: "what's the usual wait
// for this ride on this weekday at this hour?" and "when is it quietest?".
// No I/O here — use-typical-waits.ts loads the stats and calls these.

import type { WaitTimeDayStat, WaitTimeRideEntry, WaitTimeStats } from "./park-data";

const DAY_NAMES = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const;

/** A suggestion is only worth showing if it saves at least this much. */
export const MIN_SAVING_MINUTES = 15;

export interface TypicalWait {
  /** Median standby wait, rounded to the nearest 5 minutes (minimum 5). */
  minutes: number;
  /** Exact median before rounding, for tooltips. */
  exactMinutes: number;
  /** How specific the match was — used to word the tooltip honestly. */
  basis: "weekday-hour" | "daytype-hour" | "weekday" | "daytype";
}

export interface QuietHour {
  hour: number;
  minutes: number;
}

export function roundWait(median: number): number {
  return Math.max(5, Math.round(median / 5) * 5);
}

/** "2026-10-14" → "wednesday"; local calendar date, no timezone shift. */
export function dayNameFor(isoDate: string): (typeof DAY_NAMES)[number] | null {
  const [y, m, d] = isoDate.split("-").map(Number);
  if (!y || !m || !d) return null;
  return DAY_NAMES[new Date(y, m - 1, d).getDay()];
}

function dayTypeFor(dayName: string): "weekday" | "weekend" {
  return dayName === "saturday" || dayName === "sunday" ? "weekend" : "weekday";
}

function toWait(stat: WaitTimeDayStat | null | undefined, basis: TypicalWait["basis"]): TypicalWait | null {
  if (!stat) return null;
  return { minutes: roundWait(stat.medianWaitMinutes), exactMinutes: stat.medianWaitMinutes, basis };
}

/** Hour → stat for a given day, most specific source first. */
function hourlyFor(ride: WaitTimeRideEntry, dayName: string): Record<string, WaitTimeDayStat> | null {
  const specific = ride.byHourByDayOfWeek?.[dayName];
  if (specific && Object.keys(specific).length > 0) return specific;
  const general = ride.byHour?.[dayTypeFor(dayName)];
  return general && Object.keys(general).length > 0 ? general : null;
}

/** Typical wait at a given hour (0–23) on the weekday of `isoDate`. */
export function typicalWaitAt(ride: WaitTimeRideEntry, isoDate: string, hour: number): TypicalWait | null {
  const dayName = dayNameFor(isoDate);
  if (!dayName) return null;
  return (
    toWait(ride.byHourByDayOfWeek?.[dayName]?.[String(hour)], "weekday-hour") ??
    toWait(ride.byHour?.[dayTypeFor(dayName)]?.[String(hour)], "daytype-hour")
  );
}

/** Typical wait across the whole day, for items with no set time. */
export function typicalWaitForDay(ride: WaitTimeRideEntry, isoDate: string): TypicalWait | null {
  const dayName = dayNameFor(isoDate);
  if (!dayName) return null;
  return toWait(ride.byDayOfWeek?.[dayName], "weekday") ?? toWait(ride[dayTypeFor(dayName)], "daytype");
}

/** The hour with the lowest typical wait on that weekday (earliest on ties). */
export function quietestHour(ride: WaitTimeRideEntry, isoDate: string): QuietHour | null {
  const dayName = dayNameFor(isoDate);
  if (!dayName) return null;
  const hourly = hourlyFor(ride, dayName);
  if (!hourly) return null;
  let best: QuietHour | null = null;
  for (const [h, stat] of Object.entries(hourly)) {
    const hour = Number(h);
    const minutes = roundWait(stat.medianWaitMinutes);
    if (!best || minutes < best.minutes || (minutes === best.minutes && hour < best.hour)) {
      best = { hour, minutes };
    }
  }
  return best;
}

/** Find a ride's stats by catalog id, falling back to an exact name match
 *  (items synced from mobile can carry a different id format). */
export function findRide(stats: WaitTimeStats, parkDataId?: string, title?: string): WaitTimeRideEntry | null {
  if (parkDataId && stats.rides[parkDataId]) return stats.rides[parkDataId];
  if (!title) return null;
  const wanted = title.trim().toLowerCase();
  return Object.values(stats.rides).find((r) => r.rideName.trim().toLowerCase() === wanted) ?? null;
}

export function formatHour(hour: number): string {
  const period = hour < 12 ? "AM" : "PM";
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12} ${period}`;
}

// ==================== TIMELINE HINT ====================

export interface WaitHint {
  /** Typical wait at the scheduled hour, or across the day when untimed. */
  minutes: number;
  /** "2 PM" when the item has a time; absent for Anytime items. */
  atHourLabel?: string;
  /** A noticeably quieter hour that day, when there is one. */
  quieter?: { hourLabel: string; minutes: number };
  /** Tooltip text explaining where the numbers come from. */
  title: string;
}

const BASIS_TEXT: Record<TypicalWait["basis"], string> = {
  "weekday-hour": "on this weekday at this hour",
  "daytype-hour": "at this hour on similar days",
  weekday: "on this weekday",
  daytype: "on similar days",
};

/**
 * Hint for one timeline item. `scheduledTime` is "HH:MM"; omit it for items
 * in the Anytime section. Returns null when there's no history to go on.
 */
export function buildWaitHint(ride: WaitTimeRideEntry, isoDate: string, scheduledTime?: string): WaitHint | null {
  const hour = scheduledTime ? Number(scheduledTime.split(":")[0]) : null;
  const typical = hour != null ? typicalWaitAt(ride, isoDate, hour) : typicalWaitForDay(ride, isoDate);
  if (!typical) return null;

  const quiet = quietestHour(ride, isoDate);
  const worthMoving = quiet && quiet.hour !== hour && typical.minutes - quiet.minutes >= MIN_SAVING_MINUTES;
  const quieter = worthMoving ? { hourLabel: formatHour(quiet.hour), minutes: quiet.minutes } : undefined;

  const dayLabel = dayNameFor(isoDate);
  const day = dayLabel ? dayLabel.charAt(0).toUpperCase() + dayLabel.slice(1) : "this day";
  const title =
    `Typical standby wait ${BASIS_TEXT[typical.basis]}: ${Math.round(typical.exactMinutes)} min ` +
    `(median, last 90 days — not a forecast).` +
    (quieter ? ` Usually quietest around ${quieter.hourLabel} on ${day}s (~${quieter.minutes} min).` : "");

  return { minutes: typical.minutes, atHourLabel: hour != null ? formatHour(hour) : undefined, quieter, title };
}
