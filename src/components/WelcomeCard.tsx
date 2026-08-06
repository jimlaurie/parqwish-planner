"use client";

// ==================== WELCOME CARD ====================
// Shown on the home screen when no trips exist yet.
// Explains the PWA's role as a companion to the mobile app,
// and gives the user two clear next steps.

import Link from "next/link";
import { useRouter } from "next/navigation";

interface WelcomeCardProps {
  onCreateTrip: () => void;
}

const FEATURES = [
  { icon: "📋", text: "Build wish lists and packing lists before you go" },
  { icon: "🗓️", text: "Plan your itinerary on a big screen" },
  { icon: "📊", text: "Review trip stats and memories after your visit" },
  { icon: "🔄", text: "Sync data to and from the mobile app via file export" },
];

export default function WelcomeCard({ onCreateTrip }: WelcomeCardProps) {
  const router = useRouter();
  return (
    <div
      style={{
        width: "100%",
        maxWidth: "560px",
        borderRadius: "var(--radius-2xl)",
        border: "1px solid var(--color-border-default)",
        background: "var(--color-bg-card)",
        overflow: "hidden",
        boxShadow: "0 8px 32px rgba(0,0,0,0.25)",
      }}
    >
      {/* Gold accent bar */}
      <div
        style={{
          height: "4px",
          background: "linear-gradient(90deg, var(--color-gold), color-mix(in srgb, var(--color-gold) 40%, transparent))",
        }}
      />

      <div style={{ padding: "32px 32px 28px" }}>

        {/* Header */}
        <div style={{ marginBottom: "24px" }}>
          <div style={{ fontSize: "40px", marginBottom: "12px" }}>🏰</div>
          <h1
            style={{
              margin: "0 0 8px",
              fontSize: "var(--text-2xl)",
              fontWeight: "var(--font-bold)",
              color: "var(--color-heading)",
              lineHeight: "var(--leading-tight)",
            }}
          >
            Welcome to ParQwish Planner
          </h1>
          <p
            style={{
              margin: 0,
              fontSize: "var(--text-sm)",
              color: "var(--color-text-secondary)",
              lineHeight: "var(--leading-relaxed)",
            }}
          >
            The web companion to the{" "}
            <strong style={{ color: "var(--color-text-primary)" }}>ParQwish Pal</strong>{" "}
            iOS app. Plan your trip here on a big screen, then sync to your phone for in-park use.
          </p>
        </div>

        {/* Feature list */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            marginBottom: "28px",
            padding: "16px 18px",
            borderRadius: "var(--radius-lg)",
            background: "var(--color-surface-sunken)",
            border: "1px solid var(--color-border-subtle)",
          }}
        >
          {FEATURES.map((f) => (
            <div key={f.icon} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <span style={{ fontSize: "18px", flexShrink: 0 }}>{f.icon}</span>
              <span
                style={{
                  fontSize: "var(--text-sm)",
                  color: "var(--color-text-secondary)",
                  lineHeight: "var(--leading-snug)",
                }}
              >
                {f.text}
              </span>
            </div>
          ))}
        </div>

        {/* Returning user sync path */}
        <div
          style={{
            marginBottom: "16px",
            padding: "14px 18px",
            borderRadius: "var(--radius-lg)",
            background: "color-mix(in srgb, var(--color-gold) 8%, transparent)",
            border: "1px solid color-mix(in srgb, var(--color-gold) 30%, transparent)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
          }}
        >
          <div>
            <p
              style={{
                margin: "0 0 2px",
                fontSize: "var(--text-sm)",
                fontWeight: "var(--font-semibold)",
                color: "var(--color-text-primary)",
              }}
            >
              Already using ParQwish?
            </p>
            <p style={{ margin: 0, fontSize: "var(--text-xs)", color: "var(--color-text-muted)" }}>
              Sign in to restore your trips and wishes from your other devices.
            </p>
          </div>
          <button
            onClick={() => router.push("/play")}
            style={{
              flexShrink: 0,
              padding: "8px 16px",
              borderRadius: "var(--radius-full)",
              border: "1px solid color-mix(in srgb, var(--color-gold) 50%, transparent)",
              background: "transparent",
              color: "var(--color-gold)",
              fontSize: "var(--text-xs)",
              fontWeight: "var(--font-semibold)",
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            Sign in →
          </button>
        </div>

        {/* CTAs */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {/* Primary: Create trip */}
          <button
            onClick={onCreateTrip}
            style={{
              width: "100%",
              padding: "13px 20px",
              borderRadius: "var(--radius-full)",
              border: "none",
              background: "var(--color-gold)",
              color: "var(--color-purple-dark)",
              fontSize: "var(--text-base)",
              fontWeight: "var(--font-bold)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
            }}
          >
            <span>+</span> Create Your First Trip
          </button>

          {/* Secondary: Guide */}
          <Link
            href="/guide"
            style={{
              width: "100%",
              padding: "11px 20px",
              borderRadius: "var(--radius-full)",
              border: "1px solid var(--color-border-default)",
              background: "transparent",
              color: "var(--color-text-secondary)",
              fontSize: "var(--text-sm)",
              fontWeight: "var(--font-medium)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              textDecoration: "none",
              boxSizing: "border-box",
            }}
          >
            <span>📖</span> Browse the Guide
          </Link>
        </div>

        {/* Mobile app nudge */}
        <p
          style={{
            margin: "20px 0 0",
            fontSize: "var(--text-xs)",
            color: "var(--color-text-dim)",
            textAlign: "center",
            lineHeight: "var(--leading-relaxed)",
          }}
        >
          New to ParQwish?{" "}
          <a
            href="https://apps.apple.com"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "var(--color-gold)", textDecoration: "none" }}
          >
            Get the iOS app
          </a>{" "}
          for in-park wait times, GPS trail recording, and real-time scheduling.
        </p>
      </div>
    </div>
  );
}
