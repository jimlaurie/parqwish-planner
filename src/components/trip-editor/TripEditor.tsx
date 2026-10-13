"use client";

// ==================== TRIP EDITOR ====================
// The Edit Trip page's body: every section on one page (General, Flights,
// Hotels, Transport, Collaborate, Notes), a sticky menu to jump between them,
// and a sticky Save bar. A saved trip also gets Save as Template, Print, and
// the danger zone. With no trip it edits a new, unsaved draft that the page
// creates on Save. Data and navigation live in src/app/(app)/trip/page.tsx.

import { useEffect, useRef, useState } from "react";
import type { Trip } from "@/lib/db";
import { printTripReport } from "@/lib/trip-report";
import { useTripForm } from "./use-trip-form";
import { GeneralSection, FlightsSection, HotelsSection, TransportSection, NotesSection } from "./TripDetailSections";
import CollaborateSection from "./CollaborateSection";
import DangerZone from "./DangerZone";

const SECTIONS = [
  { id: "general", label: "General" },
  { id: "flights", label: "Flights" },
  { id: "hotels", label: "Hotels" },
  { id: "transport", label: "Transport" },
  { id: "collaborate", label: "Collaborate" },
  { id: "notes", label: "Notes" },
] as const;

interface TripEditorProps {
  /** The trip to edit, or null for a new, unsaved draft. */
  trip: Trip | null;
  /** Just made dated today (Quick Trip, From Template): point at the dates. */
  highlightDates: boolean;
  onSave: (form: Partial<Trip>) => Promise<void>;
  onClose: () => void;
  onSaveAsTemplate?: () => Promise<void>;
  onToggleArchive?: () => Promise<void>;
  onClear?: () => Promise<void>;
  onDelete?: () => Promise<void>;
}

/** Why the form can't be saved yet, or null when it can. */
export function saveBlocker(form: Partial<Trip>): string | null {
  if (!form.name?.trim()) return "Give the trip a name.";
  if (form.isTemplate) return null;
  if (!form.startDate || !form.endDate) return "Set the start and end dates.";
  if (form.endDate < form.startDate) return "The end date is before the start date.";
  return null;
}

export default function TripEditor(props: TripEditorProps) {
  const { trip, highlightDates, onSave, onClose } = props;
  const f = useTripForm(trip);
  const [saving, setSaving] = useState(false);
  const [archiveBusy, setArchiveBusy] = useState(false);
  const [templateSaved, setTemplateSaved] = useState(false);
  const startDateRef = useRef<HTMLInputElement>(null);
  const activeSection = useActiveSection();
  const blocker = saveBlocker(f.form);

  useEffect(() => {
    if (highlightDates) startDateRef.current?.focus();
  }, [highlightDates]);

  const save = async () => {
    if (saving || blocker) return;
    setSaving(true);
    try {
      await onSave(f.form);
      f.markSaved();
    } finally {
      setSaving(false);
    }
  };
  const close = () => {
    if (f.isDirty() && !window.confirm("Leave without saving your changes?")) return;
    onClose();
  };
  useSaveShortcut(save);
  useLeaveWarning(f.isDirty);

  const toggleArchive = async () => {
    if (!props.onToggleArchive || archiveBusy) return;
    setArchiveBusy(true);
    try { await props.onToggleArchive(); } finally { setArchiveBusy(false); }
  };
  const saveAsTemplate = async () => {
    if (!props.onSaveAsTemplate) return;
    await props.onSaveAsTemplate();
    setTemplateSaved(true);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 pb-6">
      <header className="flex items-center gap-3 pt-6 pb-3">
        <button type="button" onClick={close} className="text-sm px-2 py-1 rounded cursor-pointer hover:bg-white/5"
                style={{ color: "var(--color-text-muted)" }}>
          ← Home
        </button>
        <h1 className="text-xl font-bold truncate" style={{ color: "var(--color-heading)" }}>
          {trip ? `✏️ Edit ${trip.isTemplate ? "Template" : "Trip"}` : "\u{1F3F0} New Trip"}
        </h1>
      </header>

      <SectionMenu active={activeSection} />

      <div className="flex flex-col gap-4 mt-4">
        <GeneralSection
          f={f} highlightDates={highlightDates} startDateRef={startDateRef}
          archive={trip && props.onToggleArchive ? { isArchived: !!trip.isArchived, busy: archiveBusy, onToggle: toggleArchive } : undefined}
        />
        <FlightsSection f={f} />
        <HotelsSection f={f} />
        <TransportSection f={f} />
        <CollaborateSection trip={trip} />
        <NotesSection f={f} />
        {trip && (
          <DangerZone
            trip={trip} onClear={props.onClear} onDelete={props.onDelete}
            actions={!f.form.isTemplate ? (
              <>
                {props.onSaveAsTemplate && (
                  <SmallButton onClick={saveAsTemplate} disabled={templateSaved}>
                    {templateSaved ? "✓ Saved as Template" : "Save as Template"}
                  </SmallButton>
                )}
                <SmallButton onClick={() => printTripReport(f.form as Trip)}>🖨 Print</SmallButton>
              </>
            ) : null}
          />
        )}
      </div>

      <SaveBar isDraft={!trip} saving={saving} blocker={blocker} onSave={save} onCancel={close} />
    </div>
  );
}

