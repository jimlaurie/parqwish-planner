// ==================== COLLECTION CATEGORIES (pure) ====================
// Rules for managing categories and their fields, in Pal (Settings ›
// Collections) and the Planner (the Collection page's Categories): moving a
// category or field up or down, what changing a field's choices does to the
// items that use them, saving an edited field, and where a deleted
// category's items can go. docs/collections-design.md §3a, §3b. The settings
// changes themselves are ./collections' rules.

import {
  collectionCategoryFields,
  convertCollectionFieldType,
  enabledCollectionCategories,
  moveCollectionCategory,
  replaceCollectionChoice,
  resolveCollectionCategory,
  setFieldOrder,
  updateCustomField,
  type ResolvedCollectionCategory,
} from "./collections";
import { UNCATEGORISED_COLLECTION } from "./constants/collections";
import type {
  CollectionFieldDef,
  CollectionFieldType,
  CollectionItem,
  CollectionLayout,
  CollectionSettings,
} from "./types/collection";

export const COLLECTION_FIELD_TYPE_LABELS: Record<CollectionFieldType, string> = {
  text: "Text", number: "Number", boolean: "Yes / no", choice: "Choice list",
};

export const COLLECTION_LAYOUT_CHOICES: { value: CollectionLayout; label: string }[] = [
  { value: "board", label: "Board" }, { value: "shelf", label: "Shelf" }, { value: "list", label: "List" },
];

// ==================== ORDER ====================

/** Move a switched-on category one place up (-1) or down (+1); unchanged at either end. */
export function moveCollectionCategoryBy(settings: CollectionSettings, id: string, delta: -1 | 1, now: number): CollectionSettings {
  const at = settings.enabled.indexOf(id);
  const to = at + delta;
  if (at < 0 || to < 0 || to >= settings.enabled.length) return settings;
  return moveCollectionCategory(settings, id, to, now);
}

/** Move a field one place up or down in its category's form (built-in and custom together). */
export function moveCollectionFieldBy(
  settings: CollectionSettings, categoryId: string, fieldId: string, delta: -1 | 1, now: number,
): CollectionSettings {
  const ids = collectionCategoryFields(settings, categoryId).map((e) => e.def.id);
  const at = ids.indexOf(fieldId);
  const to = at + delta;
  if (at < 0 || to < 0 || to >= ids.length) return settings;
  [ids[at], ids[to]] = [ids[to], ids[at]];
  return setFieldOrder(settings, categoryId, ids, now);
}

// ==================== CHOICES ====================

/** Choices in `before` that `after` no longer has (ignoring case and spaces). */
export function removedCollectionChoices(before: string[] | undefined, after: string[] | undefined): string[] {
  const kept = new Set((after ?? []).map((c) => c.trim().toLowerCase()));
  return (before ?? []).filter((c) => !kept.has(c.trim().toLowerCase()));
}

/** How many items hold each of `choices` for a field; only choices in use are listed. */
export function collectionChoiceUse(items: CollectionItem[], fieldId: string, choices: string[]): Record<string, number> {
  const use: Record<string, number> = {};
  for (const choice of choices) {
    const n = items.filter((i) => i.details?.[fieldId] === choice).length;
    if (n > 0) use[choice] = n;
  }
  return use;
}

/**
 * A renamed choice keeps its items: when the only change is one choice's
 * spelling at the same place, map old → new. Returns undefined otherwise.
 */
export function renamedCollectionChoice(before: string[] | undefined, after: string[] | undefined): { from: string; to: string } | undefined {
  const b = before ?? [];
  const a = after ?? [];
  if (a.length !== b.length) return undefined;
  const changed = b.map((c, i) => [c, a[i]] as const).filter(([x, y]) => x.trim() !== y.trim());
  return changed.length === 1 ? { from: changed[0][0], to: changed[0][1].trim() } : undefined;
}

/** What a choice field's new list does to items: a rename carries them along; otherwise the removed choices items still use, with counts. */
export interface CollectionChoiceChanges {
  renamed?: { from: string; to: string };
  inUse: Record<string, number>;
}

export function collectionChoiceChanges(items: CollectionItem[], field: CollectionFieldDef, after: string[]): CollectionChoiceChanges {
  const renamed = renamedCollectionChoice(field.choices, after);
  if (renamed) return { renamed, inUse: {} };
  return { inUse: collectionChoiceUse(items, field.id, removedCollectionChoices(field.choices, after)) };
}

/**
 * The items to change for a choice field's new list: a rename moves its
 * items to the new spelling; each removed choice in use moves to the
 * choice `decisions` names, or is cleared (blank) when it names none.
 */
export function collectionChoiceMoves(
  items: CollectionItem[], fieldId: string, changes: CollectionChoiceChanges,
  decisions: Record<string, string | undefined>, now: number,
): CollectionItem[] {
  if (changes.renamed) return replaceCollectionChoice(items, fieldId, changes.renamed.from, changes.renamed.to, now);
  return Object.keys(changes.inUse).flatMap((choice) => replaceCollectionChoice(items, fieldId, choice, decisions[choice], now));
}

/** The settings rule for saving an edited field: type change first (text ↔ choice), then name, choices and unit. */
export function collectionFieldEditRule(
  categoryId: string, field: CollectionFieldDef, next: CollectionFieldDef, items: CollectionItem[], now: number,
) {
  return (s: CollectionSettings): CollectionSettings => {
    const converted = next.type === field.type ? s
      : convertCollectionFieldType(s, categoryId, field.id, next.type, items, now, next.choices);
    return updateCustomField(converted, categoryId, field.id,
      { name: next.name, choices: next.type === "choice" ? next.choices : undefined, unit: next.unit }, now);
  };
}

// ==================== CATEGORIES ====================

/** Where a category's items can go when it's deleted: the others switched on, then Uncategorised. */
export function collectionMoveTargets(settings: CollectionSettings, deletingId: string): ResolvedCollectionCategory[] {
  const others = enabledCollectionCategories(settings).filter((c) => c.id !== deletingId);
  const uncategorised = resolveCollectionCategory(settings, UNCATEGORISED_COLLECTION.id)!;
  return [...others, uncategorised];
}

/** How many items a category holds (every state, gone included: they all move). */
export function collectionItemsInCategory(items: CollectionItem[], categoryId: string): number {
  return items.filter((i) => i.category === categoryId).length;
}
