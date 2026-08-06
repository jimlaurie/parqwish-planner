import Link from "next/link";
import { WORKFLOWS } from "@/lib/guide-data/workflows";
import WorkflowCard from "@/components/guide/WorkflowCard";
import { PWA_SCREENS } from "@/lib/guide-data/features-pwa";
import { MOBILE_SCREENS } from "@/lib/guide-data/features-mobile";

const FEATURE_CARDS = [
  { icon: "📱", title: "Mobile App",   desc: "Home screen, rides, dining, sync, settings.",       href: "/guide/features/mobile",  soon: false },
  { icon: "🖥️",  title: "Web Planner", desc: "Plan, Prepare, Preview, Play, Publish phases.",     href: "/guide/features/pwa",     soon: false },
  { icon: "🔄", title: "Data Sync",   desc: "File-based transfer between mobile and desktop.",    href: "/guide/features/sync",    soon: false },
  { icon: "📍", title: "GPS Trail",   desc: "Background trail recording and map playback.",       href: "/guide/features/gps",     soon: false },
];

export default function GuideLandingPage() {
  return (
    <div style={{ paddingBottom: "48px" }}>

      {/* ── Hero ── */}
      <div style={{ marginBottom: "40px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "10px" }}>
          <span style={{ fontSize: "36px" }}>📖</span>
          <h1
            style={{
              margin: 0,
              fontSize: "var(--text-3xl)",
              fontWeight: "var(--font-bold)",
              color: "var(--color-heading)",
            }}
          >
            ParQwish Guide
          </h1>
        </div>
        <p
          style={{
            margin: 0,
            fontSize: "var(--text-base)",
            color: "var(--color-text-secondary)",
            lineHeight: "var(--leading-relaxed)",
            maxWidth: "560px",
          }}
        >
          Step-by-step workflows for every kind of Disneyland visit, plus a full feature reference and FAQ.
          Pick your scenario below — each workflow walks you through exactly what to do and when.
        </p>
      </div>

      {/* ── Workflow cards ── */}
      <section style={{ marginBottom: "48px" }}>
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
          Pick Your Scenario
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
            gap: "14px",
          }}
        >
          {WORKFLOWS.map((w) => (
            <WorkflowCard key={w.slug} workflow={w} />
          ))}
        </div>
      </section>

      {/* ── Feature reference grid ── */}
      <section style={{ marginBottom: "48px" }}>
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
          Feature Reference
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
            gap: "12px",
          }}
        >
          {FEATURE_CARDS.map((f) => {
            const inner = (
              <div
                style={{
                  padding: "16px",
                  borderRadius: "var(--radius-xl)",
                  border: "1px solid var(--color-border-subtle)",
                  background: "var(--color-bg-card)",
                  opacity: f.soon ? 0.6 : 1,
                  height: "100%",
                  boxSizing: "border-box",
                  transition: "border-color 0.2s",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                  <span style={{ fontSize: "20px" }}>{f.icon}</span>
                  <span style={{ fontSize: "var(--text-sm)", fontWeight: "var(--font-semibold)", color: "var(--color-heading)" }}>
                    {f.title}
                  </span>
                  {f.soon && (
                    <span
                      style={{
                        fontSize: "var(--text-2xs)",
                        padding: "1px 6px",
                        borderRadius: "var(--radius-full)",
                        background: "var(--color-surface-raised)",
                        color: "var(--color-text-dim)",
                      }}
                    >
                      soon
                    </span>
                  )}
                  {!f.soon && (
                    <span style={{ fontSize: "var(--text-2xs)", color: "var(--color-gold)", marginLeft: "auto" }}>
                      {f.href === "/guide/features/pwa" ? `${PWA_SCREENS.length} screens →`
                       : f.href === "/guide/features/mobile" ? `${MOBILE_SCREENS.length} screens →`
                       : "→"}
                    </span>
                  )}
                </div>
                <p style={{ margin: 0, fontSize: "var(--text-xs)", color: "var(--color-text-muted)", lineHeight: "var(--leading-normal)" }}>
                  {f.desc}
                </p>
              </div>
            );

            return f.soon ? (
              <div key={f.href}>{inner}</div>
            ) : (
              <Link key={f.href} href={f.href} style={{ textDecoration: "none" }}>
                {inner}
              </Link>
            );
          })}
        </div>
      </section>

      {/* ── FAQ teaser ── */}
      <section>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "20px 24px",
            borderRadius: "var(--radius-xl)",
            border: "1px solid var(--color-border-subtle)",
            background: "var(--color-bg-card)",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <div>
            <div style={{ fontSize: "var(--text-base)", fontWeight: "var(--font-semibold)", color: "var(--color-heading)", marginBottom: "4px" }}>
              ❓ Frequently Asked Questions
            </div>
            <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--color-text-muted)" }}>
              Privacy, sync, wait times, subscriptions, PDF export and more.
            </p>
          </div>
          <Link
            href="/guide/faq"
            style={{
              padding: "8px 20px",
              borderRadius: "var(--radius-lg)",
              background: "color-mix(in srgb, var(--color-gold) 15%, transparent)",
              border: "1px solid color-mix(in srgb, var(--color-gold) 40%, transparent)",
              color: "var(--color-gold)",
              fontWeight: "var(--font-semibold)",
              fontSize: "var(--text-sm)",
              textDecoration: "none",
            }}
          >
            Browse FAQ →
          </Link>
        </div>
      </section>
    </div>
  );
}
