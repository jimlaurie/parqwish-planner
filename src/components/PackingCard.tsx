"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import type { PackingItemWithStatus } from "@/hooks/use-packing-items";
import { TICKET_COLORS } from "@/lib/constants";
import UserBadge from "@/components/UserBadge";

interface PackingCardProps {
  item: PackingItemWithStatus;
  onToggleCompleted: (id: string) => void;
  onEdit: (id: string) => void;
  showCheckbox?: boolean;
  userName?: string;
  userColor?: string;
  headerExtra?: ReactNode;
  cardStyle?: React.CSSProperties;
  selectMode?: boolean;
  selected?: boolean;
  onToggleSelect?: (id: string) => void;
}

const ACCENT = "var(--color-accent-prepare)";

export default function PackingCard({
  item,
  onToggleCompleted,
  onEdit,
  showCheckbox = true,
  userName,
  userColor,
  headerExtra,
  cardStyle,
  selectMode = false,
  selected = false,
  onToggleSelect,
}: PackingCardProps) {
  const priorityColor = TICKET_COLORS[item.priority] ?? TICKET_COLORS.C;
  const isCompleted = item.completed;
  const photoCount = item.photoSets?.length ?? item.photos?.length ?? 0;
  const hasPhotos =
    photoCount > 0 &&
    (item.type === "outfit" || item.type === "shopping" || item.type === "dining");
  const firstThumb = item.photoSets?.[0]?.thumbnail ?? item.photos?.[0];
  const extraPhotoCount = photoCount - 1;

  return (
    <motion.div
      className="relative rounded-xl border border-white/8 cursor-pointer
                 transition-colors duration-200 hover:border-white/20"
      style={{
        backgroundColor: "var(--color-bg-card)",
        borderLeftWidth: "4px",
        borderLeftColor: priorityColor.border,
        ...cardStyle,
      }}
      onClick={() => (selectMode ? onToggleSelect?.(item.id) : onEdit(item.id))}
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      whileHover={{ scale: 1.01 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
    >
      <div className="flex items-start gap-3 px-4 py-3">
        {/* Select checkbox */}
        {selectMode && (
          <span
            className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center
                       justify-center text-xs font-bold"
            style={{
              borderColor: selected ? ACCENT : "var(--color-border-strong)",
              backgroundColor: selected ? ACCENT : "transparent",
              color: "var(--color-bg-deep)",
            }}
          >
            {selected ? "✓" : ""}
          </span>
        )}

        {/* Photo thumbnail */}
        {hasPhotos && (
          <div className="relative flex-shrink-0">
            <img
              src={firstThumb}
              alt={`${item.name} thumbnail`}
              className="w-10 h-10 rounded-lg object-cover"
              style={{
                opacity: isCompleted ? 0.5 : 1,
              }}
            />
            {extraPhotoCount > 0 && (
              <span
                className="absolute -bottom-1 -right-1 text-[9px] font-bold px-1 rounded-full"
                style={{
                  backgroundColor: ACCENT,
                  color: "var(--color-bg-deep)",
                }}
              >
                +{extraPhotoCount}
              </span>
            )}
          </div>
        )}

        {/* Completion checkbox */}
        {!selectMode && showCheckbox && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleCompleted(item.id);
            }}
            className="mt-0.5 flex-shrink-0 w-5 h-5 rounded border-2 flex items-center
                       justify-center cursor-pointer transition-colors duration-150"
            style={{
              borderColor: isCompleted ? ACCENT : "var(--color-border-strong)",
              backgroundColor: isCompleted ? ACCENT : "transparent",
            }}
            role="checkbox"
            aria-checked={isCompleted}
            aria-label={`Mark "${item.name}" as ${isCompleted ? "incomplete" : "complete"}`}
          >
            {isCompleted && (
              <span
                className="text-xs font-bold"
                style={{ color: "var(--color-bg-deep)" }}
              >
                {"\u2713"}
              </span>
            )}
          </button>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3
              className="text-sm font-semibold"
              style={{
                color: isCompleted
                  ? "var(--color-text-muted)"
                  : "var(--color-text-primary)",
                textDecoration: isCompleted ? "line-through" : "none",
              }}
            >
              {item.name}
            </h3>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {headerExtra}
              {/* Category badge */}
              <span
                className="text-xs px-2 py-0.5 rounded-full"
                style={{
                  backgroundColor: `color-mix(in srgb, ${ACCENT} 10%, transparent)`,
                  color: ACCENT,
                }}
              >
                {item.category}
              </span>
            </div>
          </div>

          {/* Notes preview */}
          {item.notes && (
            <p
              className="text-xs mt-1 line-clamp-1"
              style={{
                color: "var(--color-text-muted)",
                opacity: isCompleted ? 0.6 : 1,
              }}
            >
              {item.notes}
            </p>
          )}

          {/* Shopping extras: price + URL */}
          {item.type === "shopping" && (
            <div className="flex items-center gap-2 mt-1">
              {item.price && (
                <span
                  className="text-xs font-medium px-2 py-0.5 rounded-full"
                  style={{
                    backgroundColor: "color-mix(in srgb, var(--color-success) 12%, transparent)",
                    color: "var(--color-success)",
                  }}
                >
                  {item.price}
                </span>
              )}
              {item.url && (
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs truncate hover:underline"
                  style={{ color: "var(--color-text-dim)" }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {"\u{1F517}"} {item.url} {"\u2197"}
                </a>
              )}
            </div>
          )}

          {/* Dining extras */}
          {item.type === "dining" && (
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {item.diningType === "reservation" && item.reservationTime && (
                <span
                  className="text-[10px] px-2 py-0.5 rounded-full"
                  style={{
                    backgroundColor: "color-mix(in srgb, var(--color-success) 12%, transparent)",
                    color: "var(--color-success)",
                  }}
                >
                  {item.reservationTime}
                </span>
              )}
              {item.diningType === "walk-up" && (
                <span
                  className="text-[10px] px-2 py-0.5 rounded-full"
                  style={{
                    backgroundColor: "color-mix(in srgb, var(--color-accent-preview) 12%, transparent)",
                    color: "var(--color-accent-preview)",
                  }}
                >
                  Walk-up
                </span>
              )}
              {item.diningType === "mobile-order" && (
                <span
                  className="text-[10px] px-2 py-0.5 rounded-full"
                  style={{
                    backgroundColor: "color-mix(in srgb, var(--color-accent-play) 12%, transparent)",
                    color: "var(--color-accent-play)",
                  }}
                >
                  📱 {item.reservationTime ? item.reservationTime : "Mobile Order"}
                </span>
              )}
              {item.partySize && (
                <span
                  className="text-[10px]"
                  style={{ color: "var(--color-text-dim)" }}
                >
                  Party of {item.partySize}
                </span>
              )}
            </div>
          )}

          {/* Linked wishes badge */}
          {item.linkedWishIds && item.linkedWishIds.length > 0 && (
            <div className="mt-1">
              <span
                className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full"
                style={{
                  backgroundColor: "color-mix(in srgb, var(--color-gold) 8%, transparent)",
                  color: "var(--color-gold)",
                }}
              >
                {"\u2B50"} {item.linkedWishIds.length} wish
                {item.linkedWishIds.length > 1 ? "es" : ""}
              </span>
            </div>
          )}

          {/* Linked park data badge */}
          {item.linkedParkDataIds && item.linkedParkDataIds.length > 0 && (
            <div className="mt-1">
              <span
                className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full"
                style={{
                  backgroundColor: `color-mix(in srgb, ${ACCENT} 8%, transparent)`,
                  color: ACCENT,
                }}
              >
                {"\u{1F4CD}"} {item.linkedParkDataIds.length} location
                {item.linkedParkDataIds.length > 1 ? "s" : ""}
              </span>
            </div>
          )}

          {/* User badge */}
          {userName && userColor && (
            <div className="mt-1">
              <UserBadge color={userColor} name={userName} size="sm" />
            </div>
          )}
        </div>

        {/* Priority badge */}
        <div
          className="flex-shrink-0 w-6 h-6 rounded flex items-center justify-center
                     text-xs font-bold"
          style={{
            backgroundColor: priorityColor.bg,
            color: priorityColor.border,
          }}
          title={priorityColor.label}
        >
          {item.priority}
        </div>
      </div>
    </motion.div>
  );
}
