"use client";

// ==================== TRIP EDITOR BUILDING BLOCKS ====================
// Section cards, labelled inputs, and the add/remove controls the Edit Trip
// page's sections share. Styles carried over from the old Edit Trip modal.

import type { ReactNode, Ref } from "react";

export const inputClass =
  "w-full rounded-lg px-3 py-2.5 text-sm outline-none border border-white/10 focus:border-[var(--color-gold)] transition-colors duration-200";
export const inputStyle = { backgroundColor: "var(--color-bg-deep)", color: "var(--color-text-primary)" };
export const labelClass = "block text-sm font-medium mb-1.5";
const labelStyle = { color: "var(--color-text-secondary)" };

/** One section of the page, with an anchor the section menu scrolls to. */
export function Section({ id, icon, title, children, aside }: { id: string; icon: string; title: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className="scroll-mt-32 rounded-2xl p-5 border border-white/10"
      style={{ backgroundColor: "var(--color-bg-card)" }}
    >
      <div className="flex items-center justify-between gap-3 mb-4">
        <h2 id={`${id}-title`} className="text-base font-bold flex items-center gap-2" style={{ color: "var(--color-heading)" }}>
          <span aria-hidden>{icon}</span> {title}
        </h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

interface FieldProps {
  label: string;
  value: string | undefined;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  min?: string;
  inputRef?: Ref<HTMLInputElement>;
  highlight?: boolean;
}

export function Field({ label, value, onChange, type = "text", placeholder, min, inputRef, highlight }: FieldProps) {
  return (
    <label className="block">
      <span className={labelClass} style={labelStyle}>{label}</span>
      <input
        type={type}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        min={min}
        ref={inputRef}
        className={inputClass}
        style={highlight ? { ...inputStyle, borderColor: "var(--color-gold)" } : inputStyle}
      />
    </label>
  );
}

export function TextArea({ label, value, onChange, placeholder, rows = 2 }: {
  label: string; value: string | undefined; onChange: (value: string) => void; placeholder?: string; rows?: number;
}) {
  return (
    <label className="block">
      <span className={labelClass} style={labelStyle}>{label}</span>
      <textarea
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className={`${inputClass} resize-y`}
        style={inputStyle}
      />
    </label>
  );
}

/** A flight, hotel, or transport entry, with its remove button. */
export function ItemCard({ title, onRemove, children }: { title: string; onRemove: () => void; children: ReactNode }) {
  return (
    <div className="rounded-xl p-4 border border-white/10 relative" style={{ backgroundColor: "var(--color-surface-raised)" }}>
      <button
        type="button"
        onClick={onRemove}
        className="absolute top-2 right-2 text-xs px-2 py-0.5 rounded-full cursor-pointer transition-colors duration-200 hover:bg-white/10"
        style={{ color: "var(--color-error)" }}
        aria-label={`Remove ${title}`}
      >
        {"✕"}
      </button>
      <div className="text-xs font-semibold mb-2" style={{ color: "var(--color-text-muted)" }}>{title}</div>
      <div className="flex flex-col gap-3">{children}</div>
    </div>
  );
}

/** The dashed "+ Add …" line; on its own it's an empty section's whole body. */
export function AddButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full py-2.5 rounded-xl border-2 border-dashed text-sm font-medium cursor-pointer transition-colors duration-200 hover:bg-white/5"
      style={{ borderColor: "var(--color-border-input)", color: "var(--color-text-muted)" }}
    >
      + {label}
    </button>
  );
}

/** An on/off switch with its label. */
export function Switch({ on, onToggle, label, disabled }: { on: boolean; onToggle: () => void; label: string; disabled?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={onToggle}
        disabled={disabled}
        role="switch"
        aria-checked={on}
        aria-label={label}
        className={`relative w-11 h-6 rounded-full transition-colors duration-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
          on ? "bg-[var(--color-gold)]" : "bg-white/20"
        }`}
      >
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform duration-200 ${on ? "translate-x-5" : ""}`} />
      </button>
      <span className="text-sm" style={{ color: "var(--color-text-secondary)" }}>{label}</span>
    </div>
  );
}
