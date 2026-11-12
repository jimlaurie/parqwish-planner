"use client";

import { motion, useIsPresent, type HTMLMotionProps } from "framer-motion";

/**
 * The full-screen backdrop of a dialog shown with
 * `<AnimatePresence>{visible && <DialogOverlay …>…</DialogOverlay>}</AnimatePresence>`.
 *
 * After the dialog closes, AnimatePresence keeps it on the page, invisible,
 * while it fades out. Then it takes no clicks and is hidden from assistive
 * tech: otherwise it swallowed the next click (a tile under it didn't open)
 * and the old dialog's buttons could still be pressed, acting on the previous
 * item (found in the Collection editor, 12 Nov 2026;
 * tests/e2e/collection.spec.ts and dialogs.spec.ts).
 *
 * Must be the direct child of AnimatePresence (it reads useIsPresent).
 */
export default function DialogOverlay({ style, ...props }: HTMLMotionProps<"div">) {
  const present = useIsPresent();
  return (
    <motion.div
      {...props}
      style={present ? style : { ...style, pointerEvents: "none" }}
      aria-hidden={present ? props["aria-hidden"] : true}
      inert={present ? undefined : true}
    />
  );
}
