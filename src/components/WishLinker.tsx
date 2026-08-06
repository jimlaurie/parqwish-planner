"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import db, { type Wish } from "@/lib/db";
import { getTagIcon } from "@/lib/constants";

interface WishLinkerProps {
  linkedWishIds: string[];
  onChange: (ids: string[]) => void;
}

export default function WishLinker({ linkedWishIds, onChange }: WishLinkerProps) {
  const [showSearch, setShowSearch] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  // Click-outside to dismiss search
  useEffect(() => {
    if (!showSearch) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSearch(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showSearch]);

  // Resolve linked wishes
  const linkedWishes = useLiveQuery(
    async () => {
      if (linkedWishIds.length === 0) return [];
      return db.wishes
        .bulkGet(linkedWishIds)
        .then((items) => items.filter((i): i is Wish => !!i));
    },
    [linkedWishIds]
  );

  // Search all catalog wishes
  const searchResults = useLiveQuery(
    async () => {
      if (!showSearch) return [];
      return db.wishes.toArray();
    },
    [showSearch]
  );

  const filteredResults = useMemo(() => {
    if (!searchResults) return [];
    const excludeSet = new Set(linkedWishIds);
    let results = searchResults.filter((w) => !excludeSet.has(w.id));
    if (search.trim()) {
      const q = search.toLowerCase();
      results = results.filter(
        (w) =>
          w.title.toLowerCase().includes(q) ||
          w.tags.some((t) => t.toLowerCase().includes(q))
      );
    }
    return results.slice(0, 10);
  }, [searchResults, linkedWishIds, search]);

  const handleLink = (wishId: string) => {
    onChange([...linkedWishIds, wishId]);
  };

  const handleUnlink = (wishId: string) => {
    onChange(linkedWishIds.filter((id) => id !== wishId));
  };

  return (
    <div ref={containerRef}>
      {/* Linked wish chips */}
      {linkedWishes && linkedWishes.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {linkedWishes.map((wish) => (
            <span
              key={wish.id}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium"
              style={{
                backgroundColor: "color-mix(in srgb, var(--color-gold) 12%, transparent)",
                color: "var(--color-gold)",
              }}
            >
              {wish.tags[0] ? getTagIcon(wish.tags[0]) : "\u2B50"}{" "}
              {wish.title}
              <button
                onClick={() => handleUnlink(wish.id)}
                className="ml-0.5 hover:opacity-70 cursor-pointer"
                style={{ color: "var(--color-error)" }}
              >
                {"\u2715"}
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Link button or search */}
      {showSearch ? (
        <div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search wishes..."
            className="w-full rounded-lg px-3 py-2 text-sm outline-none
                       border border-white/10 focus:border-[var(--color-gold)]
                       transition-colors duration-200 mb-2"
            style={{
              backgroundColor: "var(--color-bg-deep)",
              color: "var(--color-text-primary)",
            }}
            autoFocus
          />

          {filteredResults.length > 0 && (
            <div
              className="max-h-40 overflow-y-auto rounded-lg border border-white/10"
              style={{ backgroundColor: "var(--color-bg-deep)" }}
            >
              {filteredResults.map((wish) => (
                <button
                  key={wish.id}
                  onClick={() => handleLink(wish.id)}
                  className="w-full text-left px-3 py-2 hover:bg-white/5 cursor-pointer
                             transition-colors flex items-center gap-2 text-sm"
                >
                  <span className="text-xs">
                    {wish.tags[0] ? getTagIcon(wish.tags[0]) : "\u2B50"}
                  </span>
                  <span
                    className="flex-1 min-w-0 truncate"
                    style={{ color: "var(--color-text-primary)" }}
                  >
                    {wish.title}
                  </span>
                  <span
                    className="text-[10px] ml-auto flex gap-0.5"
                    style={{ color: "var(--color-text-dim)" }}
                  >
                    {wish.tags.slice(0, 2).map((t) => (
                      <span key={t}>{getTagIcon(t)}</span>
                    ))}
                  </span>
                </button>
              ))}
            </div>
          )}

          {filteredResults.length === 0 && search.trim() && (
            <p
              className="text-xs py-2 text-center"
              style={{ color: "var(--color-text-dim)" }}
            >
              No wishes found
            </p>
          )}

          <button
            onClick={() => {
              setShowSearch(false);
              setSearch("");
            }}
            className="mt-2 text-xs cursor-pointer hover:opacity-70 transition-opacity"
            style={{ color: "var(--color-text-muted)" }}
          >
            Done linking
          </button>
        </div>
      ) : (
        <button
          onClick={() => setShowSearch(true)}
          className="text-xs cursor-pointer hover:opacity-80 transition-opacity px-3 py-1.5
                     rounded-full border border-dashed border-white/20"
          style={{ color: "var(--color-text-muted)" }}
        >
          + Link wish
        </button>
      )}
    </div>
  );
}
