"use client";

// ==================== SHARE PAGE ====================
// Where a page shared to the Planner lands: the installed app's share target
// (public/manifest.json), or a /share?title=…&text=…&url=… link from a
// bookmarklet or Shortcut. The choices match Pal's share sheet (Wishes,
// Collection, Shopping, Outfits, Gear, Sundries, @shared/share-targets) plus
// Dining; the site suggests one. "Add" saves the item (src/lib/share-save.ts)
// and opens its editor on the Catalog or Collection page (src/lib/pending-share.ts).
// With nothing shared it explains how to send pages here (ShareHelp: a
// bookmarklet, an iPhone/iPad Shortcut, the installed app's Share entry).

import { Suspense, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { requestShareOpen } from "@/lib/pending-share";
import { plannerShareChoices, plannerSuggestedDestination, saveSharedPage, type PlannerShareDestination } from "@/lib/share-save";
import { COLLECTIONS_AVAILABLE } from "@/lib/feature-flags";
import { useAppStore } from "@/lib/store";
import { sharedTitle } from "@shared/share-targets";
import ShareHelp from "@/components/share/ShareHelp";

const CHOICES = plannerShareChoices(COLLECTIONS_AVAILABLE);

/** Where each choice's editor is. */
function routeFor(dest: PlannerShareDestination): string {
  return dest === "collection" ? "/collection" : "/catalog";
}

/** A share target sometimes puts the address in `text` (Android); take it from there when `url` is empty. */
function sharedPage(params: URLSearchParams) {
  const title = params.get("title") ?? "";
  let text = params.get("text") ?? "";
  let url = params.get("url") ?? "";
  if (!url) {
    const found = /https?:\/\/\S+/.exec(text)?.[0];
    if (found) { url = found; text = text.replace(found, "").trim(); }
  }
  return { title, text, url };
}

function ShareSelector() {
  const params = useSearchParams();
  const router = useRouter();
  const currentUserId = useAppStore((s) => s.currentUserId);
  const page = useMemo(() => sharedPage(new URLSearchParams(params.toString())), [params]);
  const [name, setName] = useState(() => sharedTitle(page.title, page));
  const [selected, setSelected] = useState<PlannerShareDestination>(() => plannerSuggestedDestination(page.url, CHOICES));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nothingShared = !page.title && !page.text && !page.url;

  async function handleAdd() {
    setSaving(true);
    setError(null);
    try {
      const itemId = await saveSharedPage(selected, page, name.trim(), currentUserId);
      requestShareOpen({ dest: selected, itemId });
      router.push(routeFor(selected));
    } catch (err) {
      console.error("[share] save failed:", err);
      setError(err instanceof Error && err.message.includes("needs a name") ? "Give it a name first." : "Couldn't save it. Try again.");
      setSaving(false);
    }
  }

  // Opened with nothing shared (or from Help): how to send pages here
  if (nothingShared) return <ShareHelp />;

  return (
    <div className="max-w-md mx-auto px-4 py-8">
      <h1 className="text-xl font-bold mb-1 text-center" style={{ color: "var(--color-heading)" }}>Add to ParQwish</h1>
      {page.url && (
        <p className="text-sm text-center mb-5 truncate" style={{ color: "var(--color-text-muted)" }}>
          {page.url.replace(/^https?:\/\//i, "").split(/[/?#]/)[0]}
        </p>
      )}

      <label className="block text-xs font-semibold uppercase tracking-wide mb-1" htmlFor="share-name"
        style={{ color: "var(--color-text-muted)" }}>Name</label>
      <input id="share-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={200}
        className="w-full mb-5 px-3 py-2 rounded-xl text-sm"
        style={{ backgroundColor: "var(--color-bg-card)", color: "var(--color-text-primary)", border: "1px solid var(--color-border-default)" }} />

      <fieldset className="mb-6">
        <legend className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "var(--color-text-muted)" }}>Save to</legend>
        <div className="grid grid-cols-2 gap-2">
          {CHOICES.map((c) => {
            const active = selected === c.id;
            return (
              <button key={c.id} type="button" onClick={() => setSelected(c.id)} aria-pressed={active}
                className="flex items-center gap-2 px-3 py-3 rounded-xl text-sm font-semibold text-left cursor-pointer transition-colors duration-150"
                style={{
                  backgroundColor: active ? "color-mix(in srgb, var(--color-gold) 12%, transparent)" : "var(--color-bg-card)",
                  border: `2px solid ${active ? "var(--color-gold)" : "transparent"}`,
                  color: "var(--color-text-primary)",
                }}>
                <span className="text-xl" aria-hidden="true">{c.icon}</span>{c.label}
              </button>
            );
          })}
        </div>
      </fieldset>

      {error && <p role="alert" className="text-sm mb-3 text-center" style={{ color: "var(--color-error)" }}>{error}</p>}

      <div className="flex gap-3">
        <button type="button" onClick={() => router.push("/")}
          className="flex-1 py-3 rounded-xl text-sm font-medium cursor-pointer"
          style={{ backgroundColor: "var(--color-surface-raised)", color: "var(--color-text-muted)" }}>
          Cancel
        </button>
        <button type="button" onClick={handleAdd} disabled={saving || !name.trim()}
          className="flex-1 py-3 rounded-xl text-sm font-semibold cursor-pointer disabled:opacity-40"
          style={{ backgroundColor: "var(--color-gold)", color: "var(--color-bg-deep)" }}>
          {saving ? "Adding…" : "Add"}
        </button>
      </div>
    </div>
  );
}

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
