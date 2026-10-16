// ==================== DATES ====================
// Calendar dates ("YYYY-MM-DD") for trips, days and "today". A trip day is a
// day at the park, so "today" and a moment's date are taken in the park's
// time zone (Pacific), never from toISOString(), which is UTC: after 5 PM
// Pacific (4 PM in summer) UTC is already tomorrow. Date arithmetic on
// "YYYY-MM-DD" strings is done in UTC, where every day is exactly 24 hours,
// so it's the same in any time zone and across daylight saving changes.
// ESLint rejects the toISOString().slice/split idiom outside this file.

const PARK_TIME_ZONE = "America/Los_Angeles";
const DAY_MS = 86_400_000;

/** The park (Pacific) calendar date of a moment, "YYYY-MM-DD". */
export function parkDate(when: Date = new Date()): string {
  return when.toLocaleDateString("en-CA", { timeZone: PARK_TIME_ZONE });
}

/** Today at the park, "YYYY-MM-DD". */
export function parkToday(): string {
  return parkDate(new Date());
}

/** The park's date and wall-clock time of a moment. */
export function parkClock(when: Date = new Date()): { date: string; hours: number; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: PARK_TIME_ZONE, hour: "numeric", minute: "numeric", hourCycle: "h23",
  }).formatToParts(when);
  const part = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return { date: parkDate(when), hours: part("hour"), minutes: part("minute") };
}

function toUtcMs(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

function fromUtcMs(ms: number): string {
  // UTC midnight in, UTC date out: the one safe place for toISOString
  return new Date(ms).toISOString().slice(0, 10); // eslint-disable-line no-restricted-syntax
}

/** "YYYY-MM-DD" moved by `days` (negative goes back). */
export function addDays(date: string, days: number): string {
  return fromUtcMs(toUtcMs(date) + days * DAY_MS);
}

/** Whole days from `from` to `to` (negative when `to` is earlier). */
export function daysBetween(from: string, to: string): number {
  return Math.round((toUtcMs(to) - toUtcMs(from)) / DAY_MS);
}

/** Every date from `start` to `end` inclusive; empty if either is missing or end is before start. */
export function datesBetween(start: string, end: string): string[] {
  if (!start || !end) return [];
  const count = daysBetween(start, end);
  return count < 0 ? [] : Array.from({ length: count + 1 }, (_, i) => addDays(start, i));
}
