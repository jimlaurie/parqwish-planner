// ==================== TRIP COUNTDOWN ====================
// Short status for the top bar, next to the trip name: how far away the
// trip is, which day of it you're on, or that it's over. Null for trips
// without dates (templates). Pure — pass `today` in tests.

export interface CountdownTrip {
  name: string;
  startDate?: string; // YYYY-MM-DD
  endDate?: string;   // YYYY-MM-DD
}

const DAY_MS = 86_400_000;

/** Local-calendar day number for a YYYY-MM-DD string (no UTC shift). */
function dayNumber(iso: string): number | null {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return null;
  return Math.round(new Date(y, m - 1, d).getTime() / DAY_MS);
}

function todayNumber(today: Date): number {
  return Math.round(new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime() / DAY_MS);
}

export function tripCountdown(trip: CountdownTrip | null | undefined, today: Date = new Date()): string | null {
  if (!trip?.startDate) return null;
  const start = dayNumber(trip.startDate);
  const end = trip.endDate ? dayNumber(trip.endDate) : start;
  if (start === null || end === null) return null;

  const now = todayNumber(today);
  if (now < start) {
    const days = start - now;
    return days === 1 ? "Tomorrow!" : `${days} days to go`;
  }
  if (now <= end) {
    const total = end - start + 1;
    return total === 1 ? "Today's the day!" : `Day ${now - start + 1} of ${total}`;
  }
  return "Trip complete";
}
