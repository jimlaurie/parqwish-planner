"use client";

import { useDroppable } from "@dnd-kit/core";
import type { EnsembleWithItems } from "@/hooks/use-ensembles";

const ACCENT = "var(--color-accent-prepare)";

interface EnsembleDropTargetProps {
  ensemble: EnsembleWithItems;
  onEdit: (id: string) => void;
}

export default function EnsembleDropTarget({
  ensemble,
  onEdit,
}: EnsembleDropTargetProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: `ensemble__${ensemble.id}`,
  });

  return (
    <div
      ref={setNodeRef}
      onClick={() => onEdit(ensemble.id)}
      className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer
                 transition-all duration-150"
      style={{
        backgroundColor: isOver ? `${ACCENT}25` : "transparent",
        border: isOver ? `2px dashed ${ACCENT}` : "2px solid transparent",
      }}
    >
      <span className="text-sm flex-shrink-0">
        {ensemble.coverPhoto ? (
          <img
            src={ensemble.coverPhoto}
            alt=""
            className="w-5 h-5 rounded object-cover"
          />
        ) : (
          "\uD83E\uDDF3"
        )}
      </span>
      <span
        className="text-xs font-medium truncate flex-1"
        style={{ color: isOver ? ACCENT : "var(--color-text-muted)" }}
      >
        {ensemble.name}
      </span>
      <span
        className="text-[10px] flex-shrink-0"
        style={{ color: "var(--color-text-dim)" }}
      >
        {ensemble.items.length}
      </span>
    </div>
  );
}