// ==================== SECTION MENU ====================

/** Sticky chips under the top bar that jump to each section; the one in view is filled. */
function SectionMenu({ active }: { active: string }) {
  return (
    <nav aria-label="Trip sections" className="sticky top-14 z-30 -mx-4 px-4 py-2 backdrop-blur-md"
         style={{ backgroundColor: "color-mix(in srgb, var(--color-bg-deep) 85%, transparent)" }}>
      <div className="flex gap-1 overflow-x-auto">
        {SECTIONS.map((s) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            onClick={(e) => { e.preventDefault(); document.getElementById(s.id)?.scrollIntoView({ behavior: "smooth", block: "start" }); }}
            aria-current={active === s.id ? "true" : undefined}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors duration-200 ${
              active === s.id ? "bg-[var(--color-gold)]" : "hover:bg-white/5"
            }`}
            style={{ color: active === s.id ? "var(--color-bg-deep)" : "var(--color-text-secondary)" }}
          >
            {s.label}
          </a>
        ))}
      </div>
    </nav>
  );
}

/**
 * The section the menu fills: the last one whose top has scrolled up past
 * the menu, or the last section once the page is scrolled to the bottom
 * (short sections at the end can never reach the top).
 */
function useActiveSection(): string {
  const [active, setActive] = useState<string>(SECTIONS[0].id);
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
      let current: string = SECTIONS[0].id;
      for (const s of SECTIONS) {
        const el = document.getElementById(s.id);
        if (el && el.getBoundingClientRect().top <= 140) current = s.id;
      }
      setActive(atBottom ? SECTIONS[SECTIONS.length - 1].id : current);
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);
  return active;
}

// ==================== SAVE BAR ====================

/** Cancel and Save, always in reach at the bottom of the screen (above the phone tab bar). */
function SaveBar({ isDraft, saving, blocker, onSave, onCancel }: {
  isDraft: boolean; saving: boolean; blocker: string | null; onSave: () => void; onCancel: () => void;
}) {
  return (
    <div className="sticky z-30 mt-6 -mx-4 px-4 py-3 flex items-center gap-3 border-t backdrop-blur-md"
         style={{ bottom: "var(--mobile-tabbar-h)", borderColor: "var(--color-border-subtle)",
                  backgroundColor: "color-mix(in srgb, var(--color-bg-deep) 90%, transparent)" }}>
      <span className="flex-1 text-xs min-w-0" style={{ color: "var(--color-text-muted)" }}>{blocker}</span>
      <button type="button" onClick={onCancel}
              className="px-4 py-2 rounded-full text-sm font-medium cursor-pointer transition-colors duration-200 hover:bg-white/5"
              style={{ color: "var(--color-text-secondary)" }}>
        Cancel
      </button>
      <button type="button" onClick={onSave} disabled={saving || !!blocker}
              className="px-5 py-2 rounded-full text-sm font-semibold cursor-pointer transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110"
              style={{ backgroundColor: "var(--color-gold)", color: "var(--color-bg-deep)" }}>
        {saving ? (isDraft ? "Creating..." : "Saving...") : isDraft ? "Create Trip" : "Save"}
      </button>
    </div>
  );
}

function SmallButton({ onClick, disabled, children }: { onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled}
            className="text-xs px-3 py-1.5 rounded-full border border-white/10 transition-colors duration-200 hover:bg-white/5 cursor-pointer disabled:cursor-default disabled:opacity-70"
            style={{ color: "var(--color-text-muted)" }}>
      {children}
    </button>
  );
}

// ==================== KEYBOARD AND LEAVING ====================

/** Ctrl/Cmd+S saves instead of opening the browser's Save Page dialog. */
function useSaveShortcut(save: () => void) {
  const saveRef = useRef(save);
  saveRef.current = save;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") { e.preventDefault(); saveRef.current(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}

/** The browser's own "leave site?" prompt when closing or reloading with unsaved changes. */
function useLeaveWarning(isDirty: () => boolean) {
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => { if (isDirty()) e.preventDefault(); };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isDirty]);
}
