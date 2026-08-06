"use client";

import { motion } from "framer-motion";

interface CategoryPickerProps {
  categories: string[];
  value: string;
  onChange: (category: string) => void;
  accentColor?: string;
}

export default function CategoryPicker({
  categories,
  value,
  onChange,
  accentColor = "var(--color-gold)",
}: CategoryPickerProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {categories.map((cat) => {
        const isSelected = value === cat;
        return (
          <motion.button
            key={cat}
            type="button"
            onClick={() => onChange(cat)}
            className="px-3 py-1.5 rounded-lg border-2 cursor-pointer
                       transition-all duration-150 text-sm"
            style={{
              backgroundColor: isSelected
                ? `color-mix(in srgb, ${accentColor} 15%, transparent)`
                : "transparent",
              borderColor: isSelected
                ? accentColor
                : "var(--color-border-subtle)",
            }}
            whileTap={{ scale: 0.95 }}
          >
            <span
              style={{
                color: isSelected ? accentColor : "var(--color-text-secondary)",
              }}
            >
              {cat}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}
