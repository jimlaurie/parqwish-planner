"use client";

// ==================== COLLECTION RECAP ====================
// Publish's "Added to your collection" (dland-wishes docs/collections-design.md
// §6): the collection items got on the trip (@shared/collection-trip), grouped
// by category with each one's photo, name and how and when it came. Hidden
// when there are none, so anyone who doesn't collect never sees it. The recap
// PDF has the same section (src/lib/pdf-generator.ts).

import { useMemo } from "react";
import { CollectionPhoto } from "@/components/collection/CollectionTile";
import { useCollection } from "@/hooks/use-collection";
import { resolveCollectionCategory } from "@shared/collections";
import { tripRecapLine } from "@shared/collection-trip";
import type { CollectionItem } from "@shared/types/collection";

const ACCENT = "var(--color-accent-publish)";

export interface RecapGroup { id: string; name: string; icon: string; items: CollectionItem[] }

export default function CollectionRecap({ items }: { items: CollectionItem[] }) {
  const { settings } = useCollection();
  const groups = useMemo<RecapGroup[]>(() => {
    const byCategory = new Map<string, RecapGroup>();
    for (const item of items) {
      const category = settings ? resolveCollectionCategory(settings, item.category) : undefined;
      const id = category?.id ?? item.category;
      if (!byCategory.has(id)) byCategory.set(id, { id, name: category?.name ?? "Collection", icon: category?.icon ?? "📌", items: [] });
      byCategory.get(id)!.items.push(item);
    }
    return [...byCategory.values()];
  }, [items, settings]);
  if (!items.length) return null;

  return (
    <section className="w-full max-w-4xl mb-8" aria-label="Added to your collection" data-testid="publish-collection">
      <h2 className="text-xs font-bold mb-3 uppercase tracking-wider" style={{ color: ACCENT }}>
        📌 Added to your collection ({items.length})
      </h2>
      <div className="flex flex-col gap-4">
        {groups.map((group) => (
          <div key={group.id}>
            <h3 className="text-sm font-semibold mb-2" style={{ color: "var(--color-text-primary)" }}>
              <span aria-hidden="true">{group.icon}</span> {group.name} ({group.items.length})
            </h3>
            <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {group.items.map((item) => (
                <li key={item.id} className="rounded-xl p-2" data-testid="publish-collection-item"
                  style={{ backgroundColor: "var(--color-bg-card)", border: "1px solid var(--color-border-subtle)" }}>
                  <CollectionPhoto item={item} icon={group.icon} className="w-full aspect-square rounded-lg text-3xl flex items-center justify-center" />
                  <p className="mt-2 text-sm font-semibold truncate" style={{ color: "var(--color-text-primary)" }}>{item.name || "Unnamed item"}</p>
                  {tripRecapLine(item) && (
                    <p className="text-xs truncate" style={{ color: "var(--color-text-secondary)" }}>{tripRecapLine(item)}</p>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
