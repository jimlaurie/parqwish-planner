// ==================== HTML ESCAPING ====================
// For the HTML the app builds as strings (the recap PDF, its resort map SVG,
// the printable trip itinerary). Anything a person typed or a collaborator
// synced (trip and item names, captions, hotel or flight details) goes
// through escapeHtml before it's interpolated, so it shows as text and can
// never become markup.

const HTML_ENTITIES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

/** Escapes text for HTML or SVG content and for quoted attribute values. */
export function escapeHtml(text: string | number | null | undefined): string {
  return String(text ?? "").replace(/[&<>"']/g, (c) => HTML_ENTITIES[c]);
}
