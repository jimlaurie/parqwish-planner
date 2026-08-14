"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import db from "@/lib/db";
import { useAppStore } from "@/lib/store";
import type { PublishData } from "@/hooks/use-publish-data";
import {
  buildAIExportPackage,
  downloadAIExportJSON,
  copyAIExportJSON,
  buildPhotosZip,
  downloadPhotosZip,
  copyPrompt,
  AI_PROMPT_TEMPLATES,
} from "@/lib/ai-export";

const ACCENT = "var(--color-accent-publish)";

interface AIExportPanelProps {
  data: PublishData;
  excludedPhotoIds: Set<string>;
}

type CopyState = "idle" | "copied";

function useCopyFlash(): [CopyState, () => void] {
  const [state, setState] = useState<CopyState>("idle");
  const flash = () => {
    setState("copied");
    setTimeout(() => setState("idle"), 2000);
  };
  return [state, flash];
}

export default function AIExportPanel({ data, excludedPhotoIds }: AIExportPanelProps) {
  const { currentTripId } = useAppStore();
  const [templateId, setTemplateId] = useState(AI_PROMPT_TEMPLATES[0].id);
  const [zipping, setZipping] = useState(false);
  const [jsonCopyState, flashJsonCopy] = useCopyFlash();
  const [promptCopyState, flashPromptCopy] = useCopyFlash();

  const trails = useLiveQuery(
    () => (currentTripId ? db.trails.where("tripId").equals(currentTripId).toArray() : []),
    [currentTripId]
  );

  const photos = data.allPhotos.filter((p) => !excludedPhotoIds.has(p.id));
  const template = AI_PROMPT_TEMPLATES.find((t) => t.id === templateId) ?? AI_PROMPT_TEMPLATES[0];

  const handleCopyJson = async () => {
    const pkg = buildAIExportPackage(data, trails ?? []);
    await copyAIExportJSON(pkg);
    flashJsonCopy();
  };

  const handleDownloadJson = () => {
    const pkg = buildAIExportPackage(data, trails ?? []);
    downloadAIExportJSON(pkg, data.trip.name);
  };

  const handleDownloadZip = async () => {
    setZipping(true);
    try {
      const blob = await buildPhotosZip(data.allPhotos, excludedPhotoIds);
      downloadPhotosZip(blob, data.trip.name);
    } catch (err) {
      console.error("[AIExportPanel] Photo zip failed:", err);
    } finally {
      setZipping(false);
    }
  };

  const handleCopyPrompt = async () => {
    const pkg = buildAIExportPackage(data, trails ?? []);
    await copyPrompt(template, pkg);
    flashPromptCopy();
  };

  const buttonBase =
    "px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer " +
    "transition-colors duration-200 hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed";
  const primaryStyle = { backgroundColor: "var(--color-gold)", color: "var(--color-bg-deep)" };
  const secondaryStyle = {
    color: "var(--color-text-secondary)",
    border: "1px solid var(--color-border-input)",
  };

  return (
    <div className="w-full max-w-4xl mb-8">
      <h2
        className="text-xs font-bold mb-4 uppercase tracking-wider"
        style={{ color: ACCENT }}
      >
        Export for AI
      </h2>

      <div
        className="rounded-xl p-4 flex flex-col gap-4"
        style={{
          backgroundColor: "var(--color-bg-card)",
          border: "1px solid var(--color-border-subtle)",
        }}
      >
        <p className="text-xs" style={{ color: "var(--color-text-dim)" }}>
          Get your trip data in a shape any AI chat can read — paste it into Claude, ChatGPT,
          or whatever you use to draft a recap, captions, or a highlight script. Everything
          stays on your device until you paste or download it yourself.
        </p>

        {/* Trip data */}
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={handleCopyJson} className={buttonBase} style={primaryStyle}>
            {jsonCopyState === "copied" ? "✓ Copied" : "Copy Trip Data"}
          </button>
          <button onClick={handleDownloadJson} className={buttonBase} style={secondaryStyle}>
            Download JSON
          </button>
          {trails && trails.length > 0 && (
            <span className="text-[11px]" style={{ color: "var(--color-text-dim)" }}>
              Includes GPS walking stats from {new Set(trails.map((t) => t.date)).size} day
              {new Set(trails.map((t) => t.date)).size === 1 ? "" : "s"}
            </span>
          )}
        </div>

        {/* Photos zip */}
        {photos.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleDownloadZip}
              disabled={zipping}
              className={buttonBase}
              style={secondaryStyle}
            >
              {zipping ? "Zipping…" : `Download Photos (${photos.length}) as ZIP`}
            </button>
          </div>
        )}

        {/* Prompt template */}
        <div className="flex flex-col gap-2 pt-2" style={{ borderTop: "1px solid var(--color-border-subtle)" }}>
          <label className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: "var(--color-text-secondary)" }}>
            Prompt template
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
              className="text-xs rounded-lg px-3 py-2 cursor-pointer"
              style={{
                backgroundColor: "var(--color-surface-raised)",
                color: "var(--color-text-primary)",
                border: "1px solid var(--color-border-input)",
              }}
            >
              {AI_PROMPT_TEMPLATES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
            <button onClick={handleCopyPrompt} className={buttonBase} style={secondaryStyle}>
              {promptCopyState === "copied" ? "✓ Copied" : "Copy Prompt"}
            </button>
          </div>
          <p className="text-[11px]" style={{ color: "var(--color-text-dim)" }}>
            {template.description}
          </p>
        </div>
      </div>
    </div>
  );
}
