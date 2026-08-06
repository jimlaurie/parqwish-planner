"use client";

import { motion } from "framer-motion";
import { useTheme } from "@/components/ThemeProvider";

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <motion.button
      onClick={toggleTheme}
      className="relative w-10 h-10 rounded-full flex items-center justify-center
                 border border-white/10 cursor-pointer transition-colors duration-200
                 hover:border-[var(--color-gold)]"
      style={{ backgroundColor: "var(--color-bg-card)" }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      title={isDark ? "Switch to day mode" : "Switch to night mode"}
      aria-label={isDark ? "Switch to day mode" : "Switch to night mode"}
    >
      <motion.span
        key={isDark ? "moon" : "sun"}
        initial={{ opacity: 0, rotate: -90, scale: 0.5 }}
        animate={{ opacity: 1, rotate: 0, scale: 1 }}
        exit={{ opacity: 0, rotate: 90, scale: 0.5 }}
        transition={{ duration: 0.3 }}
        className="text-lg"
      >
        {isDark ? "\u{1F319}" : "\u2600\uFE0F"}
      </motion.span>
    </motion.button>
  );
}
