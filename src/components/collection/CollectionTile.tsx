"use client";

// ==================== COLLECTION TILE ====================
// One collection item as its category's layout draws it (dland-wishes
// docs/collections-design.md §7): board, a square photo with the name under
// it (pins); shelf, a card with a detail line (buckets, plush); list, a row
// with a small photo and the date (pennies, autographs, paper). The first
// photo shows, or the category's emoji without one; badges for a Want's
// ticket (E = grail), For sale ($) and a count above one (×2).

import { getFirstThumbnail } from "@/lib/image-utils";
import { TICKET_COLORS, ticketTitle } from "@/lib/constants";
import type { CollectionItem } from "@/lib/db";
import type { CollectionLayout } from "@shared/types/collection";

interface Props {
  item: CollectionItem;
  layout: CollectionLayout;
  icon: string;
  summary: string;
  date: string;
  onOpen?: () => void;
}

function label(item: CollectionItem, summary: string, date: string): string {
  const parts = [item.name || "Unnamed item"];
  if (item.state === "want" && item.priority) parts.push(ticketTitle(item.priority));
  if (item.state === "trade" && item.forSale) parts.push("for sale");
  if ((item.quantity ?? 1) > 1) parts.push(`${item.quantity} of them`);
  if (summary) parts.push(summary);
  if (date) parts.push(date);
  return parts.join(", ");
}

function Photo({ item, icon, className }: { item: CollectionItem; icon: string; className: string }) {
  const src = getFirstThumbnail(item);
  if (src) {
    // Photos are the user's own data URLs, so next/image adds nothing here
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="" className={`${className} object-cover`} />;
  }
  return (
    <div className={`${className} flex items-center justify-center text-3xl`} style={{ backgroundColor: "var(--color-surface-sunken)" }}>
      <span aria-hidden="true">{icon}</span>
    </div>
  );
}

function Badges({ item }: { item: CollectionItem }) {
  const ticket = item.state === "want" && item.priority ? TICKET_COLORS[item.priority] : undefined;
  const forSale = item.state === "trade" && item.forSale;
  const many = (item.quantity ?? 1) > 1;
  if (!ticket && !forSale && !many) return null;
  return (
    <div className="absolute top-1.5 left-1.5 flex gap-1" aria-hidden="true">
      {ticket && (
        <span className="min-w-5 h-5 px-1 rounded text-[11px] font-extrabold flex items-center justify-center"
          style={{ backgroundColor: ticket.bg, border: `1px solid ${ticket.border}`, color: ticket.border }}>
          {item.priority}
        </span>
      )}
      {forSale && (
        <span className="min-w-5 h-5 px-1 rounded-full text-[10px] font-extrabold flex items-center justify-center"
          style={{ backgroundColor: "var(--color-gold)", color: "var(--color-bg-deep)" }}>$</span>
      )}
      {many && (
        <span className="min-w-5 h-5 px-1.5 rounded-full text-[10px] font-extrabold flex items-center justify-center"
          style={{ backgroundColor: "var(--color-gold)", color: "var(--color-bg-deep)" }}>×{item.quantity}</span>
      )}
    </div>
  );
}

export default function CollectionTile({ item, layout, icon, summary, date, onOpen }: Props) {
  const a11y = label(item, summary, date);
  if (layout === "list") {
    return (
      <button type="button" onClick={onOpen} aria-label={a11y} data-testid="collection-item"
        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left cursor-pointer transition-colors hover:brightness-110"
        style={{ backgroundColor: "var(--color-bg-card)", border: "1px solid var(--color-border-subtle)" }}>
        <div className="relative shrink-0"><Photo item={item} icon={icon} className="w-12 h-12 rounded-lg" /><Badges item={item} /></div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold truncate" style={{ color: "var(--color-text-primary)" }}>{item.name || "Unnamed"}</div>
          {summary && <div className="text-xs truncate" style={{ color: "var(--color-text-secondary)" }}>{summary}</div>}
        </div>
        {date && <div className="text-xs shrink-0" style={{ color: "var(--color-text-secondary)" }}>{date}</div>}
      </button>
    );
  }
  const shelf = layout === "shelf";
  return (
    <button type="button" onClick={onOpen} aria-label={a11y} data-testid="collection-item"
      className={`text-left cursor-pointer transition-colors hover:brightness-110 ${shelf ? "p-2 rounded-xl" : ""}`}
      style={shelf ? { backgroundColor: "var(--color-bg-card)", border: "1px solid var(--color-border-subtle)" } : undefined}>
      <div className="relative"><Photo item={item} icon={icon} className="w-full aspect-square rounded-lg" /><Badges item={item} /></div>
      <div className={`mt-1.5 font-semibold truncate ${shelf ? "text-sm" : "text-xs text-center"}`} style={{ color: "var(--color-text-primary)" }}>
        {item.name || "Unnamed"}
      </div>
      {shelf && summary && <div className="text-xs truncate" style={{ color: "var(--color-text-secondary)" }}>{summary}</div>}
    </button>
  );
}
