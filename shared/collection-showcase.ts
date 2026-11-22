// ==================== COLLECTION SHOWCASE (pure) ====================
// The Planner's Showcase (docs/collections-design.md §7, §9): a category's
// Haves as a photo wall to admire, screenshot or print. Which items, in what
// order, each caption, and the wall as a printable HTML page (the Planner
// turns it into a PDF; photos come in as data URLs). No I/O.

import { collectionItemSummary } from "./collection-view";
import { escapeTradeHtml } from "./collection-trade";
import type { CollectionFieldDef, CollectionItem } from "./types/collection";

/** A category's Haves, newest first (by when they came, then when they were added), photos before items without one. */
export function showcaseItems(items: CollectionItem[], categoryId: string): CollectionItem[] {
  const newest = (a: CollectionItem, b: CollectionItem) =>
    (b.acquired?.date ?? "").localeCompare(a.acquired?.date ?? "") || b.createdAt - a.createdAt;
  const haves = items.filter((i) => i.category === categoryId && i.state === "have");
  const hasPhoto = (i: CollectionItem) => !!i.photoSets?.length;
  return [...haves.filter(hasPhoto).sort(newest), ...haves.filter((i) => !hasPhoto(i)).sort(newest)];
}

/** A caption's second line: the item's details (edition, series…), else its count, else "". */
export function showcaseCaption(item: CollectionItem, fields: CollectionFieldDef[]): string {
  const summary = collectionItemSummary(item, fields, 2);
  if (summary) return summary;
  return (item.quantity ?? 1) > 1 ? `×${item.quantity}` : "";
}

export interface ShowcaseInput {
  categoryName: string;
  categoryIcon?: string;
  items: CollectionItem[];
  fields: CollectionFieldDef[];
  /** The photo to print for an item (a data URL), or undefined for none. */
  photoFor: (item: CollectionItem) => string | undefined;
  /** Whose collection, e.g. "Mary" (optional). */
  owner?: string;
}

const SHOWCASE_CSS = `
  body { font-family: -apple-system, Helvetica, Arial, sans-serif; color: #1C1C28; background: #FFFFFF; margin: 24px; }
  h1 { font-size: 26px; margin: 0 0 4px; }
  .sub { color: #5A5A6E; font-size: 13px; margin-bottom: 18px; }
  .wall { column-count: 3; column-gap: 12px; }
  figure { margin: 0 0 12px; break-inside: avoid; page-break-inside: avoid; border: 1px solid #E2DED6; border-radius: 10px; overflow: hidden; }
  figure img { display: block; width: 100%; height: auto; }
  .noPhoto { height: 120px; display: flex; align-items: center; justify-content: center; font-size: 44px; background: #F7F5F2; }
  figcaption { padding: 6px 8px; }
  .name { font-weight: 600; font-size: 12px; }
  .line { color: #5A5A6E; font-size: 10px; margin-top: 2px; }
  .foot { color: #5A5A6E; font-size: 10px; margin-top: 20px; }
`;

/** The Showcase as a printable page: a title, then the photo wall in three columns. */
export function showcaseHtml(input: ShowcaseInput): string {
  const title = `${input.categoryIcon ? `${input.categoryIcon} ` : ""}${input.owner ? `${input.owner}'s ` : "My "}${input.categoryName}`;
  const figures = input.items.map((item) => {
    const photo = input.photoFor(item);
    const picture = photo
      ? `<img src="${escapeTradeHtml(photo)}" alt="">`
      : `<div class="noPhoto">${escapeTradeHtml(input.categoryIcon ?? "📌")}</div>`;
    const line = showcaseCaption(item, input.fields);
    return `<figure>${picture}<figcaption><div class="name">${escapeTradeHtml(item.name || "Unnamed item")}</div>${line ? `<div class="line">${escapeTradeHtml(line)}</div>` : ""}</figcaption></figure>`;
  }).join("");
  const count = `${input.items.length} ${input.items.length === 1 ? "item" : "items"}`;
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<style>${SHOWCASE_CSS}</style></head><body>
<h1>${escapeTradeHtml(title)}</h1><div class="sub">${count}</div>
${figures ? `<div class="wall">${figures}</div>` : '<p class="sub">Nothing in this category yet.</p>'}
<div class="foot">Made with ParQwish, an unofficial fan app. Photos are the collector's own.</div>
</body></html>`;
}
