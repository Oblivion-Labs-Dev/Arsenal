'use client';

import { ThemeRevealToggle } from '@arsenal/motion';
import { useCallback, useEffect, useState } from 'react';
import {
  DARK_THEME_STORAGE_KEY,
  THEME_STORAGE_KEY,
  isSiteTheme,
  modeOf,
  themeForMode,
  type SiteTheme,
  type ThemeMode,
} from '@/lib/theme';

function readStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch (error) {
    console.warn('[arsenal] could not save theme preference', error);
  }
}

/** Applies a named theme to <html> and remembers it. Used by the toggle and the ⌘K palette. */
export function applySiteTheme(theme: SiteTheme) {
  document.documentElement.dataset.theme = theme;
  writeStorage(THEME_STORAGE_KEY, theme);
  if (modeOf(theme) === 'dark') writeStorage(DARK_THEME_STORAGE_KEY, theme);
}

function currentTheme(): SiteTheme {
  const attr = document.documentElement.dataset.theme;
  return isSiteTheme(attr) ? attr : 'deep-forge';
}

/** Light/dark switch with the sun-moon morph and circular reveal from @arsenal/motion. */
export function ThemeSwitch({ className }: { className?: string }) {
  const [mode, setMode] = useState<ThemeMode>('dark');

  useEffect(() => {
    const sync = () => setMode(modeOf(currentTheme()));
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });
    return () => observer.disconnect();
  }, []);

  const onThemeChange = useCallback((next: ThemeMode) => {
    applySiteTheme(themeForMode(next, readStorage(DARK_THEME_STORAGE_KEY)));
    setMode(next);
  }, []);

  return (
    <ThemeRevealToggle
      theme={mode}
      onThemeChange={onThemeChange}
      setDocumentTheme={false}
      className={className}
    />
  );
}
