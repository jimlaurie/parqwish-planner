"use client";

import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { useAppStore } from "@/lib/store";

// ==================== TYPES ====================

type ResolvedTheme = "light" | "dark";

interface ThemeContextValue {
  theme: ResolvedTheme;
  preference: "system" | "light" | "dark";
  setPreference: (pref: "system" | "light" | "dark") => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "dark",
  preference: "system",
  setPreference: () => {},
  toggleTheme: () => {},
});

export const useTheme = () => useContext(ThemeContext);

// ==================== HELPERS ====================

function applyThemeToDOM(theme: ResolvedTheme) {
  if (typeof document === "undefined") return;
  const html = document.documentElement;
  html.setAttribute("data-theme", theme);
  html.classList.toggle("dark", theme === "dark");
  html.classList.toggle("light", theme === "light");
}

function resolveTheme(
  pref: "system" | "light" | "dark",
  systemPref: ResolvedTheme
): ResolvedTheme {
  return pref === "system" ? systemPref : pref;
}

// ==================== PROVIDER ====================

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const themePreference = useAppStore((s) => s.themePreference);
  const setThemePreference = useAppStore((s) => s.setThemePreference);
  const [systemPreference, setSystemPreference] = useState<ResolvedTheme>("dark");
  const systemPrefRef = useRef<ResolvedTheme>("dark");

  // Detect system preference
  useEffect(() => {
    if (typeof window === "undefined") return;

    const mq = window.matchMedia("(prefers-color-scheme: light)");
    const detected: ResolvedTheme = mq.matches ? "light" : "dark";
    setSystemPreference(detected);
    systemPrefRef.current = detected;

    const handler = (e: MediaQueryListEvent) => {
      const next: ResolvedTheme = e.matches ? "light" : "dark";
      setSystemPreference(next);
      systemPrefRef.current = next;
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Resolve the actual theme
  const resolvedTheme = resolveTheme(themePreference, systemPreference);

  // Apply theme to DOM on every render where it could have changed
  useEffect(() => {
    applyThemeToDOM(resolvedTheme);
  }, [resolvedTheme]);

  // Also subscribe to the Zustand store directly — this catches
  // hydration and any changes that don't trigger a React re-render
  useEffect(() => {
    const unsub = useAppStore.subscribe((state) => {
      const resolved = resolveTheme(state.themePreference, systemPrefRef.current);
      applyThemeToDOM(resolved);
    });
    return unsub;
  }, []);

  const toggleTheme = useCallback(() => {
    const current = resolveTheme(
      useAppStore.getState().themePreference,
      systemPrefRef.current
    );
    const next: ResolvedTheme = current === "dark" ? "light" : "dark";
    setThemePreference(next);
    // Apply immediately — don't wait for React render cycle
    applyThemeToDOM(next);
  }, [setThemePreference]);

  const setPreference = useCallback(
    (pref: "system" | "light" | "dark") => {
      setThemePreference(pref);
      applyThemeToDOM(resolveTheme(pref, systemPrefRef.current));
    },
    [setThemePreference]
  );

  return (
    <ThemeContext.Provider
      value={{
        theme: resolvedTheme,
        preference: themePreference,
        setPreference,
        toggleTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}
