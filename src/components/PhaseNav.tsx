"use client";

import Link from "next/link";

// ==================== TYPES ====================

type Phase = "plan" | "prepare" | "preview" | "play" | "publish";

interface PhaseNavProps {
  currentPhase: Phase;
}

const PHASES: { id: Phase; label: string; icon: string; href: string; accent: string }[] = [
  { id: "plan", label: "Plan", icon: "\u{1F3F0}", href: "/plan", accent: "var(--color-accent-plan)" },
  { id: "preview", label: "Preview", icon: "\u{1F525}", href: "/preview", accent: "var(--color-accent-preview)" },
  { id: "prepare", label: "Prepare", icon: "\u{1F392}", href: "/prepare", accent: "var(--color-accent-prepare)" },
  { id: "play", label: "Play", icon: "\u{1F504}", href: "/play", accent: "var(--color-accent-play)" },
  { id: "publish", label: "Publish", icon: "\u{1F680}", href: "/publish", accent: "var(--color-accent-publish)" },
];

// ==================== COMPONENT ====================

export default function PhaseNav({ currentPhase }: PhaseNavProps) {
  return (
    <nav className="flex items-center gap-1 mt-2 mb-1" aria-label="Trip phases">
      {/* Home link */}
      <Link
        href="/"
        className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium
                   transition-colors duration-200 hover:bg-white/5"
        style={{ color: "var(--color-text-muted)" }}
      >
        <span className="text-sm">{"\u{1F3E0}"}</span>
        <span className="hidden sm:inline">Home</span>
      </Link>

      <span
        className="text-xs mx-0.5"
        style={{ color: "var(--color-text-dim)" }}
      >
        {"\u00B7"}
      </span>

      {/* Phase links */}
      {PHASES.map((phase) => {
        const isActive = phase.id === currentPhase;
        return (
          <Link
            key={phase.id}
            href={phase.href}
            aria-current={isActive ? "page" : undefined}
            aria-label={`${phase.label} phase`}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium
                       transition-colors duration-200
                       ${isActive ? "" : "hover:bg-white/5"}`}
            style={{
              color: isActive ? phase.accent : "var(--color-text-muted)",
              backgroundColor: isActive
                ? `color-mix(in srgb, ${phase.accent} 15%, transparent)`
                : "transparent",
            }}
          >
            <span className="text-sm">{phase.icon}</span>
            <span className="hidden sm:inline">{phase.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
