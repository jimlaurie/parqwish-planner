"use client";

import Link from "next/link";
import type { Workflow } from "@/lib/guide-data/workflows";

export default function WorkflowCard({ workflow }: { workflow: Workflow }) {
  return (
    <Link
      href={`/guide/workflows/${workflow.slug}`}
      style={{ textDecoration: "none" }}
    >
      <div
        style={{
          padding: "20px",
          borderRadius: "var(--radius-xl)",
          border: "1px solid var(--color-border-subtle)",
          background: "var(--color-bg-card)",
          cursor: "pointer",
          transition: "border-color var(--motion-fast), box-shadow var(--motion-fast)",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          gap: "10px",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLDivElement).style.borderColor = "var(--color-gold)";
          (e.currentTarget as HTMLDivElement).style.boxShadow = "0 4px 16px color-mix(in srgb, var(--color-gold) 15%, transparent)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLDivElement).style.borderColor = "var(--color-border-subtle)";
          (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
        }}
      >
        <span style={{ fontSize: "28px" }}>{workflow.icon}</span>
        <h3
          style={{
            margin: 0,
            fontSize: "var(--text-base)",
            fontWeight: "var(--font-semibold)",
            color: "var(--color-heading)",
          }}
        >
          {workflow.title}
        </h3>
        <p
          style={{
            margin: 0,
            fontSize: "var(--text-sm)",
            color: "var(--color-text-secondary)",
            lineHeight: "var(--leading-relaxed)",
            flex: 1,
          }}
        >
          {workflow.tagline}
        </p>
        <span
          style={{
            fontSize: "var(--text-xs)",
            fontWeight: "var(--font-semibold)",
            color: "var(--color-gold)",
          }}
        >
          {workflow.steps.length} steps →
        </span>
      </div>
    </Link>
  );
}
