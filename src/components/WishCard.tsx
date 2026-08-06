"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import type { WishWithStatus } from "@/hooks/use-trip-wishes";
import { TICKET_COLORS, getTagIcon } from "@/lib/constants";
import UserBadge from "@/components/UserBadge";

interface WishCardProps {
  wish: WishWithStatus;
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

export default function WishCard({
  wish,
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
}: WishCardProps) {
  const priorityColor = TICKET_COLORS[wish.priority] ?? TICKET_COLORS.C;
  const isCompleted = wish.completed;

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
      onClick={() => (selectMode ? onToggleSelect?.(wish.id) : onEdit(wish.id))}
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
              borderColor: selected ? "var(--color-gold)" : "var(--color-border-strong)",
              backgroundColor: selected ? "var(--color-gold)" : "transparent",
              color: "var(--color-bg-deep)",
            }}
          >
            {selected ? "\u2713" : ""}
          </span>
        )}

        {/* Completion checkbox */}
        {!selectMode && showCheckbox && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleCompleted(wish.id);
            }}
            className="mt-0.5 flex-shrink-0 w-5 h-5 rounded border-2 flex items-center
                       justify-center cursor-pointer transition-colors duration-150"
            style={{
              borderColor: isCompleted
                ? "var(--color-gold)"
                : "var(--color-border-strong)",
              backgroundColor: isCompleted
                ? "var(--color-gold)"
                : "transparent",
            }}
            role="checkbox"
            aria-checked={isCompleted}
            aria-label={`Mark "${wish.title}" as ${isCompleted ? "incomplete" : "complete"}`}
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
              {wish.title}
            </h3>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {headerExtra}
              {/* Tag icons */}
              <div className="flex gap-1">
                {wish.tags.map((tag) => (
                  <span key={tag} className="text-sm" title={tag}>
                    {getTagIcon(tag)}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Notes preview */}
          {wish.notes && (
            <p
              className="text-xs mt-1 line-clamp-1"
              style={{
                color: "var(--color-text-muted)",
                opacity: isCompleted ? 0.6 : 1,
              }}
            >
              {wish.notes}
            </p>
          )}

          {/* URL indicator */}
          {wish.url && (
            <a
              href={wish.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs mt-1 truncate block hover:underline"
              style={{ color: "var(--color-text-dim)" }}
              onClick={(e) => e.stopPropagation()}
            >
              {"\u{1F517}"} {wish.url} {"\u2197"}
            </a>
          )}

          {/* User badge + Park / Land badge + Max Wait */}
          {(userName || wish.park || wish.land || wish.maxWaitTime) && (
            <div className="mt-1 flex items-center gap-1.5 flex-wrap">
              {userName && userColor && (
                <UserBadge color={userColor} name={userName} size="sm" />
              )}
              {(wish.park || wish.land) && (
                <span
                  className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full"
                  style={{
                    backgroundColor: "color-mix(in srgb, var(--color-gold) 8%, transparent)",
                    color: "var(--color-gold)",
                  }}
                >
                  {wish.park}
                  {wish.park && wish.land ? " \u00b7 " : ""}
                  {wish.land}
                </span>
              )}
              {wish.maxWaitTime != null && (
                <span
                  className="inline-flex items-center gap-0.5 text-[10px] px-2 py-0.5 rounded-full"
                  style={{
                    backgroundColor: "color-mix(in srgb, var(--color-accent-publish) 10%, transparent)",
                    color: "var(--color-accent-publish)",
                  }}
                >
                  {"\u23F1"} {wish.maxWaitTime}m max
                </span>
              )}
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
          {wish.priority}
        </div>
      </div>
    </motion.div>
  );
}
