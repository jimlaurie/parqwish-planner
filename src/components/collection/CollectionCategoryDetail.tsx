"use client";

// ==================== COLLECTION CATEGORY DETAIL ====================
// One category's settings, in the Categories dialog (dland-wishes
// docs/collections-design.md §3a, §3b): a user category's name and icon;
// the layout and "I trade these" for any; its fields in form order (▲▼,
// built-in ones shown or hidden, the user's own opened in CollectionFieldPanel),
// "+ Add a field" up to 12, recently deleted fields to restore for 30 days;
// and Delete for a user category, which asks where its items go first.
// Every change saves at once; name and icon when the box loses focus.

import { useState } from "react";
import { ACCENT, Chips, INPUT_CLASS, INPUT_STYLE, Label } from "./CollectionFormParts";
import { saveCollectionItems, updateCollectionSettings } from "@/lib/collection-store";
import type { CollectionItem, CollectionSettings } from "@/lib/db";
import {
  canAddCustomField, collectionCategoryFields, deleteUserCollectionCategory, moveCollectionItemsToCategory,
  recentlyDeletedCollectionFields, resolveCollectionCategory, restoreCustomField, setBuiltInFieldHidden,
  updateCollectionCategory, type CollectionFieldEntry,
} from "@shared/collections";
import {
  COLLECTION_FIELD_TYPE_LABELS, COLLECTION_LAYOUT_CHOICES, collectionItemsInCategory, collectionMoveTargets, moveCollectionFieldBy,
} from "@shared/collection-categories";
import { MAX_CUSTOM_FIELDS_PER_CATEGORY } from "@shared/constants/collections";
import type { CollectionFieldDef, CollectionSettings as Settings } from "@shared/types/collection";

interface Props {
  settings: CollectionSettings;
  categoryId: string;
  items: CollectionItem[];
  onEditField: (field?: CollectionFieldDef) => void;
  onDeleted: () => void;
}

/** Save one settings rule; a failure is shown in `onError`. */
function change(rule: (s: Settings) => Settings, onError: (m: string) => void) {
  updateCollectionSettings(rule).catch((e) => {
    console.error("[CollectionCategoryDetail] saving failed:", e);
    onError(e instanceof Error ? e.message.replace("[collections] ", "") : "Please try again.");
  });
}

export default function CollectionCategoryDetail({ settings, categoryId, items, onEditField, onDeleted }: Props) {
  const category = resolveCollectionCategory(settings, categoryId);
  const [problem, setProblem] = useState("");
  if (!category) return null;
  const save = (rule: (s: Settings) => Settings) => { setProblem(""); change(rule, setProblem); };
  const now = () => Date.now();

  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-lg font-bold" style={{ color: ACCENT }}><span aria-hidden="true">{category.icon}</span> {category.name}</h3>
      {!category.builtIn && (
        <NameAndIcon key={categoryId} name={category.name} icon={category.icon}
          onSave={(name, icon) => save((s) => updateCollectionCategory(s, categoryId, { name, icon: icon || undefined }, now()))} />
      )}
      <div><Label>Layout</Label>
        <Chips label="Layout" clearable={false} value={category.layout} options={COLLECTION_LAYOUT_CHOICES}
          onChange={(v) => v && save((s) => updateCollectionCategory(s, categoryId, { layout: v }, now()))} /></div>
      <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: "var(--color-text-primary)" }}>
        <input type="checkbox" checked={category.trades} className="w-4 h-4" style={{ accentColor: ACCENT }}
          onChange={(e) => save((s) => updateCollectionCategory(s, categoryId, { trades: e.target.checked }, now()))} />
        I trade these
      </label>
      <FieldList settings={settings} categoryId={categoryId} onEditField={onEditField} save={save} />
      {problem && <p role="alert" className="text-sm" style={{ color: "var(--color-error)" }}>{problem}</p>}
      {!category.builtIn && <DeleteCategory settings={settings} categoryId={categoryId} name={category.name} items={items} onDeleted={onDeleted} onError={setProblem} />}
    </div>
  );
}

