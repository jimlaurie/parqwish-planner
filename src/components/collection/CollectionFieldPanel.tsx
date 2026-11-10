"use client";

// ==================== COLLECTION FIELD PANEL ====================
// Add or edit one of the user's own fields, inside the Categories dialog
// (dland-wishes docs/collections-design.md §3b): name, type (any of the four
// for a new field; an existing one only between text and a choice list, and a
// text field becoming a list starts from the values its items hold), choices,
// a number's unit, and Delete (hidden, values kept, restorable for 30 days).
// Changing a list's choices: one renamed in place carries its items along; a
// removed one still in use asks where its items go before anything saves.

import { useState } from "react";
import { ACCENT, Chips, INPUT_CLASS, INPUT_STYLE, Label } from "./CollectionFormParts";
import { saveCollectionItems, updateCollectionSettings } from "@/lib/collection-store";
import type { CollectionItem } from "@/lib/db";
import {
  addCustomField, canConvertCollectionFieldType, cleanCollectionChoices, collectionChoicesFromValues,
  collectionFieldProblem, deleteCustomField, newCollectionFieldId,
} from "@shared/collections";
import {
  COLLECTION_FIELD_TYPE_LABELS, collectionChoiceChanges, collectionChoiceMoves, collectionFieldEditRule,
  type CollectionChoiceChanges,
} from "@shared/collection-categories";
import type { CollectionFieldDef, CollectionFieldType } from "@shared/types/collection";

interface Props {
  categoryId: string;
  /** The field to edit, or undefined to add one. */
  field?: CollectionFieldDef;
  items: CollectionItem[];
  onDone: () => void;
}

const ALL_TYPES: CollectionFieldType[] = ["text", "number", "boolean", "choice"];
const BLANK = "";

export default function CollectionFieldPanel({ categoryId, field, items, onDone }: Props) {
  const [name, setName] = useState(field?.name ?? "");
  const [type, setType] = useState<CollectionFieldType>(field?.type ?? "text");
  const [choices, setChoices] = useState<string[]>(field?.choices ?? ["", ""]);
  const [unit, setUnit] = useState(field?.unit ?? "");
  const [problem, setProblem] = useState("");
  const [pending, setPending] = useState<CollectionChoiceChanges | null>(null);
  const [decisions, setDecisions] = useState<Record<string, string>>({});
  const types = field ? ALL_TYPES.filter((t) => t === field.type || canConvertCollectionFieldType(field.type, t)) : ALL_TYPES;
  const next: CollectionFieldDef = { id: field?.id ?? newCollectionFieldId(), name, type, choices: cleanCollectionChoices(choices), unit };

  const chooseType = (t: CollectionFieldType) => {
    if (field && field.type === "text" && t === "choice" && choices.every((c) => !c.trim())) {
      const fromItems = collectionChoicesFromValues(items, field.id);
      setChoices(fromItems.length ? fromItems : ["", ""]);
    }
    setType(t);
  };

  const commit = async (moves: CollectionItem[]) => {
    try {
      const now = Date.now();
      if (!field) await updateCollectionSettings((s) => addCustomField(s, categoryId, next, now));
      else await updateCollectionSettings(collectionFieldEditRule(categoryId, field, next, items, now));
      if (moves.length) await saveCollectionItems(moves);
      onDone();
    } catch (e) {
      console.error("[CollectionFieldPanel] saving failed:", e);
      setProblem(e instanceof Error ? e.message.replace("[collections] ", "") : "Please try again.");
    }
  };

  const save = () => {
    const why = collectionFieldProblem(next);
    if (why) { setProblem(why); return; }
    if (!field || field.type !== "choice" || type !== "choice") { commit([]); return; }
    const changes = collectionChoiceChanges(items, field, next.choices ?? []);
    if (Object.keys(changes.inUse).length) { setPending(changes); return; }
    commit(collectionChoiceMoves(items, field.id, changes, {}, Date.now()));
  };

  const confirmMoves = () => {
    if (!field || !pending) return;
    const chosen = Object.fromEntries(Object.keys(pending.inUse).map((c) => [c, decisions[c] || undefined]));
    commit(collectionChoiceMoves(items, field.id, pending, chosen, Date.now()));
  };

  const remove = async () => {
    if (!field) return;
    try { await updateCollectionSettings((s) => deleteCustomField(s, categoryId, field.id, Date.now())); onDone(); } catch (e) {
      console.error("[CollectionFieldPanel] deleting failed:", e);
      setProblem("The field wasn't deleted. Please try again.");
    }
  };

  if (pending) {
    return <ChoiceMoves pending={pending} choices={next.choices ?? []} decisions={decisions} onDecide={setDecisions}
      onBack={() => setPending(null)} onSave={confirmMoves} />;
  }
  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-lg font-bold" style={{ color: ACCENT }}>{field ? "Edit field" : "New field"}</h3>
      <div><Label htmlFor="collection-field-name">Name</Label>
        <input id="collection-field-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. City" autoFocus={!field}
          className={INPUT_CLASS} style={INPUT_STYLE} /></div>
      <div><Label>{field ? "Type (text and choice lists can switch)" : "Type"}</Label>
        <Chips label="Field type" clearable={false} value={type} onChange={(t) => t && chooseType(t)}
          options={types.map((t) => ({ value: t, label: COLLECTION_FIELD_TYPE_LABELS[t] }))} /></div>
      {type === "choice" && <ChoiceList choices={choices} onChange={setChoices} />}
      {type === "number" && (
        <div><Label htmlFor="collection-field-unit">Unit (optional)</Label>
          <input id="collection-field-unit" value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="e.g. cm or $"
            className={INPUT_CLASS} style={INPUT_STYLE} /></div>
      )}
      {problem && <p role="alert" className="text-sm" style={{ color: "var(--color-error)" }}>{problem}</p>}
      <div className="flex items-center gap-2">
        {field && <button type="button" onClick={remove} className="px-4 py-2 rounded-full text-sm font-semibold cursor-pointer" style={{ color: "var(--color-error)" }}>Delete field</button>}
        <button type="button" onClick={onDone} className="ml-auto px-4 py-2 rounded-full text-sm font-semibold cursor-pointer" style={{ color: "var(--color-text-secondary)" }}>Cancel</button>
        <button type="button" onClick={save} className="px-4 py-2 rounded-full text-sm font-semibold cursor-pointer" style={{ backgroundColor: ACCENT, color: "var(--color-bg-deep)" }}>Save field</button>
      </div>
    </div>
  );
}

