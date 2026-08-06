"use client";

import { useDraggable } from "@dnd-kit/core";
import { motion } from "framer-motion";
import type { PackingItemWithStatus } from "@/hooks/use-packing-items";
import { getFirstThumbnail, getPhotos, getPhotoCount } from "@/lib/image-utils";
import { TICKET_COLORS, PACKING_TABS } from "@/lib/constants";

// ==================== TYPES ====================

interface CatalogGridCardProps {
  item: PackingItemWithStatus;
  onEdit: (id: string) => void;
  onContextMenu: (e: React.MouseEvent, item: PackingItemWithStatus) => void;
  selectMode?: boolean;
  selected?: boolean;
  onToggleSelect?: (id: string) => void;
}

const ACCENT = "var(--color-accent-prepare)";

// ==================== COMPONENT ====================

export default function CatalogGridCard({
  item,
  onEdit,
  onContextMenu,
  selectMode = false,
  selected = false,
  onToggleSelect,
}: CatalogGridCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `catalog__${item.id}`,
      data: { catalogItem: item },
      disabled: selectMode,
    });

  const priorityColor = TICKET_COLORS[item.priority] ?? TICKET_COLORS.C;
  const tabDef = PACKING_TABS.find((t) => t.id === item.type);
  const photoCount = getPhotoCount(item);
  const displayPhoto = getPhotos(item, "display")[0] ?? getFirstThumbnail(item);

  const style = transform
    ? {
        transform: `translate(${transform.x}px, ${transform.y}px)`,
        opacity: isDragging ? 0.4 : 1,
        zIndex: isDragging ? 50 : ("auto" as const),
      }
    : undefined;

  return (
    <motion.div
      ref={setNodeRef}
      style={{
        ...style,
        backgroundColor: "var(--color-bg-card)",
      }}
      className="relative rounded-xl border border-white/8 overflow-hidden cursor-grab
                 active:cursor-grabbing transition-colors duration-200 hover:border-white/20
                 flex flex-col"
      onClick={() => (selectMode ? onToggleSelect?.(item.id) : onEdit(item.id))}
      onContextMenu={(e) => onContextMenu(e, item)}
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -2 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      aria-label={`${item.name}, ${item.category}, priority ${item.priority}`}
      {...attributes}
      {...listeners}
    >
      {/* Select checkbox */}
      {selectMode && (
        <span
          className="absolute top-2 right-2 z-10 w-6 h-6 rounded-full flex items-center justify-center
                     text-xs font-bold border-2 backdrop-blur-sm"
          style={{
            backgroundColor: selected ? ACCENT : "rgba(0,0,0,0.4)",
            borderColor: selected ? ACCENT : "rgba(255,255,255,0.5)",
            color: "white",
          }}
        >
          {selected ? "✓" : ""}
        </span>
      )}

      {/* Image Area */}
      <div
        className="relative aspect-[4/3] overflow-hidden"
        style={{ backgroundColor: "var(--color-bg-deep)" }}
      >
        {displayPhoto ? (
          <img
            src={displayPhoto}
            alt={item.name}
            className="w-full h-full object-cover"
            loading="lazy"
            draggable={false}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2">
            <span className="text-3xl opacity-30">
              {tabDef?.icon ?? "\uD83D\uDCE6"}
            </span>
            <span
              className="text-[10px] opacity-20"
              style={{ color: "var(--color-text-muted)" }}
            >
              No photo
            </span>
          </div>
        )}

        {/* Photo count badge */}
        {photoCount > 1 && (
          <span
            className="absolute top-2 right-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full
                       backdrop-blur-sm"
            style={{
              backgroundColor: "rgba(0,0,0,0.6)",
              color: "white",
            }}
          >
            {photoCount} photos
          </span>
        )}

        {/* Priority badge */}
        <span
          className="absolute top-2 left-2 w-6 h-6 rounded flex items-center justify-center
                     text-xs font-bold backdrop-blur-sm"
          style={{
            backgroundColor: priorityColor.bg,
            color: priorityColor.border,
          }}
          title={priorityColor.label}
        >
          {item.priority}
        </span>

        {/* Drag indicator */}
        <span
          className="absolute bottom-2 right-2 text-xs opacity-0 group-hover:opacity-40
                     transition-opacity"
          style={{ color: "white" }}
          aria-hidden="true"
        >
          {"\u2630"}
        </span>
      </div>

      {/* Info Area */}
      <div className="px-3 py-2.5 flex flex-col gap-1 flex-1">
        <h3
          className="text-sm font-semibold line-clamp-2 leading-tight"
          style={{ color: "var(--color-text-primary)" }}
        >
          {item.name}
        </h3>

        <span
          className="text-[11px] px-2 py-0.5 rounded-full self-start"
          style={{
            backgroundColor: `${ACCENT}15`,
            color: ACCENT,
          }}
        >
          {item.category}
        </span>

        {/* Shopping extras */}
        {item.type === "shopping" && item.price && (
          <span
            className="text-xs font-medium"
            style={{ color: "var(--color-success)" }}
          >
            {item.price}
          </span>
        )}

        {/* Notes preview */}
        {item.notes && (
          <p
            className="text-[11px] line-clamp-1 mt-auto"
            style={{ color: "var(--color-text-dim)" }}
          >
            {item.notes}
          </p>
        )}
      </div>
    </motion.div>
  );
}
