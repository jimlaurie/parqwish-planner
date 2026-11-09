// ==================== COLLECTIONS (pure) ====================
// Rules for a collection's run-time categories and fields (design
// dland-wishes docs/collections-design.md §3a, §3b): which categories show
// and in what order, the user's own categories and fields, hiding built-in
// fields, changing a field's type, and matching fields on import. No I/O,
// no clock, no randomness: callers pass `now` and new ids. Every change
// returns a new CollectionSettings with updatedAt = now; nothing mutates.
// Used by Pal and the Planner (both repos' shared/ copies).
//
// Values are stored on items by field id, so a rename, a delete (hidden for
// 30 days, values kept), hiding a built-in field or moving an item to
// another category never erases a value.

import {
  BUILT_IN_COLLECTION_CATEGORIES,
  COLLECTION_FIELD_PREFIX,
  DELETED_FIELD_RESTORE_MS,
  MAX_CUSTOM_FIELDS_PER_CATEGORY,
  USER_COLLECTION_CATEGORY_PREFIX,
  getBuiltInCollectionCategory,
  isUserCollectionCategoryId,
} from "./constants/collections";
import type {
  CollectionFieldDef,
  CollectionFieldType,
  CollectionFieldValue,
  CollectionItem,
  CollectionLayout,
  CollectionSettings,
  UserCollectionCategory,
} from "./types/collection";

/** A category as the screens show it: built-in defaults merged with the user's choices. */
export interface ResolvedCollectionCategory {
  id: string;
  name: string;
  icon: string;
  layout: CollectionLayout;
  trades: boolean;
  builtIn: boolean;
  enabled: boolean;
}

/** A field in a category's settings list, with where it came from. */
export interface CollectionFieldEntry {
  def: CollectionFieldDef;
  builtIn: boolean;
  /** A built-in field the user switched off. */
  hidden: boolean;
}

const DEFAULT_USER_ICON = "⭐";

// ==================== SETTINGS ====================

export function emptyCollectionSettings(now: number): CollectionSettings {
  return { enabled: [], userCategories: [], firstRunDone: false, createdAt: now, updatedAt: now };
}

/** Collections show anywhere only once a category is switched on. */
export function isCollectionsOn(settings: CollectionSettings | null | undefined): boolean {
  return !!settings && enabledCollectionCategories(settings).length > 0;
}

function touch(settings: CollectionSettings, now: number, patch: Partial<CollectionSettings>): CollectionSettings {
  return { ...settings, ...patch, updatedAt: now };
}

function liveUserCategory(settings: CollectionSettings, id: string): UserCollectionCategory | undefined {
  return settings.userCategories.find((c) => c.id === id && !c.deletedAt);
}

// ==================== CATEGORIES ====================

/** A category by id with the user's overrides, or undefined if unknown or deleted. */
export function resolveCollectionCategory(settings: CollectionSettings, id: string): ResolvedCollectionCategory | undefined {
  const enabled = settings.enabled.includes(id);
  const builtIn = getBuiltInCollectionCategory(id);
  if (builtIn) {
    const o = settings.builtInOverrides?.[id] ?? {};
    return { id, name: builtIn.name, icon: builtIn.icon, layout: o.layout ?? builtIn.layout,
      trades: o.trades ?? builtIn.trades, builtIn: true, enabled };
  }
  const user = liveUserCategory(settings, id);
  if (!user) return undefined;
  return { id, name: user.name, icon: user.icon || DEFAULT_USER_ICON, layout: user.layout,
    trades: user.trades, builtIn: false, enabled };
}

/** The categories switched on, in the user's order: the chips, filters and add-item picker. */
export function enabledCollectionCategories(settings: CollectionSettings): ResolvedCollectionCategory[] {
  return settings.enabled
    .map((id) => resolveCollectionCategory(settings, id))
    .filter((c): c is ResolvedCollectionCategory => !!c);
}

/** Every category for the settings list and first-visit picker: those on (in order), then built-ins, then the user's. */
export function allCollectionCategories(settings: CollectionSettings): ResolvedCollectionCategory[] {
  const on = enabledCollectionCategories(settings);
  const seen = new Set(on.map((c) => c.id));
  const rest = [
    ...BUILT_IN_COLLECTION_CATEGORIES.map((c) => c.id),
    ...settings.userCategories.filter((c) => !c.deletedAt).map((c) => c.id),
  ].filter((id) => !seen.has(id));
  return [...on, ...rest.map((id) => resolveCollectionCategory(settings, id)!)];
}

