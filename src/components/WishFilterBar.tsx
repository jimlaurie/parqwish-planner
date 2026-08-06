"use client";

import { motion } from "framer-motion";
import { useAppStore } from "@/lib/store";
import { WISH_TAGS } from "@/lib/constants";

interface WishFilterBarProps {
  tagCounts: Record<string, number>;
}

export default function WishFilterBar({ tagCounts }: WishFilterBarProps) {
  const {
    wishFilters,
    toggleFilterTag,
    clearFilterTags,
    setShowCompleted,
    setSearchQuery,
    setSortBy,
  } = useAppStore();

  const hasActiveFilters =
    wishFilters.selectedTags.length > 0 ||
    !wishFilters.showCompleted ||
    wishFilters.searchQuery.trim().length > 0;

  return (
    <div className="w-full max-w-2xl mb-4 flex flex-col gap-3">
      {/* Search */}
      <div className="relative">
        <span
          className="absolute left-3 top-1/2 -translate-y-1/2 text-sm"
          style={{ color: "var(--color-text-muted)" }}
        >
          {"\u{1F50D}"}
        </span>
        <input
          type="text"
          value={wishFilters.searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search wishes..."
          className="w-full rounded-lg pl-9 pr-3 py-2.5 text-sm outline-none
                     border border-white/10 focus:border-[var(--color-gold)]
                     transition-colors duration-200"
          style={{
            backgroundColor: "var(--color-bg-card)",
            color: "var(--color-text-primary)",
          }}
        />
      </div>

      {/* Tag chips */}
      <div className="flex flex-wrap gap-2">
        {WISH_TAGS.map((tag) => {
          const isActive = wishFilters.selectedTags.includes(tag.id);
          const count = tagCounts[tag.id] ?? 0;
          return (
            <motion.button
              key={tag.id}
              onClick={() => toggleFilterTag(tag.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs
                         font-medium border cursor-pointer transition-colors duration-150"
              style={{
                backgroundColor: isActive
                  ? "color-mix(in srgb, var(--color-gold) 15%, transparent)"
                  : "var(--color-bg-card)",
                borderColor: isActive
                  ? "var(--color-gold)"
                  : "var(--color-border-subtle)",
                color: isActive
                  ? "var(--color-gold)"
                  : "var(--color-text-secondary)",
              }}
              whileTap={{ scale: 0.95 }}
            >
              <span>{tag.icon}</span>
              <span>{tag.label}</span>
              {count > 0 && (
                <span
                  className="ml-0.5 opacity-60"
                  style={{
                    color: isActive
                      ? "var(--color-gold)"
                      : "var(--color-text-muted)",
                  }}
                >
                  {count}
                </span>
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Sort + completed toggle row */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span
            className="text-xs"
            style={{ color: "var(--color-text-muted)" }}
          >
            Sort:
          </span>
          <select
            value={wishFilters.sortBy}
            onChange={(e) =>
              setSortBy(e.target.value as "priority" | "newest" | "title")
            }
            className="rounded-lg px-2 py-1 text-xs outline-none border border-white/10
                       cursor-pointer"
            style={{
              backgroundColor: "var(--color-bg-card)",
              color: "var(--color-text-secondary)",
              colorScheme: "dark",
            }}
          >
            <option value="priority">Priority</option>
            <option value="newest">Newest</option>
            <option value="title">Title</option>
          </select>
        </div>

        <div className="flex items-center gap-3">
          {hasActiveFilters && (
            <button
              onClick={() => {
                clearFilterTags();
                setSearchQuery("");
                setShowCompleted(true);
              }}
              className="text-xs cursor-pointer hover:underline"
              style={{ color: "var(--color-gold)" }}
            >
              Clear filters
            </button>
          )}

          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={wishFilters.showCompleted}
              onChange={(e) => setShowCompleted(e.target.checked)}
              className="accent-[var(--color-gold)] cursor-pointer"
            />
            <span
              className="text-xs"
              style={{ color: "var(--color-text-muted)" }}
            >
              Show done
            </span>
          </label>
        </div>
      </div>
    </div>
  );
}
