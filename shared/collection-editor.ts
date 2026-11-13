// ==================== COLLECTION EDITOR (pure) ====================
// The collection item editor's form, in Pal (components/CollectionItemEditor.tsx)
// and the Planner (src/components/collection/CollectionItemModal.tsx): a draft
// made from an item or for a new one, what stops it saving, and the item it
// saves as. Photos aren't in the draft: each app keeps its own (Pal file
// paths, the Planner data URLs) and passes the photo sets in. No I/O; the
// clock and ids come from the caller. docs/collections-design.md §7.
//
// Saving keeps what the form doesn't show: values of hidden or deleted
// fields and of fields from the item's previous category stay in `details`,
// and parts of `acquired` the editor doesn't edit (trip, shops, park) stay as
// they were. A number that doesn't read as one stops the save rather than
// being dropped.

import { coerceCollectionValue } from "./collections";
import { normalizeCollectionCategory } from "./constants/collections";
import type { Priority } from "./types/common";
import type {
  CollectionAcquiredHow,
  CollectionFieldDef,
  CollectionFieldValue,
  CollectionGoneHow,
  CollectionItem,
  CollectionState,
} from "./types/collection";
import type { PhotoSet } from "./types/wish";
import { collectionOwnerOf } from "./collection-owners";

/** The form as typed, photos aside: text stays text until it's saved. */
export interface CollectionDraftFields {
  name: string;
  category: string;
  state: CollectionState;
  priority?: Priority;
  forSale: boolean;
  quantity: string;
  /** Field id → what's typed or picked (text for text, number and choice fields; true/false for yes/no). */
  details: Record<string, string | boolean>;
  tags: string;
  notes: string;
  externalUrl: string;
  acquiredDate?: string;
  acquiredHow?: CollectionAcquiredHow;
  pricePaid: string;
  goneDate?: string;
  goneHow?: CollectionGoneHow;
  goneNotes: string;
  /** Who owns it: a Trip User id or "shared" (shared/collection-owners.ts); unset keeps the item's owner, or a new item takes the creator. */
  owner?: string;
}

export const COLLECTION_ACQUIRED_HOW: { value: CollectionAcquiredHow; label: string }[] = [
  { value: "bought", label: "Bought" }, { value: "traded", label: "Traded" },
  { value: "gift", label: "Gift" }, { value: "found", label: "Found" },
];

export const COLLECTION_GONE_HOW: { value: CollectionGoneHow; label: string }[] = [
  { value: "traded", label: "Traded" }, { value: "sold", label: "Sold" }, { value: "gift", label: "Gave away" },
];

// ==================== DRAFTS ====================

function detailsDraft(details: CollectionItem["details"]): Record<string, string | boolean> {
  const out: Record<string, string | boolean> = {};
  for (const [id, v] of Object.entries(details ?? {})) out[id] = typeof v === "boolean" ? v : String(v);
  return out;
}

/** The form for an item, or a new one in `category` and `state` (never Gone), owned by `owner` when given. */
export function collectionDraftFromItem(
  item: CollectionItem | undefined, category: string, state: CollectionState, owner?: string,
): CollectionDraftFields {
  return {
    name: item?.name ?? "",
    category: item?.category ?? category,
    state: item?.state ?? (state === "gone" ? "have" : state),
    priority: item?.priority,
    forSale: !!item?.forSale,
    quantity: item?.quantity ? String(item.quantity) : "",
    details: detailsDraft(item?.details),
    tags: (item?.tags ?? []).join(", "),
    notes: item?.notes ?? "",
    externalUrl: item?.externalUrl ?? "",
    acquiredDate: item?.acquired?.date,
    acquiredHow: item?.acquired?.how,
    pricePaid: item?.acquired?.pricePaid ?? "",
    goneDate: item?.gone?.date,
    goneHow: item?.gone?.how,
    goneNotes: item?.gone?.notes ?? "",
    owner: item ? collectionOwnerOf(item) : owner,
  };
}

/** The states the editor offers: Gone only for an item that exists; Trade where the category trades (or it's a trader). */
export function collectionEditorStates(trades: boolean, current: CollectionState, isNew: boolean): CollectionState[] {
  const states: CollectionState[] = ["have", "want"];
  if (trades || current === "trade") states.push("trade");
  if (!isNew) states.push("gone");
  return states;
}

// ==================== CHECKS ====================