export function setCollectionCategoryEnabled(settings: CollectionSettings, id: string, on: boolean, now: number): CollectionSettings {
  if (!resolveCollectionCategory(settings, id)) throw new Error(`[collections] unknown category ${id}`);
  const without = settings.enabled.filter((e) => e !== id);
  return touch(settings, now, { enabled: on ? [...without, id] : without });
}

/** Move a switched-on category to a new place in the order. */
export function moveCollectionCategory(settings: CollectionSettings, id: string, toIndex: number, now: number): CollectionSettings {
  const from = settings.enabled.indexOf(id);
  if (from < 0) throw new Error(`[collections] ${id} isn't switched on`);
  const order = settings.enabled.filter((e) => e !== id);
  const at = Math.max(0, Math.min(toIndex, order.length));
  order.splice(at, 0, id);
  return touch(settings, now, { enabled: order });
}

export function newUserCollectionCategoryId(random: () => number = Math.random): string {
  return USER_COLLECTION_CATEGORY_PREFIX + random().toString(36).slice(2, 10);
}

/** Add the user's own category, switched on at the end. */
export function addUserCollectionCategory(
  settings: CollectionSettings,
  category: Omit<UserCollectionCategory, "deletedAt">,
  now: number,
): CollectionSettings {
  if (!isUserCollectionCategoryId(category.id)) throw new Error(`[collections] user category id must start ${USER_COLLECTION_CATEGORY_PREFIX}`);
  if (!category.name.trim()) throw new Error("[collections] a category needs a name");
  if (settings.userCategories.some((c) => c.id === category.id)) throw new Error(`[collections] ${category.id} already exists`);
  const added = { ...category, name: category.name.trim() };
  return touch(settings, now, {
    userCategories: [...settings.userCategories, added],
    enabled: [...settings.enabled, category.id],
  });
}

/** Change a category's layout or "I trade these"; a user category's name and icon too. */
export function updateCollectionCategory(
  settings: CollectionSettings,
  id: string,
  changes: { layout?: CollectionLayout; trades?: boolean; name?: string; icon?: string },
  now: number,
): CollectionSettings {
  if (getBuiltInCollectionCategory(id)) {
    const current = settings.builtInOverrides?.[id] ?? {};
    const next = { ...current, ...pick(changes, ["layout", "trades"]) };
    return touch(settings, now, { builtInOverrides: { ...settings.builtInOverrides, [id]: next } });
  }
  if (!liveUserCategory(settings, id)) throw new Error(`[collections] unknown category ${id}`);
  if (changes.name !== undefined && !changes.name.trim()) throw new Error("[collections] a category needs a name");
  const userCategories = settings.userCategories.map((c) =>
    c.id === id ? { ...c, ...changes, name: (changes.name ?? c.name).trim() } : c);
  return touch(settings, now, { userCategories });
}

function pick<T extends object, K extends keyof T>(obj: T, keys: K[]): Partial<T> {
  const out: Partial<T> = {};
  for (const k of keys) if (obj[k] !== undefined) out[k] = obj[k];
  return out;
}

/**
 * Delete a user category. Move its items first (moveCollectionItemsToCategory): the
 * caller asks where they go. It's marked deleted, not removed, so Cloud
 * Sync carries the delete to the other app.
 */
export function deleteUserCollectionCategory(settings: CollectionSettings, id: string, now: number): CollectionSettings {
  if (!liveUserCategory(settings, id)) throw new Error(`[collections] unknown user category ${id}`);
  return touch(settings, now, {
    enabled: settings.enabled.filter((e) => e !== id),
    userCategories: settings.userCategories.map((c) => (c.id === id ? { ...c, deletedAt: now } : c)),
  });
}

/** Items moved to another category (only the ones that change). Their details stay as they are. */
export function moveCollectionItemsToCategory(items: CollectionItem[], fromId: string, toId: string, now: number): CollectionItem[] {
  return items.filter((i) => i.category === fromId).map((i) => ({ ...i, category: toId, updatedAt: now }));
}

// ==================== FIELDS: READING ====================

