"use client";

// ==================== USE PHOTO PASTE ====================
// Hands a pasted image (⌘V / Ctrl+V) to the open editor's photos. Only the most
// recently opened PhotoPicker takes it, so a picker under another dialog
// doesn't; one whose dialog is fading out (`enabled` false) doesn't either.
// Rules for which pastes count: src/lib/photo-paste.ts.

import { useEffect, useRef } from "react";
import { pastedImageFiles, pasteIsForTextField } from "@/lib/photo-paste";

type Handler = { current: (files: File[]) => void };

const handlers: Handler[] = [];

function onDocumentPaste(event: ClipboardEvent): void {
  const top = handlers[handlers.length - 1];
  if (!top || pasteIsForTextField(event.target, event.clipboardData)) return;
  const files = pastedImageFiles(event.clipboardData);
  if (files.length === 0) return;
  event.preventDefault();
  top.current(files);
}

export function usePhotoPaste(onFiles: (files: File[]) => void, enabled: boolean): void {
  const latest = useRef(onFiles);
  useEffect(() => {
    latest.current = onFiles;
  });

  useEffect(() => {
    if (!enabled) return;
    const handler: Handler = { current: (files) => latest.current(files) };
    handlers.push(handler);
    if (handlers.length === 1) document.addEventListener("paste", onDocumentPaste);
    return () => {
      const i = handlers.indexOf(handler);
      if (i >= 0) handlers.splice(i, 1);
      if (handlers.length === 0) document.removeEventListener("paste", onDocumentPaste);
    };
  }, [enabled]);
}
