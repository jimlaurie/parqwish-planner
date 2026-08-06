"use client";

import { useState } from "react";

// ==================== TYPES ====================

interface SidebarLayoutProps {
  sidebar: React.ReactNode;
  children: React.ReactNode;
  sidebarWidth?: number;
}

// ==================== COMPONENT ====================

export default function SidebarLayout({
  sidebar,
  children,
  sidebarWidth = 240,
}: SidebarLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)]">
      {/* Desktop sidebar */}
      <aside
        className="hidden md:flex flex-col shrink-0 overflow-y-auto transition-all duration-300 relative"
        style={{
          width: collapsed ? 0 : sidebarWidth,
          borderRight: collapsed ? "none" : "1px solid var(--color-border-subtle)",
          backgroundColor: "color-mix(in srgb, var(--color-bg-deep) 60%, transparent)",
        }}
      >
        {!collapsed && sidebar}
      </aside>

      {/* Desktop collapse/expand toggle */}
      <button
        className="hidden md:flex items-center justify-center shrink-0 cursor-pointer
                   transition-colors duration-200 hover:bg-white/5"
        style={{
          width: 20,
          borderRight: "1px solid var(--color-border-subtle)",
          color: "var(--color-text-dim)",
          backgroundColor: "color-mix(in srgb, var(--color-bg-deep) 40%, transparent)",
        }}
        onClick={() => setCollapsed(!collapsed)}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        <span className="text-xs">{collapsed ? "\u25B6" : "\u25C0"}</span>
      </button>

      {/* Mobile hamburger button */}
      <button
        className="fixed bottom-4 left-4 z-50 md:hidden w-12 h-12 rounded-full
                   flex items-center justify-center shadow-lg cursor-pointer"
        style={{
          backgroundColor: "var(--color-gold)",
          color: "var(--color-bg-deep)",
        }}
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label="Toggle sidebar"
        aria-expanded={mobileOpen}
      >
        <span className="text-lg">{mobileOpen ? "\u2715" : "\u2630"}</span>
      </button>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50 md:hidden"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <aside
            className="fixed left-0 top-14 bottom-0 z-40 md:hidden overflow-y-auto"
            style={{
              width: sidebarWidth,
              backgroundColor: "var(--color-bg-deep)",
              borderRight: "1px solid var(--color-border-subtle)",
            }}
          >
            {sidebar}
          </aside>
        </>
      )}

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
