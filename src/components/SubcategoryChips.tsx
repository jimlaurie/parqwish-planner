"use client";

// ==================== SUB-CATEGORY CHIPS ====================
// The second filter level on Prepare (under each category in the sidebar)
// and on the Catalog (under the toolbar): "All" plus one chip per
// sub-category, multi-select. Hidden when there's nothing to choose between.

interface SubcategoryChipsProps {
  options: string[];
  selected: string[];
  onToggle: (option: string) => void;
  onClear: () => void;
  accent: string;
  className?: string;
  /** Optional display labels, keyed by option value. */
  labels?: Record<string, string>;
}

export default function SubcategoryChips({ options, selected, onToggle, onClear, accent, className = "", labels }: SubcategoryChipsProps) {
  if (options.length < 2) return null;
  const chip = (key: string, label: string, active: boolean, onClick: () => void) => (
    <button
      key={key}
      onClick={onClick}
      aria-pressed={active}
      className="text-[11px] px-2 py-0.5 rounded-full cursor-pointer transition-colors"
      style={{
        color: active ? accent : "var(--color-text-muted)",
        backgroundColor: active ? `color-mix(in srgb, ${accent} 14%, transparent)` : "var(--color-surface-sunken)",
        border: active ? `1px solid color-mix(in srgb, ${accent} 40%, transparent)` : "1px solid transparent",
      }}
    >
      {label}
    </button>
  );
  return (
    <div className={`flex flex-wrap gap-1 ${className}`} role="group" aria-label="Sub-categories">
      {chip("__all", "All", selected.length === 0, onClear)}
      {options.map((o) => chip(o, labels?.[o] ?? o, selected.includes(o), () => onToggle(o)))}
    </div>
  );
}
