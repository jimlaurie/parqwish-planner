// ==================== COLLECTION TRADE MODE (pure) ====================
// Trade mode and the trade list (docs/collections-design.md §7, §9, §14): a
// trading category's Traders ("Up for trade") and Wants ("Looking for"), to
// show another guest or a cast member in the park, and the same lists as a
// trade-list PDF for a forum, a group post or a trade night. Pal's Trade mode
// (components/TradeMode.tsx) and both apps' PDFs use it; each app turns the
// HTML into a PDF its own way and passes photos in as data URLs. No I/O.
//
// Trade mode opens on the day's items (those put on the day with + Day,
// the ones actually brought) when there are any, else on all of them.

import { collectionItemSummary } from "./collection-view";
import { isOnCollectionDay } from "./collection-days";
import type { CollectionFieldDef, CollectionItem } from "./types/collection";

export type TradeScope = "today" | "all";

export interface TradeLists {
  /** Up for trade: items in Trade, by name. */
  trades: CollectionItem[];
  /** Looking for: Wants, the most wanted (E, the grail) first, then by name. */
  wants: CollectionItem[];
}

const PRIORITY_RANK: Record<string, number> = { E: 0, D: 1, C: 2, B: 3, A: 4 };

function byName(a: CollectionItem, b: CollectionItem): number {
  return (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base" });
}

function byWant(a: CollectionItem, b: CollectionItem): number {
  const rank = (i: CollectionItem) => PRIORITY_RANK[i.priority ?? "A"] ?? 5;
  return rank(a) - rank(b) || byName(a, b);
}

/** A category's Traders and Wants; with scope "today", only those put on `date`. */
export function tradeLists(items: CollectionItem[], categoryId: string, scope: TradeScope, date: string): TradeLists {
  const inScope = items.filter((i) => i.category === categoryId && (scope === "all" || isOnCollectionDay(i, date)));
  return {
    trades: inScope.filter((i) => i.state === "trade").sort(byName),
    wants: inScope.filter((i) => i.state === "want").sort(byWant),
  };
}

/** Where Trade mode opens: today's lists when anything is on today, else everything. */
export function defaultTradeScope(items: CollectionItem[], categoryId: string, date: string): TradeScope {
  const today = tradeLists(items, categoryId, "today", date);
  return today.trades.length || today.wants.length ? "today" : "all";
}

/** A card's lines under the name: its details (edition, series…), then how many, for sale, or how wanted. */
export function tradeCardLines(item: CollectionItem, fields: CollectionFieldDef[]): string[] {
  const lines: string[] = [];
  const summary = collectionItemSummary(item, fields, 3);
  if (summary) lines.push(summary);
  const extras: string[] = [];
  if (item.state === "trade") {
    if ((item.quantity ?? 1) > 1) extras.push(`×${item.quantity}`);
    if (item.forSale) extras.push("Also for sale");
  } else if (item.state === "want") {
    const p = item.priority ?? "A";
    extras.push(p === "E" ? "E · the grail" : `Want: ${p}`);
  }
  if (extras.length) lines.push(extras.join(" · "));
  return lines;
}

// ==================== TRADE LIST (HTML for the PDF) ====================

export interface TradeListInput {
  /** e.g. "Pins". */
  categoryName: string;
  categoryIcon?: string;
  lists: TradeLists;
  fields: CollectionFieldDef[];
  /** A photo for an item as a data URL (or any URL the renderer can load), or undefined for none. */
  photoFor: (item: CollectionItem) => string | undefined;
  /** "Sunday, November 22, 2026": printed under the title. */
  dateLabel: string;
  /** Who it's from, e.g. "Mary" (optional). */
  owner?: string;
}

const ESCAPES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

export function escapeTradeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => ESCAPES[c]);
}

function cardHtml(item: CollectionItem, input: TradeListInput): string {
  const photo = input.photoFor(item);
  const picture = photo
    ? `<img src="${escapeTradeHtml(photo)}" alt="">`
    : `<div class="noPhoto">${escapeTradeHtml(input.categoryIcon ?? "📌")}</div>`;
  const lines = tradeCardLines(item, input.fields).map((l) => `<div class="line">${escapeTradeHtml(l)}</div>`).join("");
  return `<div class="card"><div class="photo">${picture}</div><div class="name">${escapeTradeHtml(item.name || "Unnamed item")}</div>${lines}</div>`;
}

function sectionHtml(title: string, items: CollectionItem[], input: TradeListInput): string {
  if (!items.length) return "";
  return `<h2>${escapeTradeHtml(title)} <span class="count">(${items.length})</span></h2><div class="grid">${items.map((i) => cardHtml(i, input)).join("")}</div>`;
}

const TRADE_LIST_CSS = `
  body { font-family: -apple-system, Helvetica, Arial, sans-serif; color: #1C1C28; background: #FFFFFF; margin: 24px; }
  h1 { font-size: 24px; margin: 0 0 4px; }
  .sub { color: #5A5A6E; font-size: 13px; margin-bottom: 16px; }
  h2 { font-size: 17px; margin: 20px 0 10px; border-bottom: 2px solid #996515; padding-bottom: 4px; }
  .count { color: #5A5A6E; font-weight: normal; }
  .grid { display: flex; flex-wrap: wrap; gap: 12px; }
  .card { width: 30%; box-sizing: border-box; border: 1px solid #E2DED6; border-radius: 10px; padding: 8px; break-inside: avoid; page-break-inside: avoid; }
  .photo { width: 100%; aspect-ratio: 1 / 1; border-radius: 6px; overflow: hidden; background: #F7F5F2; display: flex; align-items: center; justify-content: center; }
  .photo img { width: 100%; height: 100%; object-fit: contain; }
  .noPhoto { font-size: 40px; }
  .name { font-weight: 600; font-size: 13px; margin-top: 6px; }
  .line { color: #5A5A6E; font-size: 11px; margin-top: 2px; }
  .foot { color: #5A5A6E; font-size: 10px; margin-top: 24px; }
`;

/** The trade list as a printable HTML page: Up for trade, then Looking for, each a photo grid. */
export function tradeListHtml(input: TradeListInput): string {
  const title = `${input.categoryIcon ? `${input.categoryIcon} ` : ""}${input.categoryName} trade list`;
  const sub = [input.owner, input.dateLabel].filter(Boolean).join(" · ");
  const body = sectionHtml("Up for trade", input.lists.trades, input) + sectionHtml("Looking for", input.lists.wants, input);
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<style>${TRADE_LIST_CSS}</style></head><body>
<h1>${escapeTradeHtml(title)}</h1><div class="sub">${escapeTradeHtml(sub)}</div>
${body || '<p class="sub">Nothing up for trade or wanted yet.</p>'}
<div class="foot">Made with ParQwish, an unofficial fan app. Photos are the collector's own.</div>
</body></html>`;
}
