"use client";

import { useState } from "react";
import type { PwaScreen, Callout } from "@/lib/guide-data/features-pwa";

interface Props {
  screen: PwaScreen;
  /**
   * "stacked"      — screenshot above, click-to-expand legend below (default, good for landscape)
   * "side-by-side" — screenshot left, full legend always visible on right (good for portrait mobile)
   */
  layout?: "stacked" | "side-by-side";
}

export default function AnnotatedScreen({ screen, layout = "stacked" }: Props) {
  const [active, setActive] = useState<number | null>(null);
  const toggle = (id: number) => setActive((prev) => (prev === id ? null : id));

  const screenshot = (
    <div
      style={{
        position: "relative",
        display: "inline-block",
        width: "100%",
        borderRadius: "var(--radius-xl)",
        overflow: "hidden",
        border: "1px solid var(--color-border-subtle)",
        boxShadow: "0 4px 24px rgba(0,0,0,0.25)",
        flexShrink: 0,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={screen.screenshot}
        alt={screen.title}
        style={{ width: "100%", height: "auto", display: "block" }}
      />
      {screen.callouts.map((c) => (
        <CalloutBadge
          key={c.id}
          callout={c}
          isActive={active === c.id}
          onToggle={() => toggle(c.id)}
        />
      ))}
    </div>
  );

  if (layout === "side-by-side") {
    return (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 340px) 1fr",
          gap: "32px",
          alignItems: "start",
        }}
        // Collapse to single column on narrow screens via inline media query trick
        className="annotated-side-by-side"
      >
        {screenshot}
        {/* Legend — always fully expanded in side-by-side mode */}
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          {screen.callouts.map((c) => (
            <LegendItemExpanded
              key={c.id}
              callout={c}
              isActive={active === c.id}
              onToggle={() => toggle(c.id)}
            />
          ))}
        </div>
      </div>
    );
  }

  // ── Stacked layout (default for landscape PWA screenshots) ────────────────
  return (
    <div>
      <div style={{ marginBottom: "32px", maxWidth: "960px" }}>
        {screenshot}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "2px", maxWidth: "960px" }}>
        {screen.callouts.map((c) => (
          <LegendItem
            key={c.id}
            callout={c}
            isActive={active === c.id}
            onToggle={() => toggle(c.id)}
          />
        ))}
      </div>
    </div>
  );
}

// ── Badge ──────────────────────────────────────────────────────────────────

function CalloutBadge({ callout, isActive, onToggle }: { callout: Callout; isActive: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      title={callout.title}
      style={{
        position: "absolute",
        left: `${callout.x}%`,
        top: `${callout.y}%`,
        transform: "translate(-50%, -50%)",
        width: "22px",
        height: "22px",
        borderRadius: "50%",
        background: isActive ? "var(--color-accent-plan)" : "var(--color-gold)",
        color: "var(--color-bg-deep)",
        fontSize: "10px",
        fontWeight: "800",
        border: isActive ? "2px solid white" : "2px solid rgba(255,255,255,0.6)",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: isActive
          ? "0 0 0 3px rgba(255,255,255,0.4), 0 2px 8px rgba(0,0,0,0.4)"
          : "0 2px 6px rgba(0,0,0,0.4)",
        transition: "all 0.15s ease",
        zIndex: 10,
        lineHeight: 1,
        padding: 0,
      }}
    >
      {callout.id}
    </button>
  );
}

// ── Stacked legend item (click to expand) ─────────────────────────────────

function LegendItem({ callout, isActive, onToggle }: { callout: Callout; isActive: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: "12px",
        padding: "10px 14px",
        borderRadius: "var(--radius-lg)",
        background: isActive ? "color-mix(in srgb, var(--color-gold) 8%, transparent)" : "transparent",
        border: isActive ? "1px solid color-mix(in srgb, var(--color-gold) 25%, transparent)" : "1px solid transparent",
        cursor: "pointer",
        textAlign: "left",
        width: "100%",
        transition: "all 0.15s ease",
      }}
    >
      <span style={{
        flexShrink: 0, width: "22px", height: "22px", borderRadius: "50%",
        background: isActive ? "var(--color-gold)" : "var(--color-surface-raised)",
        color: isActive ? "var(--color-bg-deep)" : "var(--color-text-muted)",
        fontSize: "10px", fontWeight: "800",
        display: "flex", alignItems: "center", justifyContent: "center",
        marginTop: "1px", transition: "all 0.15s ease",
      }}>
        {callout.id}
      </span>
      <div>
        <div style={{
          fontSize: "var(--text-sm)", fontWeight: "var(--font-semibold)",
          color: isActive ? "var(--color-gold)" : "var(--color-text-primary)",
          marginBottom: isActive ? "4px" : "0", transition: "color 0.15s ease",
        }}>
          {callout.title}
        </div>
        {isActive && (
          <div style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)", lineHeight: "var(--leading-relaxed)" }}>
            {callout.description}
          </div>
        )}
      </div>
    </button>
  );
}

// ── Side-by-side legend item (always fully expanded) ──────────────────────

function LegendItemExpanded({ callout, isActive, onToggle }: { callout: Callout; isActive: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: "10px",
        padding: "8px 10px",
        borderRadius: "var(--radius-lg)",
        background: isActive ? "color-mix(in srgb, var(--color-gold) 8%, transparent)" : "transparent",
        border: isActive ? "1px solid color-mix(in srgb, var(--color-gold) 25%, transparent)" : "1px solid transparent",
        cursor: "pointer",
        textAlign: "left",
        width: "100%",
        transition: "all 0.15s ease",
      }}
    >
      <span style={{
        flexShrink: 0, width: "20px", height: "20px", borderRadius: "50%",
        background: isActive ? "var(--color-gold)" : "var(--color-surface-raised)",
        color: isActive ? "var(--color-bg-deep)" : "var(--color-text-muted)",
        fontSize: "9px", fontWeight: "800",
        display: "flex", alignItems: "center", justifyContent: "center",
        marginTop: "2px", transition: "all 0.15s ease",
      }}>
        {callout.id}
      </span>
      <div>
        <div style={{
          fontSize: "var(--text-xs)", fontWeight: "var(--font-semibold)",
          color: isActive ? "var(--color-gold)" : "var(--color-text-primary)",
          marginBottom: "2px", transition: "color 0.15s ease",
        }}>
          {callout.title}
        </div>
        <div style={{ fontSize: "var(--text-xs)", color: "var(--color-text-secondary)", lineHeight: "var(--leading-relaxed)" }}>
          {callout.description}
        </div>
      </div>
    </button>
  );
}
