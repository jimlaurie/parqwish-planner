// ==================== COLLECTION SETTINGS MERGE (pure) ====================
// Merging two devices' collection settings part by part, so a change to one
// category on Pal and another on the Planner both survive (docs/collections-
// design.md §12, step 6). Every local change stamps the parts it changed
// (stampCollectionSettings, called by both apps' settings stores); a cloud
// copy is merged in, each part taken from the side that changed it last
// (mergeCollectionSettings). Parts:
//   on:{id}       whether a category is switched on
//   override:{id} a built-in category's layout or "I trade these"
//   usercat:{id}  one of the user's own categories (name, icon, layout, trades, deletion)
//   fields:{id}   a category's own fields, field order and hidden built-in fields
//   order         the order categories are shown in
//   firstRun      the first-visit picker has been shown (true wins)
// Settings saved before stamps existed count every part as changed at their
// updatedAt, which is the old whole-copy rule. No I/O.

import type { CollectionSettings, UserCollectionCategory } from "./types/collection";
import { getBuiltInCollectionCategory } from "./constants/collections";

type Parts = Map<string, unknown>;
type Override = NonNullable<CollectionSettings["builtInOverrides"]>[string];
type FieldDefs = NonNullable<CollectionSettings["customFields"]>[string];
interface FieldsPart { custom: FieldDefs | null; order: string[] | null; hidden: string[] | null }

function categoryIds(s: CollectionSettings): string[] {
  return [...new Set([
    ...s.enabled, ...Object.keys(s.builtInOverrides ?? {}), ...s.userCategories.map((c) => c.id),
    ...Object.keys(s.customFields ?? {}), ...Object.keys(s.fieldOrder ?? {}), ...Object.keys(s.hiddenBuiltInFields ?? {}),
  ])];
}

/** Each part's value, as JSON, so parts compare by content. */
function partsOf(s: CollectionSettings): Parts {
  const parts: Parts = new Map();
  for (const id of categoryIds(s)) {
    parts.set(`on:${id}`, s.enabled.includes(id));
    parts.set(`override:${id}`, s.builtInOverrides?.[id] ?? null);
    parts.set(`usercat:${id}`, s.userCategories.find((c) => c.id === id) ?? null);
    parts.set(`fields:${id}`, {
      custom: s.customFields?.[id] ?? null, order: s.fieldOrder?.[id] ?? null, hidden: s.hiddenBuiltInFields?.[id] ?? null,
    });
  }
  parts.set("order", s.enabled);
  parts.set("firstRun", s.firstRunDone);
  return parts;
}

/** A part's value; a category part the settings don't mention reads as off/empty. */
function partValue(parts: Parts, key: string): string {
  if (parts.has(key)) return JSON.stringify(parts.get(key));
  if (key.startsWith("on:")) return "false";
  if (key.startsWith("fields:")) return JSON.stringify({ custom: null, order: null, hidden: null });
  return "null";
}

// ==================== STAMPING ====================

/**
 * `next` with every part that differs from `prev` stamped `now`. Both apps'
 * settings stores call this on each local change. Settings stamped for the
 * first time start every part they have at their old updatedAt.
 */
export function stampCollectionSettings(prev: CollectionSettings, next: CollectionSettings, now: number): CollectionSettings {
  const before = partsOf(prev);
  const after = partsOf(next);
  const base = prev.stamps ?? Object.fromEntries([...before.keys()].map((k) => [k, prev.updatedAt ?? 0]));
  const stamps = { ...base, ...(next.stamps ?? {}) };
  let changed = false;
  for (const key of new Set([...before.keys(), ...after.keys()])) {
    if (partValue(before, key) !== partValue(after, key)) { stamps[key] = now; changed = true; }
  }
  return changed || !prev.stamps ? { ...next, stamps } : next;
}

// ==================== MERGING ====================

