"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import db from "@/lib/db";
import { useAppStore } from "@/lib/store";
import {
  AVAILABLE_MODELS,
  DEFAULT_MODEL_ID,
  getEngine,
  isWebGPUSupported,
  type LoadProgress,
} from "@/lib/web-llm";
import { DEFAULT_AI_SYSTEM_PROMPT } from "@shared/types/ai-context";

// ==================== TYPES ====================

interface Message {
  role: "user" | "assistant";
  content: string;
}

// ==================== CONTEXT ASSEMBLY ====================

function buildSystemPrompt(wishLines: string[]): string {
  const wishSection =
    wishLines.length > 0
      ? `\n\nUSER'S WISH LIST (${wishLines.length} items):\n${wishLines.join("\n")}`
      : "\n\nNo wishes in current trip yet.";

  return DEFAULT_AI_SYSTEM_PROMPT + wishSection;
}

// ==================== COMPONENT ====================

export default function WebLLMChat() {
  const currentTripId = useAppStore((s) => s.currentTripId);

  const [selectedModelId, setSelectedModelId] = useState(DEFAULT_MODEL_ID);
  const [loadProgress, setLoadProgress] = useState<LoadProgress | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [showContext, setShowContext] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<Awaited<ReturnType<typeof getEngine>> | null>(null);

  // Pull current trip's wishes from Dexie
  const wishes = useLiveQuery(async () => {
    if (!currentTripId) return [];
    const selections = await db.tripWishSelections
      .where("tripId")
      .equals(currentTripId)
      .toArray();
    const wishIds = selections.map((s) => s.wishId);
    const wishList = await db.wishes.bulkGet(wishIds);
    return wishList
      .filter(Boolean)
      .map((w) => ({
        title: w!.title,
        tags: w!.tags,
        priority: w!.priority,
        park: w!.park,
        land: w!.land,
        maxWaitTime: w!.maxWaitTime,
        completed: selections.find((s) => s.wishId === w!.id)?.completed ?? false,
      }));
  }, [currentTripId]);

  const wishLines = (wishes ?? []).map((w) => {
    const parts = [`• ${w.title}`];
    if (w.tags?.length) parts.push(`[${w.tags.join(", ")}]`);
    if (w.priority) parts.push(`Priority: ${w.priority}`);
    if (w.park) parts.push(`@ ${w.park}${w.land ? ` / ${w.land}` : ""}`);
    if (w.maxWaitTime) parts.push(`Max wait: ${w.maxWaitTime} min`);
    if (w.completed) parts.push("✓ done");
    return parts.join(" ");
  });

  const systemPrompt = buildSystemPrompt(wishLines);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isGenerating]);

  const handleLoad = useCallback(async () => {
    setError(null);
    setIsLoading(true);
    setLoadProgress({ progress: 0, text: "Initialising…" });

    try {
      const engine = await getEngine(selectedModelId, (p) => setLoadProgress(p));
      engineRef.current = engine;
      setIsLoaded(true);
      setMessages([]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load model");
    } finally {
      setIsLoading(false);
      setLoadProgress(null);
    }
  }, [selectedModelId]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || !engineRef.current || isGenerating) return;

    const userMsg: Message = { role: "user", content: text };
    const updatedHistory = [...messages, userMsg];
    setMessages(updatedHistory);
    setInput("");
    setIsGenerating(true);
    setError(null);

    // Placeholder for streaming response
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    try {
      const stream = await engineRef.current.chat.completions.create({
        messages: [
          { role: "system", content: systemPrompt },
          ...updatedHistory.map((m) => ({ role: m.role, content: m.content })),
        ],
        stream: true,
        temperature: 0.7,
        max_tokens: 800,
      });

      let response = "";
      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content ?? "";
        response += delta;
        setMessages((prev) => [
          ...prev.slice(0, -1),
          { role: "assistant", content: response },
        ]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed");
      setMessages((prev) => prev.slice(0, -1)); // remove empty assistant msg
    } finally {
      setIsGenerating(false);
    }
  }, [input, messages, isGenerating, systemPrompt]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const webGPUOk = isWebGPUSupported();

  // ==================== RENDER ====================

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        background: "var(--color-bg-deep)",
        color: "var(--color-text-primary)",
        fontFamily: "-apple-system, sans-serif",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "16px 20px",
          borderBottom: "1px solid var(--color-border-subtle)",
          display: "flex",
          alignItems: "center",
          gap: 12,
          background: "var(--color-bg-card)",
        }}
      >
        <span style={{ fontSize: 20 }}>🤖</span>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>ParQ Wish AI — Local</div>
          <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>
            Runs entirely in your browser · no data sent to servers
          </div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
          {/* WebGPU status */}
          <span
            style={{
              fontSize: 11,
              padding: "2px 8px",
              borderRadius: 10,
              background: webGPUOk
                ? "color-mix(in srgb, var(--color-success) 15%, transparent)"
                : "color-mix(in srgb, var(--color-error) 15%, transparent)",
              color: webGPUOk ? "var(--color-success)" : "var(--color-error)",
              border: `1px solid ${webGPUOk ? "var(--color-success)" : "var(--color-error)"}`,
            }}
          >
            WebGPU {webGPUOk ? "✓" : "✗"}
          </span>
        </div>
      </div>

      {/* WebGPU not supported */}
      {!webGPUOk && (
        <div
          style={{
            margin: 20,
            padding: 16,
            borderRadius: 8,
            background: "color-mix(in srgb, var(--color-error) 10%, transparent)",
            border: "1px solid var(--color-error)",
            color: "var(--color-error)",
            fontSize: 13,
          }}
        >
          WebGPU is not available in this browser. Try Safari 18+ or Chrome on macOS.
        </div>
      )}

      {/* Model selector + load */}
      {!isLoaded && webGPUOk && (
        <div
          style={{
            padding: 20,
            borderBottom: "1px solid var(--color-border-subtle)",
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-secondary)" }}>
            Choose a model
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {AVAILABLE_MODELS.map((m) => (
              <label
                key={m.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 14px",
                  borderRadius: 8,
                  border: `1px solid ${selectedModelId === m.id ? "var(--color-gold)" : "var(--color-border-subtle)"}`,
                  background:
                    selectedModelId === m.id
                      ? "color-mix(in srgb, var(--color-gold) 8%, transparent)"
                      : "var(--color-bg-card)",
                  cursor: "pointer",
                  fontSize: 13,
                }}
              >
                <input
                  type="radio"
                  name="model"
                  value={m.id}
                  checked={selectedModelId === m.id}
                  onChange={() => setSelectedModelId(m.id)}
                  style={{ accentColor: "var(--color-gold)" }}
                />
                <div>
                  <div style={{ fontWeight: 600 }}>
                    {m.label}{" "}
                    <span style={{ color: "var(--color-text-muted)", fontWeight: 400 }}>
                      ({m.sizeGB} GB)
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>
                    {m.description}
                  </div>
                </div>
              </label>
            ))}
          </div>

          {/* Load progress */}
          {isLoading && loadProgress && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div
                style={{
                  height: 6,
                  borderRadius: 3,
                  background: "var(--color-border-subtle)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${Math.round(loadProgress.progress * 100)}%`,
                    background: "var(--color-gold)",
                    borderRadius: 3,
                    transition: "width 0.3s ease",
                  }}
                />
              </div>
              <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>
                {loadProgress.text}
              </div>
            </div>
          )}

          <button
            onClick={handleLoad}
            disabled={isLoading}
            style={{
              padding: "10px 20px",
              borderRadius: 8,
              border: "none",
              background: isLoading ? "var(--color-border-subtle)" : "var(--color-gold)",
              color: isLoading ? "var(--color-text-muted)" : "#1a1a2e",
              fontWeight: 700,
              fontSize: 13,
              cursor: isLoading ? "not-allowed" : "pointer",
              alignSelf: "flex-start",
            }}
          >
            {isLoading ? "Downloading model…" : "Load Model"}
          </button>

          <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>
            Model is downloaded once and cached in your browser. First load may take a minute.
          </div>
        </div>
      )}

      {/* Chat area */}
      {isLoaded && (
        <>
          {/* Context toggle */}
          <div
            style={{
              padding: "8px 16px",
              borderBottom: "1px solid var(--color-border-subtle)",
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 11,
              color: "var(--color-text-muted)",
            }}
          >
            <span>
              {wishLines.length} wishes in context
              {currentTripId ? "" : " (no trip selected)"}
            </span>
            <button
              onClick={() => setShowContext((v) => !v)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--color-gold)",
                fontSize: 11,
                padding: 0,
              }}
            >
              {showContext ? "hide context" : "show context"}
            </button>
            <button
              onClick={() => { setMessages([]); setError(null); }}
              style={{
                marginLeft: "auto",
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--color-text-muted)",
                fontSize: 11,
                padding: 0,
              }}
            >
              clear chat
            </button>
          </div>

          {showContext && (
            <pre
              style={{
                margin: "0",
                padding: "12px 16px",
                fontSize: 10,
                color: "var(--color-text-muted)",
                background: "var(--color-surface-sunken)",
                borderBottom: "1px solid var(--color-border-subtle)",
                overflowX: "auto",
                maxHeight: 180,
                overflowY: "auto",
                whiteSpace: "pre-wrap",
              }}
            >
              {systemPrompt}
            </pre>
          )}

          {/* Messages */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "16px",
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            {messages.length === 0 && (
              <div
                style={{
                  textAlign: "center",
                  color: "var(--color-text-dim)",
                  fontSize: 13,
                  marginTop: 40,
                }}
              >
                Ask anything about your Disneyland trip &mdash; &ldquo;What should we do first?&rdquo;,
                &ldquo;Which rides are best for kids?&rdquo;, &ldquo;Tips for a busy Saturday?&rdquo;
              </div>
            )}

            {messages.map((msg, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
                }}
              >
                <div
                  style={{
                    maxWidth: "80%",
                    padding: "10px 14px",
                    borderRadius: msg.role === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                    background:
                      msg.role === "user"
                        ? "color-mix(in srgb, var(--color-gold) 20%, transparent)"
                        : "var(--color-bg-card)",
                    border: "1px solid var(--color-border-subtle)",
                    fontSize: 13,
                    lineHeight: 1.6,
                    whiteSpace: "pre-wrap",
                    color:
                      msg.role === "user"
                        ? "var(--color-text-primary)"
                        : "var(--color-text-primary)",
                  }}
                >
                  {msg.content}
                  {msg.role === "assistant" && msg.content === "" && (
                    <span style={{ opacity: 0.4 }}>▌</span>
                  )}
                </div>
              </div>
            ))}

            {error && (
              <div
                style={{
                  padding: "10px 14px",
                  borderRadius: 8,
                  background: "color-mix(in srgb, var(--color-error) 10%, transparent)",
                  border: "1px solid var(--color-error)",
                  color: "var(--color-error)",
                  fontSize: 12,
                }}
              >
                {error}
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div
            style={{
              padding: "12px 16px",
              borderTop: "1px solid var(--color-border-subtle)",
              display: "flex",
              gap: 8,
              background: "var(--color-bg-card)",
            }}
          >
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about your trip… (Enter to send, Shift+Enter for newline)"
              disabled={isGenerating}
              rows={2}
              style={{
                flex: 1,
                padding: "10px 12px",
                borderRadius: 8,
                border: "1px solid var(--color-border-input)",
                background: "var(--color-surface-sunken)",
                color: "var(--color-text-primary)",
                fontSize: 13,
                resize: "none",
                outline: "none",
                fontFamily: "inherit",
                lineHeight: 1.5,
              }}
            />
            <button
              onClick={handleSend}
              disabled={isGenerating || !input.trim()}
              style={{
                padding: "10px 16px",
                borderRadius: 8,
                border: "none",
                background:
                  isGenerating || !input.trim()
                    ? "var(--color-border-subtle)"
                    : "var(--color-gold)",
                color:
                  isGenerating || !input.trim() ? "var(--color-text-muted)" : "#1a1a2e",
                fontWeight: 700,
                fontSize: 13,
                cursor: isGenerating || !input.trim() ? "not-allowed" : "pointer",
                alignSelf: "flex-end",
                minWidth: 64,
              }}
            >
              {isGenerating ? "…" : "Send"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
