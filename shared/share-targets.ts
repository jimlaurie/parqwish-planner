// ==================== SHARE TARGETS (pure) ====================
// Where a page or photo shared to ParQwish can go, in Pal (its share
// extension, utils/shareTargets.ts) and the Planner (its /share page): the
// choices, the one suggested for a site, and the new item's name and notes.
// Each app saves the item its own way and may add choices of its own (the
// Planner's Dining). No I/O.

export type ShareDestination = "wish" | "collection" | "shopping" | "outfit" | "equipment" | "sundry";

export interface ShareChoice<D extends string = ShareDestination> {
  id: D;
  icon: string;
  label: string;
}

const CHOICES: ShareChoice[] = [
  { id: "wish", icon: "⭐", label: "Wishes" },
  { id: "collection", icon: "📌", label: "Collection" },
  { id: "shopping", icon: "🛍️", label: "Shopping" },
  { id: "outfit", icon: "👕", label: "Outfits" },
  { id: "equipment", icon: "🎒", label: "Gear" },
  { id: "sundry", icon: "🧴", label: "Sundries" },
];

/** The choices, Wishes first; Collection only where Collections are on. */
export function shareChoices(collectionsAvailable: boolean): ShareChoice[] {
  return CHOICES.filter((c) => c.id !== "collection" || collectionsAvailable);
}

/** Sites whose pages are usually things to buy or collect, so their choice is offered first. */
const SITE_HINTS: Array<[RegExp, ShareDestination]> = [
  [/(^|\.)(shopdisney|disneystore)\.com$/i, "shopping"],
  [/(^|\.)(pinpics|pintradingdb|disneypinsblog)\.com$/i, "collection"],
  [/(^|\.)(amazon|target|walmart|etsy)\.com$/i, "shopping"],
];

/** A link's host, or "" (a regex: React Native's URL doesn't implement hostname). */
export function shareHost(url: string | undefined): string {
  return /^[a-z][a-z0-9+.-]*:\/\/([^/?#:]+)/i.exec(url ?? "")?.[1]?.toLowerCase() ?? "";
}

/** The choice to highlight for a link: a shopping or pin site's, else Wishes. Never one that isn't offered. */
export function suggestedShareDestination<D extends string>(url: string | undefined, choices: ShareChoice<D>[]): D | "wish" {
  const host = shareHost(url);
  const hit = SITE_HINTS.find(([pattern]) => pattern.test(host))?.[1];
  return hit && choices.some((c) => c.id === hit) ? (hit as D) : "wish";
}

/** The item's name: the page's title, else the shared text, else the address; at most 100 characters. */
export function sharedTitle(pageTitle: string | null | undefined, content: { url: string; text: string; image?: string }): string {
  const title = (pageTitle || content.text || content.url || (content.image ? "Shared photo" : "Shared item")).trim();
  return title.length > 100 ? `${title.slice(0, 100)}...` : title;
}

/**
 * The item's notes: the shared text (unless it's the address or already the
 * item's name), then the address where the item has no link field of its own.
 */
export function sharedNotes(content: { url: string; text: string }, linkHasItsOwnField: boolean, name?: string): string {
  const text = content.text && content.text !== content.url && content.text !== name ? content.text : "";
  const parts = [text, linkHasItsOwnField ? "" : content.url];
  return parts.filter(Boolean).join("\n");
}
