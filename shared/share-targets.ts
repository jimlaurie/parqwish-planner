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

/** The site's own names in its host ("disneyland.disney.go.com" → ["disneyland", "disney"]), for spotting them in a title. */
function siteWords(host: string): string[] {
  return host.split(".").slice(0, -1).filter((w) => w.length >= 3 && !["www", "com", "co", "go"].includes(w));
}

/** A page title without the site's name at its end ("Ear Hat | shopDisney" → "Ear Hat"). */
export function withoutSiteSuffix(title: string, url: string): string {
  const match = /^(.+)\s+(?:\||–|—|-|·)\s+([^|–—·]+)$/.exec(title.trim());
  if (!match) return title.trim();
  const tail = match[2].toLowerCase().replace(/[^a-z0-9]/g, "");
  return siteWords(shareHost(url)).some((w) => tail.includes(w)) ? match[1].trim() : title.trim();
}

/**
 * A readable name from an address with no title (a Shortcut sends only the
 * address): its last path part's words ("haunted-mansion-ears-123.html" →
 * "Haunted mansion ears"), else the site ("shopdisney.com").
 */
export function nameFromUrl(url: string): string {
  const host = shareHost(url).replace(/^www\./, "");
  const path = url.replace(/^[a-z][a-z0-9+.-]*:\/\/[^/?#]*/i, "").split(/[?#]/)[0];
  for (const part of path.split("/").filter(Boolean).reverse()) {
    let decoded = part;
    try { decoded = decodeURIComponent(part); } catch { /* keep it as it is */ }
    // Words with letters, not ids: "123", "p12345", "a1b2c3d4"
    const words = decoded.replace(/\.[a-z0-9]{2,5}$/i, "").split(/[-_+\s]+/)
      .filter((w) => /[a-z]/i.test(w) && !(/\d/.test(w) && w.length >= 4) && !/^[a-z]?\d+$/i.test(w));
    // One short word ("dp", "pin", "item") says nothing; the site says more
    if (words.length >= 2 || (words.length === 1 && words[0].length >= 5)) {
      const name = words.join(" ").toLowerCase();
      return name.charAt(0).toUpperCase() + name.slice(1);
    }
  }
  return host || url;
}

/** The item's name: the page's title (without the site's name), else the shared text, else one made from the address; at most 100 characters. */
export function sharedTitle(pageTitle: string | null | undefined, content: { url: string; text: string; image?: string }): string {
  const fromPage = pageTitle ? withoutSiteSuffix(pageTitle, content.url) : "";
  const title = (fromPage || content.text || (content.url ? nameFromUrl(content.url) : "") || (content.image ? "Shared photo" : "Shared item")).trim();
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
