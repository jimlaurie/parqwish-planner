"use client";

import Link from "next/link";
import { useState } from "react";
import type { MobileScreen } from "@/lib/guide-data/features-mobile";

export default function MobileScreenCard({ screen }: { screen: MobileScreen }) {
  const [hovered, setHovered] = useState(false);

  return (
    <Link href={`/guide/features/mobile/${screen.slug}`} style={{ textDecoration: "none" }}>
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
        {/* Portrait thumbnail */}
        <div style={{ height: "220px", overflow: "hidden", background: "var(--color-surface-sunken)", display: "flex", justifyContent: "center" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={screen.screenshot}
            alt={screen.title}
            style={{ height: "100%", width: "auto", objectFit: "cover", objectPosition: "top" }}
          />
        </div>
        <div style={{ padding: "12px 14px" }}>
          <div style={{ fontSize: "var(--text-sm)", fontWeight: "var(--font-semibold)", color: "var(--color-heading)", marginBottom: "4px" }}>
            {screen.title}
          </div>
          <p style={{ margin: "0 0 6px", fontSize: "var(--text-xs)", color: "var(--color-text-muted)", lineHeight: "var(--leading-normal)" }}>
            {screen.subtitle}
          </p>
          <span style={{ fontSize: "var(--text-2xs)", color: "var(--color-text-dim)" }}>
            {screen.callouts.length} elements{screen.editScreenshot ? " + edit form" : ""} →
          </span>
        </div>
      </div>
    </Link>
  );
}
