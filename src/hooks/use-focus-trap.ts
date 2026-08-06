import { useEffect, useRef } from "react";

const FOCUSABLE =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * Traps focus within a container element and handles Escape key.
 * Returns a ref to attach to the modal container.
 */
export function useFocusTrap(isOpen: boolean, onClose: () => void) {
  const containerRef = useRef<HTMLDivElement>(null);
  // Stabilize onClose so the effect doesn't re-run on every render
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Auto-focus first element only when modal opens (not on re-renders)
  const didFocusRef = useRef(false);

  useEffect(() => {
    if (!isOpen) {
      didFocusRef.current = false;
      return;
    }

    const container = containerRef.current;
    if (!container) return;

    // Auto-focus first focusable element only on initial open
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (!didFocusRef.current) {
      didFocusRef.current = true;
      const firstFocusable = container.querySelector<HTMLElement>(FOCUSABLE);
      timer = setTimeout(() => firstFocusable?.focus(), 50);
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onCloseRef.current();
        return;
      }

      if (e.key === "Tab") {
        const focusable = container.querySelectorAll<HTMLElement>(FOCUSABLE);
        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      if (timer) clearTimeout(timer);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return containerRef;
}
