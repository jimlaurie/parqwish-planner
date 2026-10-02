"use client";

// ==================== CATALOG LIST ROW ====================
// The Catalog's list view for Outfits/Equipment/Sundries/Shopping — the
// same item as CatalogGridCard, as a compact row with a thumbnail. Keeps
// the gallery's behaviors: click to edit (or to select in Select mode),
// right-click for the ensemble menu, and drag onto an ensemble.

import { motion } from "framer-motion";
import { useDraggable } from "@dnd-kit/core";
import type { PackingItemWithStatus } from "@/hooks/use-packing-items";
import { TICKET_COLORS } from "@/lib/constants";
import { PackingThumb } from "./PackingCatalogPanel";

const ACCENT = "var(--color-accent-prepare)";

interface CatalogListRowProps {
  item: PackingItemWithStatus;
  onEdit: (id: string) => void;
  onContextMenu: (e: React.MouseEvent, item: PackingItemWithStatus) => void;
  selectMode?: boolean;
  selected?: boolean;
  onToggleSelect?: (id: string) => void;
}

export default function CatalogListRow({ item, onEdit, onContextMenu, selectMode = false, selected = false, onToggleSelect }: CatalogListRowProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `catalog__${item.id}`,
    data: { catalogItem: item },
    disabled: selectMode,
  });
  const ticket = TICKET_COLORS[item.priority] ?? TICKET_COLORS.C;

  return (
    <motion.div
      ref={setNodeRef}
      style={{
        backgroundColor: "var(--color-bg-card)",
        ...(transform ? { transform: `translate(${transform.x}px, ${transform.y}px)`, opacity: isDragging ? 0.4 : 1, zIndex: isDragging ? 50 : "auto" } : {}),
      }}
      className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-white/8 cursor-grab active:cursor-grabbing hover:border-white/20 transition-colors"
      onClick={() => (selectMode ? onToggleSelect?.(item.id) : onEdit(item.id))}
      onContextMenu={(e) => onContextMenu(e, item)}
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      aria-label={`${item.name}, ${item.category}, priority ${item.priority}`}
      {...attributes}
      {...listeners}
    >
      {selectMode && (
        <span
          className="w-5 h-5 shrink-0 rounded-full flex items-center justify-center text-[10px] font-bold border-2"
          style={{ backgroundColor: selected ? ACCENT : "transparent", borderColor: selected ? ACCENT : "var(--color-border-strong)", color: "var(--color-bg-deep)" }}
        >
          {selected ? "✓" : ""}
        </span>
      )}
      <PackingThumb item={item} size={48} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate" style={{ color: "var(--color-text-primary)" }}>{item.name}</p>
        <p className="text-xs truncate" style={{ color: "var(--color-text-dim)" }}>
          {item.category}
          {item.notes ? ` · ${item.notes}` : ""}
        </p>
      </div>
      <span
        className="shrink-0 w-6 h-6 rounded-md flex items-center justify-center text-[11px] font-bold"
        style={{ backgroundColor: ticket.bg, color: ticket.border }}
        title={`${item.priority}-Ticket · ${ticket.label}`}
      >
        {item.priority}
      </span>
    </motion.div>
  );
}
