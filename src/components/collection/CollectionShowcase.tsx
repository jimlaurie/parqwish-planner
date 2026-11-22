"use client";

// ==================== COLLECTION SHOWCASE ====================
// A category's Haves as a full-screen photo wall to admire or screenshot
// (dland-wishes docs/collections-design.md §7, §9): photos at their own shape
// in columns, newest first, each with its name and details; items without a
// photo come last as the category's icon. "Print / PDF" downloads the same
// wall as an A4 PDF (@shared/collection-showcase, src/lib/html-pdf.ts). Esc or
// Close returns to the Collection page. Follows the page's person filter.

import { useEffect, useMemo, useRef, useState } from "react";
import { showcaseCaption, showcaseHtml, showcaseItems } from "@shared/collection-showcase";
import { downloadHtmlAsPdf, fileSafe } from "@/lib/html-pdf";
import { printPhoto } from "@/lib/trade-list-pdf";
import type { CollectionFieldDef, CollectionItem } from "@shared/types/collection";

const ACCENT = "var(--color-gold)";

interface Props {
  visible: boolean;
  category: { id: string; name: string; icon: string };
  /** The page's items (the person filter applied). */
  items: CollectionItem[];
  fields: CollectionFieldDef[];
  /** Whose collection, when one person is picked ("Mary"). */
  owner?: string;
  onClose: () => void;
}

export default function CollectionShowcase({ visible, category, items, fields, owner, onClose }: Props) {
  const wall = useMemo(() => showcaseItems(items, category.id), [items, category.id]);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!visible) return undefined;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visible, onClose]);
  if (!visible) return null;

  const title = `${owner ? `${owner}'s` : "My"} ${category.name}`;
  const print = async () => {
    setBusy(true);
    setFailed(false);
    try {
      const html = showcaseHtml({ categoryName: category.name, categoryIcon: category.icon, items: wall, fields, owner, photoFor: printPhoto });
      await downloadHtmlAsPdf(html, `${fileSafe(category.name)}-showcase.pdf`);
    } catch (e) {
      console.error("[Showcase] The PDF failed:", e);
      setFailed(true);
    } finally { setBusy(false); }
  };

  return (
    <div role="dialog" aria-modal="true" aria-label={`Showcase: ${title}`} data-testid="collection-showcase"
      className="fixed inset-0 overflow-y-auto" style={{ backgroundColor: "var(--color-bg-deep)", zIndex: 10000 }}>
      <header className="sticky top-0 flex items-center gap-3 px-6 py-4"
        style={{ backgroundColor: "var(--color-bg-deep)", borderBottom: "1px solid var(--color-border-subtle)" }}>
        <h1 className="text-2xl font-bold mr-auto" style={{ color: "var(--color-heading)" }}>
          <span aria-hidden="true">{category.icon}</span> {title}
          <span className="ml-3 text-sm font-normal" style={{ color: "var(--color-text-secondary)" }}>
            {wall.length} {wall.length === 1 ? "item" : "items"}
          </span>
        </h1>
        {failed && <span role="alert" className="text-xs" style={{ color: "var(--color-error)" }}>PDF not made. Try again.</span>}
        <button type="button" onClick={print} disabled={busy || !wall.length} data-testid="showcase-print"
          className="px-4 py-2 rounded-xl text-sm font-semibold cursor-pointer disabled:opacity-60"
          style={{ color: ACCENT, border: `1px solid ${ACCENT}` }}>{busy ? "Making…" : "Print / PDF"}</button>
        <button type="button" ref={closeRef} onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-semibold cursor-pointer"
          style={{ backgroundColor: ACCENT, color: "var(--color-bg-deep)" }}>Close</button>
      </header>
      {wall.length ? (
        <div className="columns-2 sm:columns-3 lg:columns-4 xl:columns-5 gap-4 px-6 py-6">
          {wall.map((item) => <ShowcaseFigure key={item.id} item={item} icon={category.icon} line={showcaseCaption(item, fields)} />)}
        </div>
      ) : (
        <p className="px-6 py-16 text-center text-sm" style={{ color: "var(--color-text-secondary)" }}>
          Nothing in your {category.name.toLowerCase()} yet. Items you mark Have show here.
        </p>
      )}
    </div>
  );
}

function ShowcaseFigure({ item, icon, line }: { item: CollectionItem; icon: string; line: string }) {
  const src = item.photoSets?.[0]?.display || item.photoSets?.[0]?.full || item.photoSets?.[0]?.thumbnail;
  return (
    <figure className="mb-4 rounded-xl overflow-hidden break-inside-avoid" data-testid="showcase-item"
      style={{ backgroundColor: "var(--color-bg-card)", border: "1px solid var(--color-border-subtle)" }}>
      {src
        // Photos are the user's own data URLs, so next/image adds nothing here
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={src} alt={item.name || ""} className="block w-full h-auto" />
        : <div className="h-32 flex items-center justify-center text-5xl" aria-hidden="true">{icon}</div>}
      <figcaption className="px-3 py-2">
        <span className="block text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>{item.name || "Unnamed item"}</span>
        {line && <span className="block text-xs" style={{ color: "var(--color-text-secondary)" }}>{line}</span>}
      </figcaption>
    </figure>
  );
}
