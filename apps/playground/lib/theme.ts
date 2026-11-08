export const THEMES = ['deep-forge', 'obsidian-cyber', 'ivory-graphite'] as const;
export type SiteTheme = (typeof THEMES)[number];
export type ThemeMode = 'light' | 'dark';

/** Same key the @arsenal/ui ThemeToggle uses, so both stay in sync. */
export const THEME_STORAGE_KEY = 'arsenal-theme';
/** Remembers which dark theme to return to (deep-forge or obsidian-cyber). */
export const DARK_THEME_STORAGE_KEY = 'arsenal-theme-dark';

export const DEFAULT_DARK: SiteTheme = 'deep-forge';
export const LIGHT_THEME: SiteTheme = 'ivory-graphite';

export const THEME_LABELS: Record<SiteTheme, string> = {
  'deep-forge': 'Deep forge (dark)',
  'obsidian-cyber': 'Obsidian cyber (dark)',
  'ivory-graphite': 'Ivory graphite (light)',
};

export function isSiteTheme(value: unknown): value is SiteTheme {
  return typeof value === 'string' && (THEMES as readonly string[]).includes(value);
}

export function modeOf(theme: SiteTheme): ThemeMode {
  return theme === LIGHT_THEME ? 'light' : 'dark';
}

/** The theme a light/dark switch lands on: light is ivory-graphite, dark is the last dark theme. */
export function themeForMode(mode: ThemeMode, lastDark: unknown): SiteTheme {
  if (mode === 'light') return LIGHT_THEME;
  return isSiteTheme(lastDark) && modeOf(lastDark) === 'dark' ? lastDark : DEFAULT_DARK;
}

/**
 * Inline script for <head>: applies the saved theme before first paint so there is no flash.
 * Kept tiny and dependency-free; invalid stored values fall back to the server default.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY,
)});if(${JSON.stringify(THEMES)}.indexOf(t)>-1)document.documentElement.setAttribute('data-theme',t);}catch(e){}})();`;
