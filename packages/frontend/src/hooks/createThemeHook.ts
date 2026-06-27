import type { ThemeMode } from "@oblivion-labs/arsenal-shared";
import { useCallback, useEffect, useState } from "react";
import { safeLocalStorage } from "../storage/localStorage.js";

export interface ThemeHookConfig {
  storageKey: string;
  defaultTheme?: ThemeMode;
  darkClass?: string;
  metaColors?: Partial<Record<ThemeMode, string>>;
}

export interface ThemeHookResult {
  theme: ThemeMode;
  setTheme: (next: ThemeMode) => void;
  toggleTheme: () => void;
}

/** Create a pub/sub theme hook for Tailwind `class` dark mode. */
export function createThemeHook(config: ThemeHookConfig): () => ThemeHookResult {
  const {
    storageKey,
    defaultTheme = "light",
    darkClass = "dark",
    metaColors = {},
  } = config;

  const subscribers = new Set<(theme: ThemeMode) => void>();

  function readStored(): ThemeMode | null {
    const value = safeLocalStorage.readString(storageKey, "");
    return value === "light" || value === "dark" ? value : null;
  }

  function applyTheme(theme: ThemeMode): void {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add(darkClass);
    } else {
      root.classList.remove(darkClass);
    }
    const meta = document.querySelector('meta[name="theme-color"]');
    const color = metaColors[theme];
    if (meta && color) {
      meta.setAttribute("content", color);
    }
  }

  function detectInitial(): ThemeMode {
    if (typeof window === "undefined") return defaultTheme;
    return readStored() ?? defaultTheme;
  }

  return function useTheme(): ThemeHookResult {
    const [theme, setThemeState] = useState<ThemeMode>(detectInitial);

    useEffect(() => {
      applyTheme(theme);
      const cb = (t: ThemeMode) => setThemeState(t);
      subscribers.add(cb);
      return () => {
        subscribers.delete(cb);
      };
    }, [theme]);

    const setTheme = useCallback((next: ThemeMode) => {
      safeLocalStorage.writeString(storageKey, next);
      applyTheme(next);
      setThemeState(next);
      subscribers.forEach((cb) => cb(next));
    }, []);

    const toggleTheme = useCallback(() => {
      setTheme(theme === "dark" ? "light" : "dark");
    }, [theme, setTheme]);

    return { theme, setTheme, toggleTheme };
  };
}
