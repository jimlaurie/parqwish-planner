// ==================== TIME FORMATTING ====================
// Times are stored as 24-hour "HH:MM" strings (itinerary items, day items);
// everything the user sees is 12-hour.

/** "14:05" → "2:05 PM"; "" for anything that isn't HH:MM. */
export function formatTime12(time24: string | undefined | null): string {
  if (!time24?.includes(":")) return "";
  const [hh, mm] = time24.split(":").map(Number);
  if (isNaN(hh) || isNaN(mm)) return "";
  const period = hh >= 12 ? "PM" : "AM";
  const hour12 = hh === 0 ? 12 : hh > 12 ? hh - 12 : hh;
  return `${hour12}:${mm.toString().padStart(2, "0")} ${period}`;
}
