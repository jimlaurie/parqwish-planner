// ==================== TRIP SELECTION ====================
// Which trip the app should have selected. Pure — AppInit's
// useTripSelection() feeds it the device's trips and applies the answer.
//
// Keeps the current selection whenever that trip is on this device. A
// selection pointing at a trip that isn't — browser data cleared but the
// persisted store kept, or the trip deleted on another device — used to
// leave Plan/Preview/Prepare/Publish on "Loading trip..." forever.
// With nothing (valid) selected, picks the trip you most likely want:
// one in progress, else the next one coming up, else the most recent.

export interface SelectableTrip {
  id: string;
  startDate: string; // YYYY-MM-DD, "" for templates
  endDate: string;
  updatedAt: number;
  isTemplate?: boolean;
  isArchived?: boolean;
}

/** Today as YYYY-MM-DD in the device's own time zone. */
export function localToday(now: Date = new Date()): string {
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${m}-${d}`;
}

function defaultTrip(trips: SelectableTrip[], today: string): SelectableTrip | null {
  const real = trips.filter((t) => !t.isTemplate && !t.isArchived && t.startDate);
  const inProgress = real.filter((t) => t.startDate <= today && (t.endDate || t.startDate) >= today);
  if (inProgress.length) return inProgress.sort((a, b) => a.startDate.localeCompare(b.startDate))[0];
  const upcoming = real.filter((t) => t.startDate > today);
  if (upcoming.length) return upcoming.sort((a, b) => a.startDate.localeCompare(b.startDate))[0];
  const pool = real.length ? real : trips.filter((t) => !t.isTemplate);
  return pool.length ? [...pool].sort((a, b) => b.updatedAt - a.updatedAt)[0] : null;
}

/** The trip id that should be selected, given what's selected now. */
export function resolveTripSelection(currentId: string | null, trips: SelectableTrip[], today: string): string | null {
  if (currentId && trips.some((t) => t.id === currentId)) return currentId;
  return defaultTrip(trips, today)?.id ?? null;
}
