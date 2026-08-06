"use client";

import { useUsers } from "@/hooks/use-users";
import { useAppStore } from "@/lib/store";

// ==================== COMPONENT ====================
// Multi-select chip row for filtering data by family member.
// Only renders when 2+ users exist. Shares activeUserFilter with the
// rest of the app (Plan/Prepare/Preview already filter by it).

export default function UserFilterBar() {
  const { users } = useUsers();
  const { activeUserFilter, toggleUserFilter, setActiveUserFilter } = useAppStore();

  if (users.length < 2) return null;

  return (
    <div className="w-full max-w-4xl flex flex-wrap items-center gap-2 mb-4">
      <span
        className="text-xs font-semibold uppercase tracking-wider mr-1"
        style={{ color: "var(--color-text-dim)" }}
      >
        Show:
      </span>

      <button
        className="px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer transition-colors"
        style={{
          backgroundColor: !activeUserFilter
            ? "color-mix(in srgb, var(--color-gold) 20%, transparent)"
            : "transparent",
          color: !activeUserFilter ? "var(--color-gold)" : "var(--color-text-muted)",
          border: `1px solid ${!activeUserFilter ? "var(--color-gold)" : "var(--color-border-subtle)"}`,
        }}
        onClick={() => setActiveUserFilter(null)}
      >
        All
      </button>

      {users.map((u) => {
        const isFiltered = activeUserFilter?.includes(u.id) ?? false;
        return (
          <button
            key={u.id}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer transition-colors"
            style={{
              backgroundColor: isFiltered ? `${u.color}20` : "transparent",
              color: isFiltered ? u.color : "var(--color-text-muted)",
              border: `1px solid ${isFiltered ? u.color : "var(--color-border-subtle)"}`,
            }}
            onClick={() => toggleUserFilter(u.id)}
          >
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: u.color }} />
            {u.name}
          </button>
        );
      })}
    </div>
  );
}
