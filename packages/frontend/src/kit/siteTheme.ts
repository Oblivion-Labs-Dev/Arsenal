/**
 * Attribute-based light/dark theming (from amsborse.github.io `theme/theme.ts`).
 * Complements `createThemeHook` (class-based): this sets `data-theme` plus `color-scheme`
 * so native controls and scrollbars follow, and updates `<meta name="theme-color">`.
 */

export type SiteTheme = 'light' | 'dark';

export interface ApplySiteThemeOptions {
  /** Attribute set on `<html>`. Default `data-theme`. */
  attribute?: string;
  /** Browser chrome colour per theme; the meta tag is left alone when omitted. */
  metaColors?: Partial<Record<SiteTheme, string>>;
  root?: HTMLElement;
}

export function applySiteTheme(theme: SiteTheme, options: ApplySiteThemeOptions = {}): void {
  if (typeof document === 'undefined') return;
  const root = options.root ?? document.documentElement;
  root.setAttribute(options.attribute ?? 'data-theme', theme);
  root.style.colorScheme = theme;
  const color = options.metaColors?.[theme];
  if (color) document.querySelector('meta[name="theme-color"]')?.setAttribute('content', color);
}

const isTheme = (v: unknown): v is SiteTheme => v === 'light' || v === 'dark';

/** Stored choice (raw or JSON string), then the OS preference, then `fallback`. */
export function resolveInitialSiteTheme(
  storageKey: string,
  fallback: SiteTheme = 'dark',
): SiteTheme {
  if (typeof window === 'undefined') return fallback;
  try {
    const stored = window.localStorage.getItem(storageKey);
    if (stored !== null) {
      const value: unknown = stored.startsWith('"') ? JSON.parse(stored) : stored;
      if (isTheme(value)) return value;
    }
  } catch (err) {
    console.warn(`[siteTheme] could not read "${storageKey}"`, err);
  }
  if (typeof window.matchMedia !== 'function') return fallback;
  if (window.matchMedia('(prefers-color-scheme: light)').matches) return 'light';
  if (window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
  return fallback;
}