function quantityOf(text: string): number | undefined | null {
  const t = text.trim();
  if (!t) return undefined;
  const n = Number(t);
  return Number.isInteger(n) && n >= 1 ? n : null;
}

/** What stops the draft saving, or null. `fields` are the category's form fields. */
export function collectionDraftProblem(draft: CollectionDraftFields, fields: CollectionFieldDef[], hasPhotos: boolean): string | null {
  if (!draft.name.trim() && !hasPhotos) return "Add a name or a photo";
  if (!draft.category.trim()) return "Choose a category";
  for (const def of fields) {
    const raw = draft.details[def.id];
    if (def.type === "number" && typeof raw === "string" && raw.trim() && coerceCollectionValue(def, raw) === undefined) {
      return `${def.name} needs to be a number`;
    }
  }
  if (quantityOf(draft.quantity) === null) return "How many needs to be a whole number, 1 or more";
  return null;
}

// ==================== SAVING ====================

/** `existing` details with the form's fields set from the draft; fields the form doesn't show are kept. */
export function collectionDetailsFromDraft(
  existing: CollectionItem["details"], fields: CollectionFieldDef[], raw: CollectionDraftFields["details"],
): Record<string, CollectionFieldValue> | undefined {
  const out: Record<string, CollectionFieldValue> = { ...existing };
  for (const def of fields) {
    const value = coerceCollectionValue(def, raw[def.id]);
    if (value === undefined || value === false) delete out[def.id];
    else out[def.id] = value;
  }
  return Object.keys(out).length ? out : undefined;
}

function parseTags(text: string): string[] | undefined {
  const tags = [...new Set(text.split(",").map((t) => t.trim()).filter(Boolean))];
  return tags.length ? tags : undefined;
}

function acquiredFromDraft(draft: CollectionDraftFields, previous: CollectionItem["acquired"]): CollectionItem["acquired"] {
  const out = { ...previous };
  delete out.date; delete out.how; delete out.pricePaid;
  if (draft.acquiredDate) out.date = draft.acquiredDate;
  if (draft.acquiredHow) out.how = draft.acquiredHow;
  if (draft.pricePaid.trim()) out.pricePaid = draft.pricePaid.trim();
  return Object.keys(out).length ? out : undefined;
}

function goneFromDraft(draft: CollectionDraftFields): CollectionItem["gone"] {
  if (draft.state !== "gone") return undefined;
  const gone: NonNullable<CollectionItem["gone"]> = {};
  if (draft.goneDate) gone.date = draft.goneDate;
  if (draft.goneHow) gone.how = draft.goneHow;
  if (draft.goneNotes.trim()) gone.notes = draft.goneNotes.trim();
  return gone;
}

/** Drop keys whose value is undefined, so stored items stay tidy. */
function compact<T extends object>(obj: T): T {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as T;
}

/**
 * The item the draft saves as, with `photoSets` (none for no photos).
 * `base` is the item being edited (its other properties are kept), or
 * undefined for a new one with `id`. Throws if collectionDraftProblem would stop it.
 */
export function collectionItemFromDraft(
  draft: CollectionDraftFields, fields: CollectionFieldDef[], photoSets: PhotoSet[] | undefined,
  base: CollectionItem | undefined, id: string, userId: string | undefined, now: number,
): CollectionItem {
  const problem = collectionDraftProblem(draft, fields, !!photoSets?.length);
  if (problem) throw new Error(`[collection-editor] ${problem}`);
  return compact<CollectionItem>({
    ...base,
    id: base?.id ?? id,
    userId: draft.owner ?? base?.userId ?? userId,
    createdAt: base?.createdAt ?? now,
    updatedAt: now,
    name: draft.name.trim(),
    category: normalizeCollectionCategory(draft.category),
    state: draft.state,
    // The ticket picker shows A until another is picked, so a Want saves as A, as wishes do
    priority: draft.state === "want" ? draft.priority ?? "A" : undefined,
    forSale: draft.state === "trade" && draft.forSale ? true : undefined,
    quantity: quantityOf(draft.quantity) ?? undefined,
    photoSets: photoSets?.length ? photoSets : undefined,
    details: collectionDetailsFromDraft(base?.details, fields, draft.details),
    tags: parseTags(draft.tags),
    notes: draft.notes.trim() || undefined,
    externalUrl: draft.externalUrl.trim() || undefined,
    acquired: acquiredFromDraft(draft, base?.acquired),
    gone: goneFromDraft(draft),
  });
}