function customFields(settings: CollectionSettings, categoryId: string): CollectionFieldDef[] {
  return settings.customFields?.[categoryId] ?? [];
}

/** The user's fields on a category that aren't deleted. */
export function liveCustomFields(settings: CollectionSettings, categoryId: string): CollectionFieldDef[] {
  return customFields(settings, categoryId).filter((f) => !f.deletedAt);
}

/**
 * Every field a category has, in form order: built-in (hidden ones
 * included, flagged) and the user's live ones. Fields in fieldOrder come
 * first in that order; the rest follow, built-in before custom.
 */
export function collectionCategoryFields(settings: CollectionSettings, categoryId: string): CollectionFieldEntry[] {
  const hidden = new Set(settings.hiddenBuiltInFields?.[categoryId] ?? []);
  const builtIn = getBuiltInCollectionCategory(categoryId)?.fields ?? [];
  const entries: CollectionFieldEntry[] = [
    ...builtIn.map((def) => ({ def, builtIn: true, hidden: hidden.has(def.id) })),
    ...liveCustomFields(settings, categoryId).map((def) => ({ def, builtIn: false, hidden: false })),
  ];
  const order = settings.fieldOrder?.[categoryId] ?? [];
  const rank = (id: string) => { const i = order.indexOf(id); return i < 0 ? order.length : i; };
  return entries
    .map((e, i) => ({ e, i }))
    .sort((a, b) => rank(a.e.def.id) - rank(b.e.def.id) || a.i - b.i)
    .map(({ e }) => e);
}

/** The fields the item editor shows for a category, in order. */
export function collectionFormFields(settings: CollectionSettings, categoryId: string): CollectionFieldDef[] {
  return collectionCategoryFields(settings, categoryId).filter((e) => !e.hidden).map((e) => e.def);
}

export function canAddCustomField(settings: CollectionSettings, categoryId: string): boolean {
  return liveCustomFields(settings, categoryId).length < MAX_CUSTOM_FIELDS_PER_CATEGORY;
}

/** Deleted fields that can still be restored, newest first. */
export function recentlyDeletedCollectionFields(settings: CollectionSettings, categoryId: string, now: number): CollectionFieldDef[] {
  return customFields(settings, categoryId)
    .filter((f) => f.deletedAt !== undefined && now - f.deletedAt < DELETED_FIELD_RESTORE_MS)
    .sort((a, b) => b.deletedAt! - a.deletedAt!);
}

// ==================== FIELDS: CHANGING ====================

export function newCollectionFieldId(random: () => number = Math.random): string {
  return COLLECTION_FIELD_PREFIX + random().toString(36).slice(2, 10);
}

/** What's wrong with a field definition the user typed, or null if it's fine. */
export function collectionFieldProblem(def: Pick<CollectionFieldDef, "name" | "type" | "choices">): string | null {
  if (!def.name.trim()) return "Give the field a name";
  if (def.type !== "choice") return null;
  const choices = cleanCollectionChoices(def.choices);
  if (choices.length < 2) return "A choice list needs at least two choices";
  return null;
}

/** Trimmed, non-blank, without repeats (ignoring case), in the order typed. */
export function cleanCollectionChoices(choices: readonly string[] | undefined): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of choices ?? []) {
    const c = raw.trim();
    if (c && !seen.has(c.toLowerCase())) { seen.add(c.toLowerCase()); out.push(c); }
  }
  return out;
}

function withCustomFields(settings: CollectionSettings, categoryId: string, fields: CollectionFieldDef[], now: number): CollectionSettings {
  return touch(settings, now, { customFields: { ...settings.customFields, [categoryId]: fields } });
}

function requireCustomField(settings: CollectionSettings, categoryId: string, fieldId: string): CollectionFieldDef {
  const field = customFields(settings, categoryId).find((f) => f.id === fieldId);
  if (!field) throw new Error(`[collections] no field ${fieldId} on ${categoryId}`);
  return field;
}

function tidyDef(def: CollectionFieldDef): CollectionFieldDef {
  const out: CollectionFieldDef = { id: def.id, name: def.name.trim(), type: def.type };
  if (def.type === "choice") out.choices = cleanCollectionChoices(def.choices);
  if (def.type === "number" && def.unit?.trim()) out.unit = def.unit.trim();
  if (def.deletedAt !== undefined) out.deletedAt = def.deletedAt;
  return out;
}

