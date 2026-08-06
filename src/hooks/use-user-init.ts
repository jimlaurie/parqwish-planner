"use client";

import { useEffect, useRef } from "react";
import { ensureDefaultUser } from "./use-users";

// ==================== USER INIT HOOK ====================
// Ensures the primary user exists on first app load.
// Safe to call multiple times — only runs once per mount.

export function useUserInit(): void {
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    ensureDefaultUser().catch((err) =>
      console.error("[useUserInit] Failed to ensure default user:", err)
    );
  }, []);
}
