// ==================== NEW TRIP ====================
// Names and descriptions for the "+ New Trip" menu (NewTripMenu.tsx). A
// Quick Trip or a trip from a template is created straight away, dated today
// for both start and end, then opened in the trip editor to set real dates:
// a trip always has dates, since Preview's days, the countdown, Publish and
// trails depend on them.

/** "New Trip – Oct 13" for a YYYY-MM-DD date. */
export function quickTripName(today: string): string {
  const d = new Date(`${today}T12:00:00`);
  const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `New Trip – ${label}`;
}

/** A trip's name from its template's: "Fall Break (Template)" → "Fall Break". */
export function nameFromTemplate(templateName: string): string {
  return templateName.replace(/\s*\(Template\)\s*$/, "").trim() || templateName;
}

/** What a template holds, for telling templates apart: "18 wishes · 14 packing · hotel". */
export function templateSummary(t: { wishes: number; packing: number; hotels?: unknown[]; flights?: unknown[]; notes?: string }): string {
  const parts: string[] = [];
  if (t.wishes) parts.push(`${t.wishes} wish${t.wishes === 1 ? "" : "es"}`);
  if (t.packing) parts.push(`${t.packing} packing`);
  if (t.hotels?.length) parts.push(t.hotels.length === 1 ? "hotel" : `${t.hotels.length} hotels`);
  if (t.flights?.length) parts.push(t.flights.length === 1 ? "flight" : `${t.flights.length} flights`);
  if (t.notes?.trim()) parts.push("notes");
  return parts.length ? parts.join(" · ") : "Empty";
}
