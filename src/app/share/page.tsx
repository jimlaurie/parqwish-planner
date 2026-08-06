"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { storePendingShare, type ShareDestination } from "@/lib/pending-share";

// ==================== DESTINATION CONFIG ====================

interface Destination {
  id: ShareDestination;
  icon: string;
  label: string;
  description: string;
  route: string;
}

const DESTINATIONS: Destination[] = [
  {
    id: "flight",
    icon: "✈️",
    label: "Flight",
    description: "Add to trip's flight details",
    route: "/",
  },
  {
    id: "hotel",
    icon: "🏨",
    label: "Hotel",
    description: "Add to trip's hotel details",
    route: "/",
  },
  {
    id: "dining",
    icon: "🍽️",
    label: "Dining reservation",
    description: "Add to wish list as a dining item",
    route: "/plan",
  },
  {
    id: "wish",
    icon: "⭐",
    label: "Wish list",
    description: "Add as a ride, show, or experience",
    route: "/plan",
  },
  {
    id: "shopping",
    icon: "🛍️",
    label: "Shopping",
    description: "Add to shopping catalog",
    route: "/catalog",
  },
  {
    id: "note",
    icon: "📋",
    label: "Trip note",
    description: "Save as a note on current trip",
    route: "/",
  },
];

// ==================== INNER COMPONENT (needs useSearchParams) ====================

function ShareSelector() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const title = searchParams.get("title") ?? "";
  const text  = searchParams.get("text")  ?? "";
  const url   = searchParams.get("url")   ?? "";

  const [selected, setSelected] = useState<ShareDestination | null>(null);
  const [done, setDone] = useState(false);

  // Auto-detect a likely destination from content
  useEffect(() => {
    const combined = `${title} ${text} ${url}`.toLowerCase();
    if (combined.includes("flight") || combined.includes("airline") || combined.includes("confirmation") && combined.includes("depart")) {
      setSelected("flight");
    } else if (combined.includes("hotel") || combined.includes("reservation") && (combined.includes("check-in") || combined.includes("check in"))) {
      setSelected("hotel");
    } else if (combined.includes("dining") || combined.includes("restaurant") || combined.includes("opentable") || combined.includes("resy")) {
      setSelected("dining");
    }
  }, [title, text, url]);

  const displayContent = title || url || text;
  const preview = displayContent.length > 80 ? displayContent.slice(0, 80) + "…" : displayContent;

  function handleSend() {
    if (!selected) return;
    const dest = DESTINATIONS.find(d => d.id === selected)!;
    storePendingShare({
      title, text, url, destination: selected, sharedAt: Date.now(),
    });
    setDone(true);
    router.push(dest.route);
  }

  if (done) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <div className="text-4xl">✅</div>
        <p style={{ color: "var(--color-text-primary)" }}>Opening ParQwish…</p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6 text-center">
        <div className="text-3xl mb-2">📥</div>
        <h1
          className="text-xl font-bold mb-1"
          style={{ color: "var(--color-heading)" }}
        >
          Add to ParQwish
        </h1>
        <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
          Where would you like to save this?
        </p>
      </div>

      {/* Shared content preview */}
      {preview && (
        <div
          className="mb-6 px-4 py-3 rounded-xl text-sm"
          style={{
            backgroundColor: "var(--color-surface-raised)",
            color: "var(--color-text-secondary)",
            borderLeft: "3px solid var(--color-gold)",
          }}
        >
          {preview}
        </div>
      )}

      {/* Destination selector */}
      <div className="flex flex-col gap-2 mb-6">
        {DESTINATIONS.map((dest) => {
          const isActive = selected === dest.id;
          return (
            <button
              key={dest.id}
              onClick={() => setSelected(dest.id)}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-left
                         transition-all duration-150 cursor-pointer"
              style={{
                backgroundColor: isActive
                  ? "color-mix(in srgb, var(--color-gold) 12%, transparent)"
                  : "var(--color-bg-card)",
                border: isActive
                  ? "2px solid var(--color-gold)"
                  : "2px solid transparent",
                outline: "none",
              }}
            >
              {/* Radio indicator */}
              <div
                className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                style={{
                  borderColor: isActive ? "var(--color-gold)" : "var(--color-border-default)",
                  backgroundColor: isActive ? "var(--color-gold)" : "transparent",
                }}
              >
                {isActive && (
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: "var(--color-bg-deep)" }}
                  />
                )}
              </div>
              <span className="text-xl">{dest.icon}</span>
              <div className="min-w-0">
                <p
                  className="text-sm font-semibold"
                  style={{ color: "var(--color-text-primary)" }}
                >
                  {dest.label}
                </p>
                <p
                  className="text-xs"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  {dest.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
        <button
          onClick={() => router.push("/")}
          className="flex-1 py-3 rounded-xl text-sm font-medium cursor-pointer
                     transition-colors duration-150"
          style={{
            backgroundColor: "var(--color-surface-raised)",
            color: "var(--color-text-muted)",
          }}
        >
          Cancel
        </button>
        <button
          onClick={handleSend}
          disabled={!selected}
          className="flex-1 py-3 rounded-xl text-sm font-semibold cursor-pointer
                     transition-all duration-150 disabled:opacity-40"
          style={{
            backgroundColor: selected ? "var(--color-gold)" : "var(--color-surface-raised)",
            color: selected ? "var(--color-bg-deep)" : "var(--color-text-muted)",
          }}
        >
          Add to ParQwish →
        </button>
      </div>

      {/* Install nudge — only shown in browser, not when installed */}
      <p
        className="text-center text-xs mt-5"
        style={{ color: "var(--color-text-dim)" }}
      >
        For the best experience, install ParQwish to your home screen.
      </p>
    </div>
  );
}

// ==================== PAGE (Suspense wrapper for useSearchParams) ====================

export default function SharePage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="w-8 h-8 border-2 border-[var(--color-gold)] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <ShareSelector />
    </Suspense>
  );
}
