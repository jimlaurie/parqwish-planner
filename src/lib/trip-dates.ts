// ==================== TRIP DATE RANGES ====================
// A trip's dates as short text for the top bar, the trip sidebar and the
// trip selector: "Oct 13" (one day), "Oct 13–15" (same month),
// "Oct 31 – Nov 2" (across months). Dates are YYYY-MM-DD, read at local noon
// so a time zone can't shift the day.

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** `whenMissing` is returned for a trip without both dates (a template, for one). */
export function formatTripDates(start?: string, end?: string, whenMissing = ""): string {
  if (!start || !end) return whenMissing;
  const s = new Date(`${start}T12:00:00`);
  const e = new Date(`${end}T12:00:00`);
  const startLabel = `${MONTHS[s.getMonth()]} ${s.getDate()}`;
  if (start === end) return startLabel;
  if (s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear()) return `${startLabel}–${e.getDate()}`;
  return `${startLabel} – ${MONTHS[e.getMonth()]} ${e.getDate()}`;
}