/**
 * When a part last changed: its stamp (never, for a part the stamps don't
 * name); settings saved before stamps existed count every part, named or
 * not, as changed at their updatedAt, the old whole-copy rule.
 */
function stampOf(s: CollectionSettings, key: string): number {
  if (s.stamps) return s.stamps[key] ?? 0;
  return s.updatedAt ?? 0;
}

/** Which side's version of a part wins: the later stamp; a tie goes to the larger value, so both devices pick the same. */
function winner(a: CollectionSettings, pa: Parts, b: CollectionSettings, pb: Parts, key: string): "a" | "b" {
  const sa = stampOf(a, key);
  const sb = stampOf(b, key);
  if (sa !== sb) return sa > sb ? "a" : "b";
  return partValue(pa, key) >= partValue(pb, key) ? "a" : "b";
}

/** The categories switched on, in the winning order, then any switched on that the order doesn't have. */
function mergedEnabled(on: Set<string>, order: string[], other: string[]): string[] {
  const listed = order.filter((id) => on.has(id));
  return [...listed, ...other.filter((id) => on.has(id) && !listed.includes(id)), ...[...on].filter((id) => !listed.includes(id) && !other.includes(id))];
}

/** A category that can be shown: built in, or one of the user's own not deleted. */
function usable(id: string, userCategories: UserCollectionCategory[]): boolean {
  return !!getBuiltInCollectionCategory(id) || userCategories.some((c) => c.id === id && !c.deletedAt);
}

/** Two devices' settings merged: each part from the side that changed it last. */
export function mergeCollectionSettings(a: CollectionSettings, b: CollectionSettings): CollectionSettings {
  const pa = partsOf(a);
  const pb = partsOf(b);
  const keys = [...new Set([...pa.keys(), ...pb.keys()])];
  const pick = (key: string) => (winner(a, pa, b, pb, key) === "a" ? pa.get(key) : pb.get(key));
  const ids = [...new Set([...categoryIds(a), ...categoryIds(b)])];
  const ownIds = [...new Set([...a.userCategories, ...b.userCategories].map((c) => c.id))];
  const userCategories = ownIds.map((id) => pick(`usercat:${id}`) as UserCollectionCategory | null | undefined).filter((c): c is UserCollectionCategory => !!c);
  const on = new Set(ids.filter((id) => pick(`on:${id}`) === true && usable(id, userCategories)));
  const orderFromA = winner(a, pa, b, pb, "order") === "a";
  const merged: CollectionSettings = {
    enabled: mergedEnabled(on, orderFromA ? a.enabled : b.enabled, orderFromA ? b.enabled : a.enabled),
    userCategories,
    firstRunDone: a.firstRunDone || b.firstRunDone,
    createdAt: Math.min(a.createdAt, b.createdAt),
    updatedAt: Math.max(a.updatedAt, b.updatedAt),
    stamps: Object.fromEntries(keys.map((k) => [k, Math.max(stampOf(a, k), stampOf(b, k))])),
  };
  for (const id of ids) {
    const override = pick(`override:${id}`) as Override | null | undefined;
    if (override) merged.builtInOverrides = { ...merged.builtInOverrides, [id]: override };
    const fields = pick(`fields:${id}`) as FieldsPart | undefined;
    if (fields?.custom) merged.customFields = { ...merged.customFields, [id]: fields.custom };
    if (fields?.order) merged.fieldOrder = { ...merged.fieldOrder, [id]: fields.order };
    if (fields?.hidden) merged.hiddenBuiltInFields = { ...merged.hiddenBuiltInFields, [id]: fields.hidden };
  }
  return merged;
}

/** Whether two settings show the same choices (their stamps and times aside). */
export function sameCollectionSettings(a: CollectionSettings, b: CollectionSettings): boolean {
  const pa = partsOf(a);
  const pb = partsOf(b);
  return [...new Set([...pa.keys(), ...pb.keys()])].every((k) => partValue(pa, k) === partValue(pb, k));
}
