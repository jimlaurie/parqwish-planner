// ==================== TRADE LIST PDF ====================
// The Collection page's "Trade list" (dland-wishes docs/collections-design.md
// §9): a trading category's Traders and Wants as a PDF with their photos, for
// a forum, a group post or a trade night. The page itself comes from
// @shared/collection-trade (the same one Pal prints); it's drawn in an
// offscreen iframe, so its own styles can't touch the Planner's, then turned
// into A4 pages with html2canvas and jsPDF, as the trip recap is.

import { parkToday } from "./dates";
import { tradeListHtml, tradeLists } from "@shared/collection-trade";
import type { CollectionFieldDef, CollectionItem } from "@shared/types/collection";

const PAGE_WIDTH_PX = 794; // A4 at 96 dpi

/** The photo to print: the Planner keeps photos as data URLs. */
function photoFor(item: CollectionItem): string | undefined {
  const set = item.photoSets?.[0];
  return set?.display || set?.full || set?.thumbnail || undefined;
}

function longDate(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12)).toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "UTC",
  });
}

/** An offscreen iframe holding the page, once it and its images have loaded. */
async function renderFrame(html: string): Promise<HTMLIFrameElement> {
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.cssText = `position:fixed;left:-10000px;top:0;width:${PAGE_WIDTH_PX}px;height:1123px;border:0;`;
  const loaded = new Promise<void>((resolve) => { frame.onload = () => resolve(); });
  frame.srcdoc = html;
  document.body.appendChild(frame);
  await loaded;
  const doc = frame.contentDocument;
  if (!doc) throw new Error("[TradeList] The page didn't load");
  await Promise.all(Array.from(doc.images).map((img) => img.decode().catch(() => undefined)));
  frame.style.height = `${doc.documentElement.scrollHeight}px`;
  return frame;
}

/** Makes the trade list for a category and downloads it; throws if it couldn't be made. */
export async function downloadTradeList(
  items: CollectionItem[], category: { id: string; name: string; icon?: string }, fields: CollectionFieldDef[], owner?: string,
): Promise<void> {
  const today = parkToday();
  const html = tradeListHtml({
    categoryName: category.name, categoryIcon: category.icon, fields, owner, dateLabel: longDate(today),
    lists: tradeLists(items, category.id, "all", today), photoFor,
  });
  const html2canvas = (await import("html2canvas-pro")).default;
  const { jsPDF } = await import("jspdf");
  const frame = await renderFrame(html);
  try {
    const body = frame.contentDocument!.body;
    const canvas = await html2canvas(body, { scale: 2, backgroundColor: "#FFFFFF", useCORS: true, logging: false, windowWidth: PAGE_WIDTH_PX });
    const pdf = new jsPDF("p", "mm", "a4");
    const pageWidth = 210;
    const pageHeight = 297;
    const imgHeight = (canvas.height * pageWidth) / canvas.width;
    const imgData = canvas.toDataURL("image/jpeg", 0.92);
    for (let offset = 0; offset < imgHeight; offset += pageHeight) {
      if (offset > 0) pdf.addPage();
      pdf.addImage(imgData, "JPEG", 0, -offset, pageWidth, imgHeight);
    }
    const safe = category.name.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "") || "Collection";
    pdf.save(`${safe}-trade-list-${today}.pdf`);
  } finally {
    frame.remove();
  }
}
