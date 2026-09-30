// ==================== UNDO TOAST STORE ====================
// Minimal module-level store for a single "did X · Undo" toast, read by
// <UndoToastHost /> (mounted once in the (app) layout). Any page can call
// showUndoToast() after a reversible action instead of asking the user to
// confirm up front. Only one toast is shown at a time — a new one replaces
// the current one, since the older action's undo window has effectively
// passed once the user has moved on to another action.

import { useSyncExternalStore } from "react";

export interface UndoToast {
  id: number;
  message: string;
  onUndo: () => Promise<void> | void;
}

const DISMISS_AFTER_MS = 6000;

let current: UndoToast | null = null;
let nextId = 1;
let dismissTimer: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<() => void>();

function emit(): void {
  listeners.forEach((l) => l());
}

export function showUndoToast(message: string, onUndo: UndoToast["onUndo"]): void {
  if (dismissTimer) clearTimeout(dismissTimer);
  const toast: UndoToast = { id: nextId++, message, onUndo };
  current = toast;
  emit();
  dismissTimer = setTimeout(() => dismissUndoToast(toast.id), DISMISS_AFTER_MS);
}

/** Dismisses the toast, but only if it's still the one identified by `id` —
 *  so a stale timer can't close a newer toast. */
export function dismissUndoToast(id: number): void {
  if (current?.id !== id) return;
  if (dismissTimer) clearTimeout(dismissTimer);
  dismissTimer = null;
  current = null;
  emit();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useUndoToast(): UndoToast | null {
  return useSyncExternalStore(subscribe, () => current, () => null);
}
