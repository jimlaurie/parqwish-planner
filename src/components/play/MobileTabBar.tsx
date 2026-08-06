"use client";

const ACCENT = "var(--color-accent-preview)";

type PlayTab = "pool" | "timeline";

interface MobileTabBarProps {
  activeTab: PlayTab;
  onTabChange: (tab: PlayTab) => void;
}

const TABS: { id: PlayTab; label: string; icon: string }[] = [
  { id: "pool", label: "Items", icon: "\uD83D\uDCCB" },
  { id: "timeline", label: "Timeline", icon: "\u23F0" },
];

export default function MobileTabBar({ activeTab, onTabChange }: MobileTabBarProps) {
  return (
    <div
      className="flex rounded-xl overflow-hidden"
      style={{ backgroundColor: "var(--color-bg-card)" }}
    >
      {TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium
                     cursor-pointer transition-all duration-150"
          style={{
            backgroundColor: activeTab === tab.id ? `${ACCENT}20` : "transparent",
            color: activeTab === tab.id ? ACCENT : "var(--color-text-dim)",
            borderBottom: activeTab === tab.id ? `2px solid ${ACCENT}` : "2px solid transparent",
          }}
        >
          <span>{tab.icon}</span>
          <span>{tab.label}</span>
        </button>
      ))}
    </div>
  );
}
