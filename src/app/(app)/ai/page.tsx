"use client";
// Exploratory WebLLM page — not linked from main nav
// Access at /ai while running `npm run dev`

import { useState, useEffect } from "react";
import WebLLMChat from "@/components/ai/WebLLMChat";

export default function AIPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          background: "var(--color-bg-deep)",
          color: "var(--color-text-muted)",
          fontSize: 13,
        }}
      >
        Loading…
      </div>
    );
  }

  return <WebLLMChat />;
}
