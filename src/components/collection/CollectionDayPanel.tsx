"use client";

// ==================== COLLECTION DAY PANEL ====================
// Preview's Collection list for the day (dland-wishes docs/collections-design.md
// §14): the Wants and Trades put on it (+ Day, the item window's Days row),
// "Look for" or "Bring to trade". Ticking one asks how: Got it on a Want
// (Bought, Traded, Gift, Found) makes it Have; Traded it on a Trade (Traded,
// Sold, Gave away) takes one off a count, or makes it Gone. Unticking undoes
// the tick. Rules: @shared/collection-days, shared with Pal's Home. Hidden
// when the day has none.

import { useMemo, useState } from "react";
import CollectionItemModal from "./CollectionItemModal";
import { CollectionPhoto } from "./CollectionTile";
import { useCollection } from "@/hooks/use-collection";
import { useUsers } from "@/hooks/use-users";
import { saveCollectionItem } from "@/lib/collection-store";
import type { CollectionItem } from "@/lib/db";
import {
  COLLECTION_GOT_IT_HOW, COLLECTION_TRADED_IT_HOW, collectionDayLine, collectionItemsForDay, isCollectionDayDone,
  tickCollectionDay, untickCollectionDay,
} from "@shared/collection-days";
import { resolveCollectionCategory } from "@shared/collections";
import { orderCollectionTripUsers } from "@shared/collection-owners";
import type { CollectionAcquiredHow, CollectionGoneHow } from "@shared/types/collection";
import { useParkData } from "@/hooks/use-park-data";

interface Props {
  date: string;
  tripId?: string;
}

export default function CollectionDayPanel({ date, tripId }: Props) {
  const { settings, items } = useCollection();
  const { users: tripUsers } = useUsers();
  const users = useMemo(() => orderCollectionTripUsers((tripUsers ?? []).map((u) => ({ id: u.id, name: u.name, color: u.color }))), [tripUsers]);
  const dayItems = useMemo(() => collectionItemsForDay(items, date), [items, date]);
  const [asking, setAsking] = useState<string | null>(null);
  const [editing, setEditing] = useState<CollectionItem | null>(null);
  const [problem, setProblem] = useState("");
  // A Want's "Look for it in" shops by name (park data ids are "park__shopId")
  const { items: parkItems } = useParkData();
  if (!settings || !dayItems.length) return null;

  const save = async (item: CollectionItem) => {
    try { await saveCollectionItem(item); setProblem(""); } catch (e) {
      console.error("[CollectionDayPanel] saving failed:", e);
      setProblem("That change wasn't saved. Please try again.");
    }
  };
  const onTick = (item: CollectionItem) => {
    if (item.dayTicks?.[date]) { save(untickCollectionDay(item, date, Date.now())); return; }
    if (isCollectionDayDone(item, date)) { setProblem(`${item.name || "That item"} was changed in your collection; open it to change it again.`); return; }
    setAsking(asking === item.id ? null : item.id);
  };
  const choose = (item: CollectionItem, how: CollectionAcquiredHow | CollectionGoneHow) => {
    setAsking(null);
    save(tickCollectionDay(item, date, how, { now: Date.now(), tripId }));
  };

  const whereFor = (item: CollectionItem): string | undefined => {
    if (item.state !== "want" || !item.lookIn?.shopIds?.length) return undefined;
    const names = item.lookIn.shopIds.map((id) => parkItems.find((p) => p.type === "shop" && p.id.endsWith(`__${id}`))?.name ?? id);
    return `in ${names.join(", ")}`;
  };

  return (
    <section aria-label="Collection" data-testid="collection-day-panel" className="w-full max-w-3xl mb-4 rounded-xl p-3"
      style={{ backgroundColor: "var(--color-bg-card)", border: "1px solid var(--color-border-subtle)" }}>
      <h2 className="text-sm font-bold mb-2" style={{ color: "var(--color-text-primary)" }}>📌 Collection</h2>
      <ul className="flex flex-col gap-2">
        {dayItems.map((item) => (
          <DayRow key={item.id} item={item} date={date} icon={resolveCollectionCategory(settings, item.category)?.icon ?? "📌"}
            category={resolveCollectionCategory(settings, item.category)?.name ?? ""} where={whereFor(item)} asking={asking === item.id}
            onTick={() => onTick(item)} onChoose={(how) => choose(item, how)} onCancel={() => setAsking(null)}
            onOpen={() => setEditing(item)} />
        ))}
      </ul>
      {problem && <p role="alert" className="mt-2 text-xs" style={{ color: "var(--color-error)" }}>{problem}</p>}
      <CollectionItemModal visible={!!editing} settings={settings} item={editing ?? undefined}
        defaultCategory={editing?.category ?? ""} defaultState={editing?.state ?? "want"} users={users}
        onClose={() => setEditing(null)} />
    </section>
  );
}

