"use client";

import { useState } from "react";
import { FAQ_SECTIONS } from "@/lib/guide-data/faq";

export default function FaqPage() {
  const [openKeys, setOpenKeys] = useState<Set<string>>(new Set());

  const toggle = (key: string) =>
    setOpenKeys((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  return (
    <div style={{ maxWidth: "720px" }}>
      {/* Header */}
      <div style={{ marginBottom: "32px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
          <span style={{ fontSize: "32px" }}>❓</span>
          <h1 style={{ margin: 0, fontSize: "var(--text-2xl)", fontWeight: "var(--font-bold)", color: "var(--color-heading)" }}>
            Frequently Asked Questions
          </h1>
        </div>
        <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--color-text-secondary)", lineHeight: "var(--leading-relaxed)" }}>
          Common questions about privacy, sync, wait times, subscriptions, and the PDF export.
        </p>
      </div>

      {/* Sections */}
      <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
        {FAQ_SECTIONS.map((section) => (
          <div key={section.section}>
            <h2
              style={{
                fontSize: "var(--text-xs)",
                textTransform: "uppercase",
                letterSpacing: "1.5px",
                fontWeight: "var(--font-bold)",
                color: "var(--color-gold)",
                margin: "0 0 12px",
                borderLeft: "3px solid var(--color-gold)",
                paddingLeft: "8px",
              }}
            >
              {section.section}
            </h2>

            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              {section.items.map((item) => {
                const key = `${section.section}::${item.question}`;
                const isOpen = openKeys.has(key);
                return (
                  <div
                    key={key}
                    style={{
                      borderRadius: "var(--radius-lg)",
                      border: "1px solid var(--color-border-subtle)",
                      background: "var(--color-bg-card)",
                      overflow: "hidden",
                    }}
                  >
                    <button
                      onClick={() => toggle(key)}
                      style={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "12px",
                        padding: "14px 16px",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        textAlign: "left",
                        fontSize: "var(--text-sm)",
                        fontWeight: "var(--font-medium)",
                        color: "var(--color-text-primary)",
                        lineHeight: "var(--leading-snug)",
                      }}
                    >
                      <span>{item.question}</span>
                      <span
                        style={{
                          fontSize: "10px",
                          color: "var(--color-text-dim)",
                          flexShrink: 0,
                          transform: isOpen ? "rotate(180deg)" : undefined,
                          transition: "transform var(--motion-fast)",
                        }}
                      >
                        ▼
                      </span>
                    </button>
                    {isOpen && (
                      <div
                        style={{
                          padding: "0 16px 16px",
                          fontSize: "var(--text-sm)",
                          color: "var(--color-text-secondary)",
                          lineHeight: "var(--leading-relaxed)",
                          borderTop: "1px solid var(--color-border-subtle)",
                          paddingTop: "12px",
                        }}
                      >
                        {item.answer}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