/** Add the user's own field to a category (built-in or user), at the end of its form. */
export function addCustomField(settings: CollectionSettings, categoryId: string, def: CollectionFieldDef, now: number): CollectionSettings {
  if (!resolveCollectionCategory(settings, categoryId)) throw new Error(`[collections] unknown category ${categoryId}`);
  const problem = collectionFieldProblem(def);
  if (problem) throw new Error(`[collections] ${problem}`);
  if (!canAddCustomField(settings, categoryId)) throw new Error(`[collections] at most ${MAX_CUSTOM_FIELDS_PER_CATEGORY} fields`);
  const taken = collectionCategoryFields(settings, categoryId).some((e) => e.def.id === def.id)
    || customFields(settings, categoryId).some((f) => f.id === def.id);
  if (taken) throw new Error(`[collections] field id ${def.id} is taken`);
  const added = tidyDef({ ...def, deletedAt: undefined });
  return withCustomFields(settings, categoryId, [...customFields(settings, categoryId), added], now);
}

/** Rename a custom field, or change its choices or unit. Type changes go through convertCollectionFieldType. */
export function updateCustomField(
  settings: CollectionSettings,
  categoryId: string,
  fieldId: string,
  changes: { name?: string; choices?: string[]; unit?: string },
  now: number,
): CollectionSettings {
  const next = { ...requireCustomField(settings, categoryId, fieldId), ...changes };
  const problem = collectionFieldProblem(next);
  if (problem) throw new Error(`[collections] ${problem}`);
  const fields = customFields(settings, categoryId).map((f) => (f.id === fieldId ? tidyDef(next) : f));
  return withCustomFields(settings, categoryId, fields, now);
}

/** Delete a custom field: hidden, values kept on items, restorable for 30 days. */
export function deleteCustomField(settings: CollectionSettings, categoryId: string, fieldId: string, now: number): CollectionSettings {
  requireCustomField(settings, categoryId, fieldId);
  const fields = customFields(settings, categoryId).map((f) => (f.id === fieldId ? { ...f, deletedAt: now } : f));
  return withCustomFields(settings, categoryId, fields, now);
}

/** Bring back a deleted field and its values, if there's room. */
export function restoreCustomField(settings: CollectionSettings, categoryId: string, fieldId: string, now: number): CollectionSettings {
  const field = requireCustomField(settings, categoryId, fieldId);
  if (field.deletedAt === undefined) return settings;
  if (!canAddCustomField(settings, categoryId)) throw new Error(`[collections] at most ${MAX_CUSTOM_FIELDS_PER_CATEGORY} fields`);
  const fields = customFields(settings, categoryId).map((f) => (f.id === fieldId ? tidyDef({ ...f, deletedAt: undefined }) : f));
  return withCustomFields(settings, categoryId, fields, now);
}

/** Switch a built-in field off (or back on) for this account. */
export function setBuiltInFieldHidden(
  settings: CollectionSettings, categoryId: string, fieldId: string, hidden: boolean, now: number,
): CollectionSettings {
  const builtIn = getBuiltInCollectionCategory(categoryId)?.fields ?? [];
  if (!builtIn.some((f) => f.id === fieldId)) throw new Error(`[collections] ${fieldId} isn't a built-in field of ${categoryId}`);
  const without = (settings.hiddenBuiltInFields?.[categoryId] ?? []).filter((id) => id !== fieldId);
  const list = hidden ? [...without, fieldId] : without;
  return touch(settings, now, { hiddenBuiltInFields: { ...settings.hiddenBuiltInFields, [categoryId]: list } });
}

/** Set a category's form order (built-in and custom field ids). */
export function setFieldOrder(settings: CollectionSettings, categoryId: string, fieldIds: string[], now: number): CollectionSettings {
  return touch(settings, now, { fieldOrder: { ...settings.fieldOrder, [categoryId]: [...new Set(fieldIds)] } });
}

// ==================== FIELD TYPES ====================

/** Only text ↔ choice converts; to or from number or yes/no, add a new field instead. */
export function canConvertCollectionFieldType(from: CollectionFieldType, to: CollectionFieldType): boolean {
  return (from === "text" && to === "choice") || (from === "choice" && to === "text");
}

