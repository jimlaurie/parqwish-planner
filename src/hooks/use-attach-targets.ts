"use client";

// ==================== ATTACH TARGETS ====================
// The items a photo can be put on (src/lib/photo-attach.ts): every wish,
// packing item and collection item, with a label and a kind to show and
// search by (Catalog › Photos' "Add to items…"; 27 Nov 2026).

import { useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import db from "@/lib/db";
import { COLLECTIONS_AVAILABLE } from "@/lib/feature-flags";
import { getPackingTab } from "@shared/constants/packing";
import { getTagById } from "@shared/constants/tags";
import type { AttachTarget } from "@/lib/photo-attach";

export interface AttachChoice extends AttachTarget {
  /** "📌 Collection · Pins", "⭐ Wish · Dining", "👕 Outfits". */
  kindLabel: string;
  photoCount: number;
}

export function useAttachTargets(): AttachChoice[] {
  const data = useLiveQuery(async () => {
    const [wishes, packing, collection] = await Promise.all([
      db.wishes.toArray(),
      db.packingItems.toArray(),
      COLLECTIONS_AVAILABLE ? db.collectionItems.toArray() : Promise.resolve([]),
    ]);
    return { wishes, packing, collection };
  }, []);

  return useMemo(() => {
    if (!data) return [];
    const count = (i: { photoSets?: unknown[]; photos?: unknown[] }) => i.photoSets?.length || i.photos?.length || 0;
    const out: AttachChoice[] = [];
    for (const c of data.collection) {
      out.push({ kind: "collection", id: c.id, name: c.name || "Collection item", kindLabel: "📌 Collection", photoCount: count(c) });
    }
    for (const w of data.wishes) {
      const tag = getTagById(w.tags?.[0] ?? "");
      out.push({ kind: "wish", id: w.id, name: w.title, kindLabel: tag ? `${tag.icon} Wish · ${tag.label}` : "⭐ Wish", photoCount: count(w) });
    }
    for (const p of data.packing) {
      const tab = getPackingTab(p.type);
      out.push({ kind: "packing", id: p.id, name: p.name, kindLabel: tab ? `${tab.icon} ${tab.label}` : "📦 Packing", photoCount: count(p) });
    }
    return out.filter((o) => o.name).sort((a, b) => a.name.localeCompare(b.name));
  }, [data]);
}
