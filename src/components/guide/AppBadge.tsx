import type { AppTarget } from "@/lib/guide-data/workflows";

const CONFIG: Record<AppTarget, { label: string; icon: string; color: string; bg: string }> = {
  mobile: { label: "Mobile App", icon: "📱", color: "#BF4F00", bg: "color-mix(in srgb, #E65100 15%, transparent)" },
  pwa:    { label: "Web Planner", icon: "🖥️",  color: "#1565C0", bg: "color-mix(in srgb, #1976D2 15%, transparent)" },
  both:   { label: "Both Apps",  icon: "🔄",  color: "#2E7D32", bg: "color-mix(in srgb, #388E3C 15%, transparent)" },
};

export default function AppBadge({ app }: { app: AppTarget }) {
  const { label, icon, color, bg } = CONFIG[app];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        padding: "2px 10px",
        borderRadius: "var(--radius-full)",
        background: bg,
        color,
        fontSize: "var(--text-xs)",
        fontWeight: "var(--font-semibold)",
        border: `1px solid ${color}40`,
        flexShrink: 0,
      }}
    >
      {icon} {label}
    </span>
  );
}