/** The distinct texts items hold for a field, in first-seen order: a text field's choices when it becomes a list. */
export function collectionChoicesFromValues(items: CollectionItem[], fieldId: string): string[] {
  const values = items
    .map((i) => i.details?.[fieldId])
    .filter((v): v is string => typeof v === "string");
  return cleanCollectionChoices(values);
}

/**
 * Change a custom field between text and choice. Text → choice takes its
 * choices from the values items hold (plus any `extraChoices`); choice →
 * text keeps every value as it is. Items don't change either way.
 */
export function convertCollectionFieldType(
  settings: CollectionSettings,
  categoryId: string,
  fieldId: string,
  to: CollectionFieldType,
  items: CollectionItem[],
  now: number,
  extraChoices: string[] = [],
): CollectionSettings {
  const field = requireCustomField(settings, categoryId, fieldId);
  if (field.type === to) return settings;
  if (!canConvertCollectionFieldType(field.type, to)) throw new Error(`[collections] can't change ${field.type} to ${to}`);
  const choices = to === "choice" ? cleanCollectionChoices([...collectionChoicesFromValues(items, fieldId), ...extraChoices]) : undefined;
  if (choices && choices.length < 2) throw new Error("[collections] A choice list needs at least two choices");
  const next = tidyDef({ ...field, type: to, choices });
  const fields = customFields(settings, categoryId).map((f) => (f.id === fieldId ? next : f));
  return withCustomFields(settings, categoryId, fields, now);
}

/**
 * Items whose value for a choice field was `from`, set to `to` (another
 * choice) or cleared (undefined): before removing a choice items use.
 * Returns only the items that change.
 */
export function replaceCollectionChoice(
  items: CollectionItem[], fieldId: string, from: string, to: string | undefined, now: number,
): CollectionItem[] {
  return items
    .filter((i) => i.details?.[fieldId] === from)
    .map((i) => {
      const details = { ...i.details };
      if (to === undefined) delete details[fieldId];
      else details[fieldId] = to;
      return { ...i, details, updatedAt: now };
    });
}

// ==================== VALUES ====================

/**
 * A value typed or imported for a field, as the field stores it, or
 * undefined when it doesn't fit (blank, not a number, not one of the
 * choices). A choice matches ignoring case and is stored as spelled in
 * the list.
 */
export function coerceCollectionValue(def: CollectionFieldDef, raw: unknown): CollectionFieldValue | undefined {
  if (raw === null || raw === undefined) return undefined;
  if (def.type === "boolean") return coerceBoolean(raw);
  const text = typeof raw === "string" ? raw.trim() : typeof raw === "number" ? String(raw) : "";
  if (!text) return undefined;
  if (def.type === "number") {
    const n = Number(text.replace(/,/g, ""));
    return Number.isFinite(n) ? n : undefined;
  }
  if (def.type === "choice") return (def.choices ?? []).find((c) => c.toLowerCase() === text.toLowerCase());
  return text;
}

function coerceBoolean(raw: unknown): boolean | undefined {
  if (typeof raw === "boolean") return raw;
  const text = String(raw).trim().toLowerCase();
  if (["true", "yes", "y", "1"].includes(text)) return true;
  if (["false", "no", "n", "0"].includes(text)) return false;
  return undefined;
}

// ==================== IMPORT ====================

