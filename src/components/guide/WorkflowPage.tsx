import Link from "next/link";
import type { Workflow } from "@/lib/guide-data/workflows";
import { WORKFLOWS } from "@/lib/guide-data/workflows";
import WorkflowStep from "./WorkflowStep";

export default function WorkflowPage({ workflow }: { workflow: Workflow }) {
  const currentIndex = WORKFLOWS.findIndex((w) => w.slug === workflow.slug);
  const prev = currentIndex > 0 ? WORKFLOWS[currentIndex - 1] : null;
  const next = currentIndex < WORKFLOWS.length - 1 ? WORKFLOWS[currentIndex + 1] : null;

  return (
    <div style={{ maxWidth: "780px", margin: "0 auto", padding: "0 0 48px" }}>

      {/* ── Header ── */}
      <div style={{ marginBottom: "32px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
          <span style={{ fontSize: "32px" }}>{workflow.icon}</span>
          <h1
            style={{
              margin: 0,
              fontSize: "var(--text-2xl)",
              fontWeight: "var(--font-bold)",
              color: "var(--color-heading)",
            }}
          >
            {workflow.title}
          </h1>
        </div>
        <p
          style={{
            margin: "0 0 16px",
            fontSize: "var(--text-base)",
            color: "var(--color-text-secondary)",
            lineHeight: "var(--leading-relaxed)",
          }}
        >
          {workflow.tagline}
        </p>

        {/* Who this is for */}
        <div
          style={{
            padding: "12px 16px",
            borderRadius: "var(--radius-lg)",
            background: "var(--color-surface-sunken)",
            border: "1px solid var(--color-border-subtle)",
            fontSize: "var(--text-sm)",
            color: "var(--color-text-secondary)",
          }}
        >
          <span style={{ fontWeight: "var(--font-semibold)", color: "var(--color-text-primary)" }}>Who this is for: </span>
          {workflow.who}
        </div>
      </div>

      {/* ── Prerequisites ── */}
      <div style={{ marginBottom: "32px" }}>
        <h2
          style={{
            fontSize: "var(--text-xs)",
            textTransform: "uppercase",
            letterSpacing: "1.5px",
            fontWeight: "var(--font-bold)",
            color: "var(--color-gold)",
            margin: "0 0 10px",
            borderLeft: "3px solid var(--color-gold)",
            paddingLeft: "8px",
          }}
        >
          Before You Start
        </h2>
        <ul style={{ margin: 0, padding: "0 0 0 18px", display: "flex", flexDirection: "column", gap: "6px" }}>
          {workflow.needs.map((need, i) => (
            <li key={i} style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)", lineHeight: "var(--leading-normal)" }}>
              {need}
            </li>
          ))}
        </ul>
      </div>

      {/* ── Steps ── */}
      <div style={{ marginBottom: "40px" }}>
        <h2
          style={{
            fontSize: "var(--text-xs)",
            textTransform: "uppercase",
            letterSpacing: "1.5px",
            fontWeight: "var(--font-bold)",
            color: "var(--color-gold)",
            margin: "0 0 16px",
            borderLeft: "3px solid var(--color-gold)",
            paddingLeft: "8px",
          }}
        >
          Steps ({workflow.steps.length})
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {workflow.steps.map((step, i) => (
            <WorkflowStep key={i} step={step} index={i} />
          ))}
        </div>
      </div>

      {/* ── Outcome ── */}
      <div
        style={{
          padding: "20px 24px",
          borderRadius: "var(--radius-xl)",
          background: "color-mix(in srgb, var(--color-gold) 10%, transparent)",
          border: "1px solid color-mix(in srgb, var(--color-gold) 30%, transparent)",
          marginBottom: "40px",
        }}
      >
        <div style={{ fontSize: "var(--text-xs)", textTransform: "uppercase", letterSpacing: "1px", fontWeight: "var(--font-bold)", color: "var(--color-gold)", marginBottom: "6px" }}>
          You&apos;ll End Up With
        </div>
        <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--color-text-primary)", lineHeight: "var(--leading-relaxed)" }}>
          {workflow.outcome}
        </p>
      </div>

      {/* ── Prev / Next navigation ── */}
      <div style={{ display: "flex", justifyContent: "space-between", gap: "12px" }}>
        {prev ? (
          <Link
            href={`/guide/workflows/${prev.slug}`}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 16px",
              borderRadius: "var(--radius-lg)",
              border: "1px solid var(--color-border-default)",
              background: "var(--color-bg-card)",
              color: "var(--color-text-secondary)",
              textDecoration: "none",
              fontSize: "var(--text-sm)",
              transition: "border-color var(--motion-fast)",
            }}
          >
            ← {prev.icon} {prev.title}
          </Link>
        ) : <div />}
        {next && (
          <Link
            href={`/guide/workflows/${next.slug}`}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 16px",
              borderRadius: "var(--radius-lg)",
              border: "1px solid var(--color-border-default)",
              background: "var(--color-bg-card)",
              color: "var(--color-text-secondary)",
              textDecoration: "none",
              fontSize: "var(--text-sm)",
            }}
          >
            {next.icon} {next.title} →
          </Link>
        )}
      </div>
    </div>
  );
}