function DayRow({ item, date, icon, category, where, asking, onTick, onChoose, onCancel, onOpen }: {
  item: CollectionItem; date: string; icon: string; category: string; where?: string; asking: boolean;
  onTick: () => void; onChoose: (how: CollectionAcquiredHow | CollectionGoneHow) => void; onCancel: () => void; onOpen: () => void;
}) {
  const done = isCollectionDayDone(item, date);
  const name = item.name || "Unnamed item";
  const line = [collectionDayLine(item, date), where, category].filter(Boolean).join(" · ");
  return (
    <li data-testid="collection-day-row">
      <div className="flex items-center gap-3">
        <button type="button" role="checkbox" aria-checked={done} aria-label={done ? `Untick ${name}` : `Tick ${name}`} onClick={onTick}
          className="w-5 h-5 rounded shrink-0 flex items-center justify-center text-xs font-bold cursor-pointer"
          style={{ border: "1.5px solid var(--color-text-secondary)", backgroundColor: done ? "var(--color-gold)" : "transparent", color: "var(--color-bg-deep)" }}>
          {done ? "✓" : ""}
        </button>
        <button type="button" onClick={onOpen} className="flex-1 min-w-0 flex items-center gap-2 text-left cursor-pointer">
          <CollectionPhoto item={item} icon={icon} className="w-9 h-9 rounded-md shrink-0 text-base" />
          <span className="min-w-0">
            <span className={`block text-sm font-semibold truncate ${done ? "line-through opacity-70" : ""}`} style={{ color: "var(--color-text-primary)" }}>{name}</span>
            <span className="block text-xs truncate" style={{ color: "var(--color-text-secondary)" }}>{line}</span>
          </span>
        </button>
      </div>
      {asking && <TickChoices item={item} onChoose={onChoose} onCancel={onCancel} />}
    </li>
  );
}

/** How it came (a Want) or went (a Trade): the tick's question, in the row. */
function TickChoices({ item, onChoose, onCancel }: {
  item: CollectionItem; onChoose: (how: CollectionAcquiredHow | CollectionGoneHow) => void; onCancel: () => void;
}) {
  const want = item.state === "want";
  const count = item.quantity ?? 1;
  const question = want ? "Got it! How did you get it?" : count > 1 ? `Traded one of ${count}? How did it go?` : "Traded it? How did it go?";
  const choices = want ? COLLECTION_GOT_IT_HOW : COLLECTION_TRADED_IT_HOW;
  return (
    <div className="ml-8 mt-2 flex flex-wrap items-center gap-2" role="group" aria-label={question}>
      <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>{question}</span>
      {choices.map((c) => (
        <button key={c.value} type="button" onClick={() => onChoose(c.value)}
          className="px-2.5 py-1 rounded-full text-xs font-semibold cursor-pointer"
          style={{ backgroundColor: "var(--color-gold)", color: "var(--color-bg-deep)" }}>{c.label}</button>
      ))}
      <button type="button" onClick={onCancel} className="px-2.5 py-1 rounded-full text-xs cursor-pointer"
        style={{ border: "1px solid var(--color-border-default)", color: "var(--color-text-secondary)" }}>Cancel</button>
    </div>
  );
}
