"use client";

import { useState } from "react";

export default function TipBox({ tip }: { tip: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div
      style={{
        marginTop: "12px",
        borderRadius: "var(--radius-md)",
        border: "1px solid color-mix(in srgb, var(--color-gold) 30%, transparent)",
        overflow: "hidden",
      }}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "8px 12px",
          background: "color-mix(in srgb, var(--color-gold) 10%, transparent)",
          border: "none",
          cursor: "pointer",
          textAlign: "left",
          fontSize: "var(--text-xs)",
          fontWeight: "var(--font-semibold)",
          color: "var(--color-gold)",
        }}
      >
        <span>💡</span>
        <span style={{ flex: 1 }}>Tip</span>
        <span style={{ fontSize: "10px", opacity: 0.7, transform: open ? "rotate(180deg)" : undefined, transition: "transform 0.15s" }}>▼</span>
      </button>
      {open && (
        <div
          style={{
            padding: "10px 12px",
            fontSize: "var(--text-sm)",
            color: "var(--color-text-secondary)",
            lineHeight: "var(--leading-relaxed)",
            background: "var(--color-surface-sunken)",
          }}
        >
          {tip}
        </div>
      )}
    </div>
  );
}
