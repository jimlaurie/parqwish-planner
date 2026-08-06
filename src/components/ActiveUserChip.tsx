"use client";

import { useEffect, useRef, useState } from "react";
import { useUsers } from "@/hooks/use-users";
import { useAppStore } from "@/lib/store";

// ==================== COMPONENT ====================
// Shows the active user (who new items are created as) as a small chip.
// Only renders when 2+ users exist. Tap opens a quick-switch dropdown.

export default function ActiveUserChip() {
  const { users } = useUsers();
  const { currentUserId, setCurrentUserId } = useAppStore();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  if (users.length < 2) return null;

  const active = users.find((u) => u.id === currentUserId) ?? users[0];
  const displayName = active.name.length > 12 ? `${active.name.slice(0, 11)}…` : active.name;

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        className="flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium cursor-pointer transition-colors"
        style={{
          backgroundColor: `${active.color}15`,
          color: active.color,
          border: `1px solid ${active.color}40`,
        }}
        onClick={() => setOpen((v) => !v)}
        aria-label={`Active user: ${active.name}. Tap to switch.`}
        aria-expanded={open}
      >
        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: active.color }} />
        {displayName}
        <span className="text-[9px] opacity-70">{"▾"}</span>
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-1 z-20 rounded-lg shadow-lg py-1 min-w-[160px]"
          style={{
            backgroundColor: "var(--color-bg-card)",
            border: "1px solid var(--color-border-subtle)",
          }}
        >
          {users.map((u) => (
            <button
              key={u.id}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left cursor-pointer hover:bg-white/5 transition-colors"
              style={{ color: u.id === currentUserId ? u.color : "var(--color-text-primary)" }}
              onClick={() => {
                setCurrentUserId(u.id);
                setOpen(false);
              }}
            >
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: u.color }} />
              <span className="flex-1 truncate">{u.name}</span>
              {u.id === currentUserId && <span className="text-[10px]">{"✓"}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
