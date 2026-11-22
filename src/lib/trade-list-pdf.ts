// ==================== TRADE LIST PDF ====================
// The Collection page's "Trade list" (dland-wishes docs/collections-design.md
// §9): a trading category's Traders and Wants as a PDF with their photos, for
// a forum, a group post or a trade night. The page comes from
// @shared/collection-trade (the same one Pal prints); src/lib/html-pdf.ts
// makes the PDF.

import { parkToday } from "./dates";
import { downloadHtmlAsPdf, fileSafe } from "./html-pdf";
import { tradeListHtml, tradeLists } from "@shared/collection-trade";
import type { CollectionFieldDef, CollectionItem } from "@shared/types/collection";

/** The photo to print: the Planner keeps photos as data URLs. */
export function printPhoto(item: CollectionItem): string | undefined {
  const set = item.photoSets?.[0];
  return set?.display || set?.full || set?.thumbnail || undefined;
}

function longDate(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12)).toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "UTC",
  });
}

/** Makes the trade list for a category and downloads it; throws if it couldn't be made. */
export async function downloadTradeList(
  items: CollectionItem[], category: { id: string; name: string; icon?: string }, fields: CollectionFieldDef[], owner?: string,
): Promise<void> {
  const today = parkToday();
  const html = tradeListHtml({
    categoryName: category.name, categoryIcon: category.icon, fields, owner, dateLabel: longDate(today),
    lists: tradeLists(items, category.id, "all", today), photoFor: printPhoto,
  });
  await downloadHtmlAsPdf(html, `${fileSafe(category.name)}-trade-list-${today}.pdf`);
}
