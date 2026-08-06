"use client";

import { motion } from "framer-motion";

interface EmptyStateProps {
  icon: string;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export default function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <motion.div
      className="flex flex-col items-center justify-center py-16 px-4"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <span className="text-5xl mb-4">{icon}</span>
      <h3
        className="text-lg font-semibold mb-2"
        style={{ color: "var(--color-text-primary)" }}
      >
        {title}
      </h3>
      <p
        className="text-sm text-center max-w-xs mb-6"
        style={{ color: "var(--color-text-muted)" }}
      >
        {description}
      </p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="px-5 py-2.5 rounded-full font-semibold text-sm cursor-pointer
                     transition-all duration-200 hover:brightness-110"
          style={{
            backgroundColor: "var(--color-gold)",
            color: "var(--color-bg-deep)",
          }}
        >
          {actionLabel}
        </button>
      )}
    </motion.div>
  );
}