function sameName(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

/**
 * The local field an incoming one is: same id and type (a deleted field
 * included, as its values are still on items), else a live field with the
 * same name and type. Same id but another type isn't a match: its values
 * wouldn't fit, so it's imported as a new field.
 */
function matchLocalField(settings: CollectionSettings, categoryId: string, incoming: CollectionFieldDef): CollectionFieldDef | undefined {
  const builtIn = getBuiltInCollectionCategory(categoryId)?.fields ?? [];
  const all = [...builtIn, ...customFields(settings, categoryId)];
  const byId = all.find((f) => f.id === incoming.id);
  if (byId) return byId.type === incoming.type ? byId : undefined;
  const live = [...builtIn, ...liveCustomFields(settings, categoryId)];
  return live.find((f) => f.type === incoming.type && sameName(f.name, incoming.name));
}

/**
 * Fold a file's (or another account's) field definitions for a category
 * into these settings, so no imported value is dropped. Each incoming field
 * maps to a local one by id (same type), then by name and type; a custom choice field
 * gains any choices it lacks. Fields not recognised are added as custom
 * fields, keeping their id unless it's taken here; past the 12-field limit
 * they're added deleted (values kept, restorable). Returns the new
 * settings and incoming id → local id, for remapCollectionDetails.
 */
export function mergeImportedCollectionFields(
  settings: CollectionSettings,
  categoryId: string,
  incoming: CollectionFieldDef[],
  now: number,
  newId: () => string = newCollectionFieldId,
): { settings: CollectionSettings; mapping: Record<string, string> } {
  let next = settings;
  const mapping: Record<string, string> = {};
  for (const field of incoming) {
    const local = matchLocalField(next, categoryId, field);
    if (local) {
      mapping[field.id] = local.id;
      next = addMissingChoices(next, categoryId, local, field.choices, now);
    } else {
      const added = importAsCustomField(next, categoryId, field, now, newId);
      mapping[field.id] = added.id;
      next = added.settings;
    }
  }
  return { settings: next, mapping };
}

function addMissingChoices(
  settings: CollectionSettings, categoryId: string, local: CollectionFieldDef, extra: string[] | undefined, now: number,
): CollectionSettings {
  const isCustom = customFields(settings, categoryId).some((f) => f.id === local.id);
  if (!isCustom || local.type !== "choice" || !extra?.length) return settings;
  const choices = cleanCollectionChoices([...(local.choices ?? []), ...extra]);
  if (choices.length === (local.choices ?? []).length) return settings;
  const fields = customFields(settings, categoryId).map((f) => (f.id === local.id ? { ...f, choices } : f));
  return withCustomFields(settings, categoryId, fields, now);
}

function importAsCustomField(
  settings: CollectionSettings, categoryId: string, field: CollectionFieldDef, now: number, newId: () => string,
): { settings: CollectionSettings; id: string } {
  const taken = collectionCategoryFields(settings, categoryId).some((e) => e.def.id === field.id)
    || customFields(settings, categoryId).some((f) => f.id === field.id);
  const id = taken ? newId() : field.id;
  const name = field.name.trim() || "Imported field";
  const full = !canAddCustomField(settings, categoryId);
  const def = tidyDef({ ...field, id, name, deletedAt: full ? now : field.deletedAt });
  const usable = def.type === "choice" && (def.choices ?? []).length < 2 ? { ...def, type: "text" as const, choices: undefined } : def;
  return { settings: withCustomFields(settings, categoryId, [...customFields(settings, categoryId), tidyDef(usable)], now), id };
}

/** An imported item's details with field ids translated by mergeImportedCollectionFields' mapping; unmapped ids are kept. */
export function remapCollectionDetails(
  details: Record<string, CollectionFieldValue> | undefined, mapping: Record<string, string>,
): Record<string, CollectionFieldValue> | undefined {
  if (!details) return details;
  const out: Record<string, CollectionFieldValue> = {};
  for (const [id, value] of Object.entries(details)) out[mapping[id] ?? id] = value;
  return out;
}

// ==================== FIRST VISIT ====================

/**
 * Save the category picker's choice (the first visit, or "Edit" later):
 * `chosen` is every category id ticked, in the order ticked, including the
 * user categories in `added`, which are created here. Categories already on
 * keep their place; newly ticked ones follow in `chosen`'s order; unticked
 * ones are switched off (nothing deleted). Marks the first visit done, so
 * picking none is fine.
 */
export function applyCollectionCategoryChoice(
  settings: CollectionSettings,
  chosen: string[],
  added: Omit<UserCollectionCategory, "deletedAt">[],
  now: number,
): CollectionSettings {
  const withAdded = added.reduce((s, cat) => addUserCollectionCategory(s, cat, now), settings);
  const wanted = [...new Set(chosen)];
  const unknown = wanted.filter((id) => !resolveCollectionCategory(withAdded, id));
  if (unknown.length) throw new Error(`[collections] unknown categories ${unknown.join(", ")}`);
  const kept = settings.enabled.filter((id) => wanted.includes(id));
  const fresh = wanted.filter((id) => !kept.includes(id));
  return touch(withAdded, now, { enabled: [...kept, ...fresh], firstRunDone: true });
}

/** "Not now" on the first-visit picker: don't show it by itself again. */
export function finishCollectionFirstRun(settings: CollectionSettings, now: number): CollectionSettings {
  return settings.firstRunDone ? settings : touch(settings, now, { firstRunDone: true });
}
