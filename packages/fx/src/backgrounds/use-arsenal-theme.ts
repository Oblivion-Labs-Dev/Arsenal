'use client';

import { useEffect, useState } from 'react';
import {
  parseColor,
  schemeForBackground,
  type ColorScheme,
  type PaletteMode,
  type Rgb,
} from './color';

/** Theme tokens the backgrounds read, resolved from `--arsenal-*` variables. */
export type ArsenalThemeTokens = {
  scheme: ColorScheme;
  background: Rgb;
  text: Rgb;
  accent: Rgb;
  violet: Rgb;
  cyan: Rgb;
  amber: Rgb;
  blue: Rgb;
};

const DARK_FALLBACK: Omit<ArsenalThemeTokens, 'scheme'> = {
  background: [5, 7, 10],
  text: [241, 245, 249],
  accent: [56, 189, 248],
  violet: [139, 92, 246],
  cyan: [71, 230, 255],
  amber: [245, 158, 11],
  blue: [96, 165, 250],
};

const LIGHT_FALLBACK: Omit<ArsenalThemeTokens, 'scheme'> = {
  background: [247, 243, 234],
  text: [23, 23, 23],
  accent: [37, 99, 235],
  violet: [109, 40, 217],
  cyan: [3, 105, 161],
  amber: [180, 83, 9],
  blue: [37, 99, 235],
};

function readVar(style: CSSStyleDeclaration, names: readonly string[]): Rgb | null {
  for (const name of names) {
    const parsed = parseColor(style.getPropertyValue(name));
    if (parsed) return parsed;
  }
  return null;
}

function systemScheme(): ColorScheme {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return 'dark';
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

/** The tokens used where the page cannot be read: on the server and on the first client render. */
function serverTheme(mode: PaletteMode): ArsenalThemeTokens {
  const scheme: ColorScheme = mode === 'light' ? 'light' : 'dark';
  return { scheme, ...(scheme === 'light' ? LIGHT_FALLBACK : DARK_FALLBACK) };
}

/**
 * Reads the Arsenal tokens from `element` (default `<html>`). `mode` forces a scheme; `auto`
 * decides from the luminance of `--arsenal-background`, then the OS setting.
 */
export function readArsenalTheme(
  mode: PaletteMode = 'auto',
  element?: Element,
): ArsenalThemeTokens {
  if (typeof window === 'undefined' || typeof document === 'undefined') return serverTheme(mode);
  const style = getComputedStyle(element ?? document.documentElement);
  const background = readVar(style, ['--arsenal-background']);
  const scheme: ColorScheme =
    mode !== 'auto' ? mode : background ? schemeForBackground(background) : systemScheme();
  const fallback = scheme === 'light' ? LIGHT_FALLBACK : DARK_FALLBACK;
  // A forced scheme that disagrees with the page keeps the fallback inks so contrast holds.
  const pageMatches = !background || schemeForBackground(background) === scheme;
  const read = (names: readonly string[], fb: Rgb): Rgb =>
    pageMatches ? (readVar(style, names) ?? fb) : fb;
  return {
    scheme,
    background: read(['--arsenal-background'], fallback.background),
    text: read(['--arsenal-text-primary'], fallback.text),
    accent: read(['--arsenal-accent-rgb', '--arsenal-accent'], fallback.accent),
    violet: read(['--arsenal-accent-violet', '--arsenal-steel-blue'], fallback.violet),
    cyan: read(['--arsenal-accent-cyan', '--arsenal-accent'], fallback.cyan),
    amber: read(
      ['--arsenal-accent-amber', '--arsenal-accent-gold', '--arsenal-molten-gold'],
      fallback.amber,
    ),
    blue: read(['--arsenal-accent-blue', '--arsenal-steel-blue'], fallback.blue),
  };
}

function sameTokens(a: ArsenalThemeTokens, b: ArsenalThemeTokens): boolean {
  return (Object.keys(a) as (keyof ArsenalThemeTokens)[]).every(
    (key) => String(a[key]) === String(b[key]),
  );
}

/**
 * Live Arsenal tokens. Re-reads when `<html>` changes `data-theme`, `class` or `style`, or the OS
 * colour scheme flips, so canvases repaint with the new palette.
 */
export function useArsenalTheme(mode: PaletteMode = 'auto'): ArsenalThemeTokens {
  // Start from the server's tokens so hydration matches; the effect switches to the page's tokens.
  const [tokens, setTokens] = useState<ArsenalThemeTokens>(() => serverTheme(mode));

  useEffect(() => {
    const update = () =>
      setTokens((prev) => {
        const next = readArsenalTheme(mode);
        return sameTokens(prev, next) ? prev : next;
      });
    update();
    const observer = typeof MutationObserver === 'undefined' ? null : new MutationObserver(update);
    observer?.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme', 'class', 'style'],
    });
    const mql =
      typeof window.matchMedia === 'function'
        ? window.matchMedia('(prefers-color-scheme: light)')
        : null;
    mql?.addEventListener('change', update);
    return () => {
      observer?.disconnect();
      mql?.removeEventListener('change', update);
    };
  }, [mode]);

  return tokens;
}
