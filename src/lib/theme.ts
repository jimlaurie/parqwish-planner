// Design tokens matching the mobile app (styles/theme.js)
// For programmatic use in Framer Motion, Zustand, etc.
// Tailwind classes should use the CSS custom properties from globals.css

export const colors = {
  primary: "#FFD700",
  background: "#1e1b4b",
  backgroundDark: "#0f0c29",
  cardBackground: "#1a1a3e",
  text: {
    primary: "#FFFFFF",
    secondary: "#B0B0D0",
    muted: "#666666",
    dim: "#9CA3AF",
  },
  status: {
    success: "#4CAF50",
    error: "#FF6B6B",
    warning: "#FFD700",
    info: "#0066CC",
  },
  purple: {
    dark: "#2d2d4f",
    medium: "#3d3d6f",
    light: "#4d4d8f",
  },
  doors: {
    plan: { primary: "#9b59b6", accent: "#FFD700" },
    prepare: { primary: "#8B4513", accent: "#DEB887" },
    play: { primary: "#D2691E", accent: "#FFA500" },
    publish: { primary: "#1a237e", accent: "#64B5F6" },
  },
} as const;
