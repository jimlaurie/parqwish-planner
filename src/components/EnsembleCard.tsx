"use client";

import { motion } from "framer-motion";
import { PACKING_TABS } from "@/lib/constants";
import { useUsers } from "@/hooks/use-users";
import UserBadge from "@/components/UserBadge";
import type { EnsembleWithItems } from "@/hooks/use-ensembles";

const ACCENT = "var(--color-accent-prepare)";

interface EnsembleCardProps {
  ensemble: EnsembleWithItems;
  onEdit: (id: string) => void;
  onAddToTrip?: (id: string) => void;
}

export default function EnsembleCard({
  ensemble,
  onEdit,
  onAddToTrip,
}: EnsembleCardProps) {
  const { users, userMap } = useUsers();
  const owner = users.length > 1 ? userMap.get(ensemble.userId ?? "user_primary") : undefined;
  // Group items by type for display
  const typeCounts: Record<string, number> = {};
  for (const item of ensemble.items) {
    typeCounts[item.type] = (typeCounts[item.type] ?? 0) + 1;
  }

  const typeLabels = Object.entries(typeCounts)
    .map(([type, count]) => {
      const tab = PACKING_TABS.find((t) => t.id === type);
      return `${tab?.icon ?? ""} ${count}`;
    })
    .join("  ");

  return (
    <motion.div
      className="relative rounded-xl border border-white/8 overflow-hidden cursor-pointer
                 transition-colors duration-200 hover:border-white/20"
      style={{
        backgroundColor: "var(--color-bg-card)",
        borderLeftWidth: "4px",
        borderLeftColor: ACCENT,
      }}
      onClick={() => onEdit(ensemble.id)}
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      whileHover={{ scale: 1.01 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
    >
      <div className="flex items-start gap-3 px-4 py-3">
        {/* Cover photo or icon */}
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 text-lg"
          style={{
            backgroundColor: `${ACCENT}20`,
          }}
        >
          {ensemble.coverPhoto ? (
            <img
              src={ensemble.coverPhoto}
              alt=""
              className="w-10 h-10 rounded-lg object-cover"
            />
          ) : (
            <span>{"\u{1F9F3}"}</span>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div
            className="text-sm font-semibold truncate"
            style={{ color: "var(--color-text-primary)" }}
          >
            {ensemble.name}
          </div>

          {ensemble.description && (
            <div
              className="text-xs mt-0.5 truncate"
              style={{ color: "var(--color-text-muted)" }}
            >
              {ensemble.description}
            </div>
          )}

          <div className="flex items-center gap-2 mt-1.5">
            <span
              className="text-[11px]"
              style={{ color: "var(--color-text-dim)" }}
            >
              {ensemble.items.length} item{ensemble.items.length !== 1 ? "s" : ""}
            </span>
            {typeLabels && (
              <span
                className="text-[10px]"
                style={{ color: "var(--color-text-dim)" }}
              >
                {typeLabels}
              </span>
            )}
            {owner && <UserBadge color={owner.color} name={owner.name} />}
          </div>
        </div>

        {/* Add to trip button */}
        {onAddToTrip && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAddToTrip(ensemble.id);
            }}
            className="flex-shrink-0 px-2.5 py-1.5 rounded-lg text-xs font-semibold
                       cursor-pointer transition-all duration-150 hover:brightness-110"
            style={{
              backgroundColor: ACCENT,
              color: "var(--color-bg-deep)",
            }}
          >
            + Trip
          </button>
        )}
      </div>

      {/* Item preview chips */}
      {ensemble.items.length > 0 && (
        <div className="px-4 pb-3 flex flex-wrap gap-1">
          {ensemble.items.slice(0, 6).map((item) => {
            const tab = PACKING_TABS.find((t) => t.id === item.type);
            return (
              <span
                key={item.id}
                className="text-[10px] px-2 py-0.5 rounded-full"
                style={{
                  backgroundColor: "var(--color-surface-raised)",
                  color: "var(--color-text-dim)",
                }}
              >
                {tab?.icon} {item.name}
              </span>
            );
          })}
          {ensemble.items.length > 6 && (
            <span
              className="text-[10px] px-2 py-0.5 rounded-full"
              style={{
                backgroundColor: "var(--color-surface-raised)",
                color: "var(--color-text-dim)",
              }}
            >
              +{ensemble.items.length - 6} more
            </span>
          )}
        </div>
      )}
    </motion.div>
  );
}
