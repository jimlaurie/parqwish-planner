// ==================== RETURN PATH ====================
// The Edit Trip page can be opened from any page (the trip name in the top
// bar) and goes back there afterwards: /trip?id=…&from=/plan. Only the
// app's own pages are accepted as `from`, so a crafted link can't send
// someone to another site.

const PAGE_LABELS: Record<string, string> = {
  "": "Home", plan: "Plan", preview: "Preview", prepare: "Prepare", play: "Play", publish: "Publish", catalog: "Catalog",
};

/** `from` if it's one of the app's own pages (and not the Edit Trip page), else null. */
export function safeReturnPath(from: string | null | undefined): string | null {
  if (!from || !from.startsWith("/") || from.startsWith("//") || /[\\\s]/.test(from)) return null;
  if (!/^\/[\w\-/]*(\?[\w\-=&%.]*)?$/.test(from)) return null;
  if (from === "/trip" || from.startsWith("/trip?") || from.startsWith("/trip/")) return null;
  return from;
}

/** The back button's label for a return path: "Plan", "Home"… */
export function returnLabel(path: string): string {
  const first = path.split(/[/?]/)[1] ?? "";
  return PAGE_LABELS[first] ?? "Back";
}

/** The Edit Trip page for a trip, coming back to `from` afterwards. */
export function editTripHref(tripId: string, from?: string): string {
  const back = safeReturnPath(from);
  return `/trip?id=${encodeURIComponent(tripId)}${back && back !== "/" ? `&from=${encodeURIComponent(back)}` : ""}`;
}