// ==================== PIECES ====================

function ChoiceList({ choices, onChange }: { choices: string[]; onChange: (c: string[]) => void }) {
  const setAt = (i: number, v: string) => onChange(choices.map((c, j) => (j === i ? v : c)));
  return (
    <div>
      <Label>Choices</Label>
      <div className="flex flex-col gap-2">
        {choices.map((c, i) => (
          <div key={i} className="flex items-center gap-2">
            <input value={c} onChange={(e) => setAt(i, e.target.value)} placeholder={`Choice ${i + 1}`} aria-label={`Choice ${i + 1}`}
              className={INPUT_CLASS} style={INPUT_STYLE} />
            <button type="button" onClick={() => onChange(choices.filter((_, j) => j !== i))} aria-label={`Remove choice ${i + 1}`}
              className="px-2 py-1 text-sm cursor-pointer" style={{ color: "var(--color-text-dim)" }}>✕</button>
          </div>
        ))}
      </div>
      <button type="button" onClick={() => onChange([...choices, ""])} className="mt-2 text-sm font-semibold cursor-pointer" style={{ color: ACCENT }}>
        + Add a choice
      </button>
    </div>
  );
}

/** Where each removed choice's items go: another choice, or blank. */
function ChoiceMoves({ pending, choices, decisions, onDecide, onBack, onSave }: {
  pending: CollectionChoiceChanges; choices: string[]; decisions: Record<string, string>;
  onDecide: (d: Record<string, string>) => void; onBack: () => void; onSave: () => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-lg font-bold" style={{ color: ACCENT }}>Some items use a choice you removed</h3>
      {Object.entries(pending.inUse).map(([choice, count]) => (
        <div key={choice}>
          <Label htmlFor={`move-${choice}`}>{count} {count === 1 ? "item uses" : "items use"} &ldquo;{choice}&rdquo;. Where should {count === 1 ? "it" : "they"} go?</Label>
          <select id={`move-${choice}`} value={decisions[choice] ?? BLANK} onChange={(e) => onDecide({ ...decisions, [choice]: e.target.value })}
            className={INPUT_CLASS} style={INPUT_STYLE}>
            <option value={BLANK}>Leave blank</option>
            {choices.map((c) => <option key={c} value={c}>Move to {c}</option>)}
          </select>
        </div>
      ))}
      <div className="flex items-center gap-2">
        <button type="button" onClick={onBack} className="ml-auto px-4 py-2 rounded-full text-sm font-semibold cursor-pointer" style={{ color: "var(--color-text-secondary)" }}>Back</button>
        <button type="button" onClick={onSave} className="px-4 py-2 rounded-full text-sm font-semibold cursor-pointer" style={{ backgroundColor: ACCENT, color: "var(--color-bg-deep)" }}>Save field</button>
      </div>
    </div>
  );
}
