// ==================== TRIP COUNTDOWN ====================
// One-line status for the Home banner: how far away the active trip is,
// which day of it you're on, or that it's over. Pure — pass `today` in tests.

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

export function tripCountdown(trip: CountdownTrip | null | undefined, today: Date = new Date()): string {
  if (!trip) return "Pick a trip to get started";
  const start = trip.startDate ? dayNumber(trip.startDate) : null;
  const end = trip.endDate ? dayNumber(trip.endDate) : start;
  if (start === null || end === null) return trip.name;

  const now = todayNumber(today);
  if (now < start) {
    const days = start - now;
    return days === 1 ? `${trip.name} · Tomorrow!` : `${trip.name} · ${days} days to go`;
  }
  if (now <= end) {
    const total = end - start + 1;
    return total === 1 ? `${trip.name} · Today's the day!` : `${trip.name} · Day ${now - start + 1} of ${total}`;
  }
  return `${trip.name} · Relive it on Publish`;
}
