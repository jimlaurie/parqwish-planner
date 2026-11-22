// ==================== COLLECTION TYPES ====================
// A personal memorabilia collection (pins, popcorn buckets, ears…): opt-in,
// per account, separate from shopping and packing items. Design:
// dland-wishes docs/collections-design.md (§5 is this file's spec).
// Built-in categories and their fields: shared/constants/collections.ts.
// Pure rules on settings and fields: shared/collections.ts.

import type { Priority, Timestamped } from "./common";
import type { PhotoSet } from "./wish";

/**
 * Where an item stands:
 * - want: looking for it (ISO); `priority` A–E, E = grail
 * - have: in the collection (a Keeper)
 * - trade: have it and will trade it (a Trader; `forSale` = will also sell)
 * - gone: traded, sold or given away, kept as history
 */
export type CollectionState = "want" | "have" | "trade" | "gone";

/** How a category's items are laid out: a dense grid, larger cards, or a dated list. */
export type CollectionLayout = "board" | "shelf" | "list";

/** The four field types a category's details can have (design §3b). */
export type CollectionFieldType = "text" | "number" | "boolean" | "choice";

/** A detail value, stored on the item under its field's id. */
export type CollectionFieldValue = string | number | boolean;

/** How an item arrived. */
export type CollectionAcquiredHow = "bought" | "traded" | "gift" | "found";

/** How an item left (state "gone"). */
export type CollectionGoneHow = "traded" | "sold" | "gift";

export interface CollectionItem extends Timestamped {
  id: string;
  /** A built-in category id ("pins"), a user one ("user_…"), or "uncategorised". */
  category: string;
  name: string;
  state: CollectionState;
  /** With state "trade": also willing to sell. */
  forSale?: boolean;
  /** Pin traders often hold duplicates. */
  quantity?: number;
  /** For wants: A–E tickets, E = grail. */
  priority?: Priority;
  photoSets?: PhotoSet[];
  notes?: string;
  /** Series, sets, events: free labels, most useful for user categories. */
  tags?: string[];
  /**
   * Field id → value, built-in (edition, series…) and custom. Values of
   * deleted or hidden fields, or of fields the item's previous category
   * had, stay here unseen, so nothing is lost by a delete or a move.
   */
  details?: Record<string, CollectionFieldValue>;
  acquired?: {
    date?: string;               // YYYY-MM-DD
    how?: CollectionAcquiredHow;
    pricePaid?: string;
    tripId?: string;
    resortId?: string;           // registry id (shared/data/resorts.json)
    park?: string;
    land?: string;
    shopIds?: string[];          // shops.json ids, as shopping items
  };
  gone?: { date?: string; how?: CollectionGoneHow; notes?: string };
  /** e.g. the pin's page on a pin database. */
  externalUrl?: string;
  /** Made from a bought shopping item. */
  sourceShoppingItemId?: string;
  /**
   * For a Want: where to look for it (docs/collections-design.md §14), so a
   * Want on a day shows on that day's map. shopIds are shops.json ids, as
   * shopping items; park and land are for a place that isn't a shop.
   * Kept when the item becomes Have or Gone, as history.
   */
  lookIn?: { shopIds?: string[]; park?: string; land?: string };
  /** Unused: "Hunt for this" became + Day (16 Nov 2026). Nothing writes it. */
  huntShoppingItemIds?: string[];
  /** Park days (YYYY-MM-DD) a Want is looked for or a Trade brought on (+ Day; shared/collection-days.ts). */
  days?: string[];
  /** Day → the Got it / Traded it tick made on Home for that day, so unticking can undo it. */
  dayTicks?: Record<string, CollectionDayTick>;
  /** Owner (Trip User), as catalog items. */
  userId?: string;
}

/** The parts of an item a day's tick changes. */
export interface CollectionDayTickParts {
  state: CollectionState;
  quantity?: number;
  acquired?: CollectionItem["acquired"];
  gone?: CollectionItem["gone"];
}

/** A Got it (Want) or Traded it (Trade) tick on a day: what it changed, so unticking can put it back. */
export interface CollectionDayTick {
  /** What the item was on the day's list for. */
  from: "want" | "trade";
  /** How it arrived (a Want) or left (a Trade). */
  how: CollectionAcquiredHow | CollectionGoneHow;
  /** When it was ticked (epoch ms). */
  at: number;
  /** The parts as they were before the tick. */
  before: CollectionDayTickParts;
  /** The parts as the tick wrote them. Unticking restores a part only while it still reads this. */
  after: CollectionDayTickParts;
}

/** A field a category's items can fill in. Built-in fields (shared/constants) use this shape too. */
export interface CollectionFieldDef {
  /** Values are stored under this id, so a rename keeps them. User fields: "field_" + random. */
  id: string;
  name: string;
  type: CollectionFieldType;
  /** For "choice". */
  choices?: string[];
  /** For "number", e.g. "cm" or "$". */
  unit?: string;
  /** User fields only: when it was deleted (hidden, values kept; restorable for 30 days). Epoch ms. */
  deletedAt?: number;
}

/** A category the user made. Built-in ones are in shared/constants/collections.ts. */
export interface UserCollectionCategory {
  /** "user_" + random; never collides with a built-in id. */
  id: string;
  name: string;
  /** An emoji. */
  icon?: string;
  layout: CollectionLayout;
  /** "I trade these": Trade state and trade tools for this category. */
  trades: boolean;
  /** When it was deleted, after its items were moved. Kept so sync carries the delete. Epoch ms. */
  deletedAt?: number;
}

/** One per account, synced like the wish catalog. */
export interface CollectionSettings extends Timestamped {
  /** Category ids switched on (built-in or user), in display order. */
  enabled: string[];
  /** A built-in category's layout or "I trade these", when the user changed it. */
  builtInOverrides?: Record<string, { layout?: CollectionLayout; trades?: boolean }>;
  userCategories: UserCollectionCategory[];
  /** Category id → the user's own fields (at most 12 not deleted). */
  customFields?: Record<string, CollectionFieldDef[]>;
  /** Category id → field ids, built-in and custom, in form order. */
  fieldOrder?: Record<string, string[]>;
  /** Category id → built-in field ids switched off. */
  hiddenBuiltInFields?: Record<string, string[]>;
  /** The first-visit category picker has been shown. */
  firstRunDone: boolean;
  /**
   * When each part last changed here (epoch ms), so two devices' changes to
   * different categories both survive a sync (shared/collection-settings-merge.ts):
   * "on:{id}", "override:{id}", "usercat:{id}", "fields:{id}", "order", "firstRun".
   * Missing parts fall back to updatedAt.
   */
  stamps?: Record<string, number>;
}
