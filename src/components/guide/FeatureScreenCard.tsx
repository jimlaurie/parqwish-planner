"use client";

import Link from "next/link";
import { useState } from "react";
import type { PwaScreen } from "@/lib/guide-data/features-pwa";

export default function FeatureScreenCard({ screen }: { screen: PwaScreen }) {
  const [hovered, setHovered] = useState(false);

  return (
    <Link href={`/guide/features/pwa/${screen.slug}`} style={{ textDecoration: "none" }}>
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          borderRadius: "var(--radius-xl)",
          border: `1px solid ${hovered ? "color-mix(in srgb, var(--color-gold) 50%, transparent)" : "var(--color-border-subtle)"}`,
          background: "var(--color-bg-card)",
          overflow: "hidden",
          transition: "border-color 0.2s, box-shadow 0.2s",
          boxShadow: hovered ? "0 4px 20px rgba(0,0,0,0.2)" : "none",
          cursor: "pointer",
        }}
      >
        {/* Screenshot thumbnail */}
        <div style={{ height: "160px", overflow: "hidden", background: "var(--color-surface-sunken)" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={screen.screenshot}
            alt={screen.title}
            style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }}
          />
        </div>

        {/* Info */}
        <div style={{ padding: "14px 16px" }}>
          <div style={{ fontSize: "var(--text-base)", fontWeight: "var(--font-semibold)", color: "var(--color-heading)", marginBottom: "4px" }}>
            {screen.title}
          </div>
          <p style={{ margin: "0 0 8px", fontSize: "var(--text-xs)", color: "var(--color-text-muted)", lineHeight: "var(--leading-normal)" }}>
            {screen.subtitle}
          </p>
          <span style={{ fontSize: "var(--text-2xs)", color: "var(--color-text-dim)" }}>
            {screen.callouts.length} annotated elements →
          </span>
        </div>
      </div>
    </Link>
  );
}
