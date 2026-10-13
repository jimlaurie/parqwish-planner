"use client";

// ==================== NEW TRIP MENU ====================
// The "+ New Trip" button's menu: Quick Trip (one click, from the starred
// default template or blank, dated today), From Template (pick one), and Full
// Detail (the New Trip form, then the trip editor). Used by the trip sidebar
// (opens upward) and the no-trips welcome card (opens downward). Drawn with
// fixed positioning from the trigger's position, so a scrolling sidebar
// can't clip it.

import { useCallback, useEffect, useRef, useState, type ReactNode, type Ref } from "react";
import { motion, AnimatePresence } from "framer-motion";

export interface NewTripActions {
  /** The starred default template's name, or null when none is starred. */
  defaultTemplateName: string | null;
  templateCount: number;
  onQuickTrip: () => void;
  onFromTemplate: () => void;
  onFullDetail: () => void;
}

interface TriggerProps {
  ref: Ref<HTMLButtonElement>;
  onClick: () => void;
  "aria-haspopup": "menu";
  "aria-expanded": boolean;
}

interface NewTripMenuProps extends NewTripActions {
  placement: "up" | "down";
  /** Renders the button that opens the menu, spreading these props onto it. */
  trigger: (props: TriggerProps) => ReactNode;
}

interface MenuItem {
  id: string;
  icon: string;
  label: string;
  detail: string;
  disabled?: boolean;
  run: () => void;
}

const MENU_WIDTH = 280;

function menuItems(a: NewTripActions): MenuItem[] {
  return [
    {
      id: "quick", icon: "⚡", label: "Quick Trip", run: a.onQuickTrip,
      detail: a.defaultTemplateName ? `From “${a.defaultTemplateName}”, starting today` : "Blank, starting today",
    },
    {
      id: "template", icon: "\u{1F4CB}", label: "From Template", run: a.onFromTemplate, disabled: a.templateCount === 0,
      detail: a.templateCount === 0
        ? "No templates yet (save one from a trip’s editor)"
        : `Choose from your ${a.templateCount} template${a.templateCount === 1 ? "" : "s"}`,
    },
    { id: "full", icon: "\u{1F4DD}", label: "Full Detail", run: a.onFullDetail, detail: "Name and dates first, then everything else" },
  ];
}

/** Where to draw the menu: beside the trigger, kept on screen. */
function menuPosition(trigger: DOMRect, placement: "up" | "down"): React.CSSProperties {
  const width = Math.max(trigger.width, MENU_WIDTH);
  const left = Math.max(8, Math.min(trigger.left, window.innerWidth - width - 8));
  return placement === "up"
    ? { left, width, bottom: window.innerHeight - trigger.top + 6 }
    : { left, width, top: trigger.bottom + 6 };
}

export default function NewTripMenu({ placement, trigger, ...actions }: NewTripMenuProps) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<React.CSSProperties>({});
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const items = menuItems(actions);

  const close = useCallback((refocus: boolean) => {
    setOpen(false);
    if (refocus) triggerRef.current?.focus();
  }, []);

  const toggle = () => {
    if (open) { close(false); return; }
    if (triggerRef.current) setPosition(menuPosition(triggerRef.current.getBoundingClientRect(), placement));
    setOpen(true);
  };

  useMenuDismissal(open, menuRef, triggerRef, close);

  // Focus the first choice that can be used when the menu opens.
  useEffect(() => {
    if (!open) return;
    const first = menuRef.current?.querySelector<HTMLButtonElement>("[role=menuitem]:not([disabled])");
    first?.focus();
  }, [open]);

  const choose = (item: MenuItem) => {
    if (item.disabled) return;
    close(false);
    item.run();
  };

  return (
    <>
      {trigger({ ref: triggerRef, onClick: toggle, "aria-haspopup": "menu", "aria-expanded": open })}
      <AnimatePresence>
        {open && (
          <motion.div
            ref={menuRef}
            role="menu"
            aria-label="New trip"
            onKeyDown={(e) => moveFocus(e, menuRef.current)}
            className="fixed z-[100] rounded-xl shadow-2xl overflow-hidden border"
            style={{ ...position, backgroundColor: "var(--color-bg-card)", borderColor: "var(--color-border-default)" }}
            initial={{ opacity: 0, y: placement === "up" ? 6 : -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: placement === "up" ? 6 : -6 }}
            transition={{ duration: 0.12 }}
          >
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                role="menuitem"
                disabled={item.disabled}
                onClick={() => choose(item)}
                className="w-full flex items-start gap-3 px-4 py-3 text-left cursor-pointer transition-colors
                           hover:bg-[var(--color-surface-hover)] focus-visible:bg-[var(--color-surface-hover)] focus:outline-none
                           disabled:cursor-default disabled:opacity-50 disabled:hover:bg-transparent"
              >
                <span aria-hidden className="text-lg leading-6">{item.icon}</span>
                <span className="flex flex-col">
                  <span className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>{item.label}</span>
                  <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>{item.detail}</span>
                </span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ==================== KEYBOARD AND DISMISSAL ====================

/** Arrow keys, Home and End move between the menu's usable choices. */
function moveFocus(e: React.KeyboardEvent, menu: HTMLElement | null) {
  if (!menu || !["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)) return;
  e.preventDefault();
  const choices = [...menu.querySelectorAll<HTMLButtonElement>("[role=menuitem]:not([disabled])")];
  if (!choices.length) return;
  const at = choices.indexOf(document.activeElement as HTMLButtonElement);
  const next =
    e.key === "Home" ? 0
    : e.key === "End" ? choices.length - 1
    : e.key === "ArrowDown" ? (at + 1) % choices.length
    : (at - 1 + choices.length) % choices.length;
  choices[next].focus();
}

/** Closes the menu on Escape (back to the button), Tab, a click elsewhere, or scrolling/resizing. */
function useMenuDismissal(
  open: boolean,
  menuRef: React.RefObject<HTMLDivElement | null>,
  triggerRef: React.RefObject<HTMLButtonElement | null>,
  close: (refocus: boolean) => void,
) {
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      const target = e.target as Node;
      if (menuRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      close(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close(true);
      else if (e.key === "Tab") close(false);
    };
    const onMove = (e: Event) => {
      if (e.target instanceof Node && menuRef.current?.contains(e.target)) return;
      close(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onMove);
    window.addEventListener("scroll", onMove, true);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onMove);
      window.removeEventListener("scroll", onMove, true);
    };
  }, [open, menuRef, triggerRef, close]);
}
