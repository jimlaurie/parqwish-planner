"use client";

import { motion } from "framer-motion";
import { WISH_TAGS } from "@/lib/constants";

interface TagSelectorProps {
  value: string[];
  onChange: (tags: string[]) => void;
}

export default function TagSelector({ value, onChange }: TagSelectorProps) {
  const toggleTag = (tagId: string) => {
    if (value.includes(tagId)) {
      onChange(value.filter((t) => t !== tagId));
    } else {
      onChange([...value, tagId]);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {WISH_TAGS.map((tag) => {
        const isSelected = value.includes(tag.id);
        return (
          <motion.button
            key={tag.id}
            type="button"
            onClick={() => toggleTag(tag.id)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border-2
                       cursor-pointer transition-all duration-150 text-sm"
            style={{
              backgroundColor: isSelected
                ? "color-mix(in srgb, var(--color-gold) 12%, transparent)"
                : "transparent",
              borderColor: isSelected
                ? "var(--color-gold)"
                : "var(--color-border-subtle)",
            }}
            whileTap={{ scale: 0.95 }}
          >
            <span>{tag.icon}</span>
            <span
              style={{
                color: isSelected
                  ? "var(--color-gold)"
                  : "var(--color-text-secondary)",
              }}
            >
              {tag.label}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}