// ==================== PIECES ====================

function NameAndIcon({ name, icon, onSave }: { name: string; icon: string; onSave: (name: string, icon: string) => void }) {
  const [n, setN] = useState(name);
  const [i, setI] = useState(icon === "⭐" ? "" : icon);
  const commit = () => { if (n.trim() && (n.trim() !== name || (i.trim() || "⭐") !== icon)) onSave(n.trim(), i.trim()); };
  return (
    <div className="flex gap-2">
      <div className="w-20"><Label htmlFor="collection-category-icon">Icon</Label>
        <input id="collection-category-icon" value={i} onChange={(e) => setI(e.target.value)} onBlur={commit} placeholder="⭐" maxLength={8}
          className={`${INPUT_CLASS} text-center`} style={INPUT_STYLE} /></div>
      <div className="flex-1"><Label htmlFor="collection-category-name">Name</Label>
        <input id="collection-category-name" value={n} onChange={(e) => setN(e.target.value)} onBlur={commit}
          onKeyDown={(e) => { if (e.key === "Enter") commit(); }} className={INPUT_CLASS} style={INPUT_STYLE} /></div>
    </div>
  );
}

function FieldList({ settings, categoryId, onEditField, save }: {
  settings: CollectionSettings; categoryId: string; onEditField: (field?: CollectionFieldDef) => void;
  save: (rule: (s: Settings) => Settings) => void;
}) {
  const entries = collectionCategoryFields(settings, categoryId);
  const deleted = recentlyDeletedCollectionFields(settings, categoryId, Date.now());
  const room = canAddCustomField(settings, categoryId);
  return (
    <div className="pt-3" style={{ borderTop: "1px solid var(--color-border-subtle)" }}>
      <div className="text-xs font-bold uppercase tracking-wide mb-1" style={{ color: ACCENT }}>Fields</div>
      <p className="text-xs mb-2" style={{ color: "var(--color-text-secondary)" }}>
        Built-in fields can be hidden. Your own can be edited, and items keep their values when you change them.
      </p>
      <ul className="flex flex-col gap-1">
        {entries.map((e, i) => (
          <FieldRow key={e.def.id} entry={e} first={i === 0} last={i === entries.length - 1} onEdit={() => onEditField(e.def)}
            onMove={(d) => save((s) => moveCollectionFieldBy(s, categoryId, e.def.id, d, Date.now()))}
            onShow={(show) => save((s) => setBuiltInFieldHidden(s, categoryId, e.def.id, !show, Date.now()))} />
        ))}
      </ul>
      <button type="button" onClick={() => onEditField(undefined)} disabled={!room}
        className="mt-2 text-sm font-semibold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed" style={{ color: ACCENT }}>
        {room ? "+ Add a field" : `${MAX_CUSTOM_FIELDS_PER_CATEGORY} of your own fields at most`}
      </button>
      {deleted.length > 0 && (
        <div className="mt-3">
          <div className="text-xs font-bold uppercase tracking-wide mb-1" style={{ color: ACCENT }}>Recently deleted</div>
          {deleted.map((f) => (
            <div key={f.id} className="flex items-center justify-between py-1 text-sm" style={{ color: "var(--color-text-primary)" }}>
              {f.name}
              <button type="button" onClick={() => save((s) => restoreCustomField(s, categoryId, f.id, Date.now()))}
                className="font-semibold cursor-pointer" style={{ color: ACCENT }} aria-label={`Restore ${f.name}`}>Restore</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FieldRow({ entry, first, last, onEdit, onMove, onShow }: {
  entry: CollectionFieldEntry; first: boolean; last: boolean; onEdit: () => void;
  onMove: (delta: -1 | 1) => void; onShow: (show: boolean) => void;
}) {
  const { def, builtIn, hidden } = entry;
  const arrow = "px-1 text-xs cursor-pointer disabled:opacity-30 disabled:cursor-default";
  return (
    <li className="flex items-center gap-2 py-1">
      <button type="button" onClick={() => onMove(-1)} disabled={first} aria-label={`Move ${def.name} up`} className={arrow} style={{ color: "var(--color-text-secondary)" }}>▲</button>
      <button type="button" onClick={() => onMove(1)} disabled={last} aria-label={`Move ${def.name} down`} className={arrow} style={{ color: "var(--color-text-secondary)" }}>▼</button>
      {builtIn ? (
        <label className="flex-1 flex items-center gap-2 text-sm cursor-pointer" style={{ color: hidden ? "var(--color-text-dim)" : "var(--color-text-primary)" }}>
          <input type="checkbox" checked={!hidden} onChange={(e) => onShow(e.target.checked)} className="w-4 h-4" style={{ accentColor: ACCENT }}
            aria-label={`Show ${def.name}`} />
          {def.name} <span className="text-xs" style={{ color: "var(--color-text-dim)" }}>· {COLLECTION_FIELD_TYPE_LABELS[def.type]} · built in</span>
        </label>
      ) : (
        <button type="button" onClick={onEdit} className="flex-1 flex items-center justify-between text-sm text-left cursor-pointer"
          style={{ color: "var(--color-text-primary)" }} aria-label={`Edit ${def.name}`}>
          <span>{def.name} <span className="text-xs" style={{ color: "var(--color-text-dim)" }}>· {COLLECTION_FIELD_TYPE_LABELS[def.type]}</span></span>
          <span aria-hidden="true" style={{ color: "var(--color-text-dim)" }}>Edit ›</span>
        </button>
      )}
    </li>
  );
}

/** Delete a user category: its items move first, to the category picked here. */
function DeleteCategory({ settings, categoryId, name, items, onDeleted, onError }: {
  settings: CollectionSettings; categoryId: string; name: string; items: CollectionItem[];
  onDeleted: () => void; onError: (m: string) => void;
}) {
  const [asking, setAsking] = useState(false);
  const targets = collectionMoveTargets(settings, categoryId);
  const [target, setTarget] = useState(targets[0]?.id ?? "uncategorised");
  const count = collectionItemsInCategory(items, categoryId);
  const remove = async () => {
    try {
      const now = Date.now();
      if (count) await saveCollectionItems(moveCollectionItemsToCategory(items, categoryId, target, now));
      await updateCollectionSettings((s) => deleteUserCollectionCategory(s, categoryId, now));
      onDeleted();
    } catch (e) {
      console.error("[CollectionCategoryDetail] deleting failed:", e);
      onError("The category is still there. Please try again.");
    }
  };
  if (!asking) {
    return <button type="button" onClick={() => setAsking(true)} className="self-start px-4 py-2 rounded-full text-sm font-semibold cursor-pointer"
      style={{ color: "var(--color-error)", border: "1px solid var(--color-error)" }}>Delete category</button>;
  }
  return (
    <div className="flex flex-col gap-2 p-3 rounded-xl" style={{ border: "1px solid var(--color-error)" }}>
      <p className="text-sm" style={{ color: "var(--color-text-primary)" }}>
        Delete &ldquo;{name}&rdquo;?{count ? ` Its ${count} ${count === 1 ? "item moves" : "items move"} first.` : ""}
      </p>
      {count > 0 && (
        <select value={target} onChange={(e) => setTarget(e.target.value)} aria-label="Where its items go" className={INPUT_CLASS} style={INPUT_STYLE}>
          {targets.map((t) => <option key={t.id} value={t.id}>Move to {t.icon} {t.name}</option>)}
        </select>
      )}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={() => setAsking(false)} className="px-4 py-2 rounded-full text-sm font-semibold cursor-pointer" style={{ color: "var(--color-text-secondary)" }}>Keep it</button>
        <button type="button" onClick={remove} className="px-4 py-2 rounded-full text-sm font-semibold cursor-pointer"
          style={{ backgroundColor: "var(--color-error)", color: "var(--color-bg-deep)" }}>Delete</button>
      </div>
    </div>
  );
}
