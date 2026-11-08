/** An sRGB triplet, 0–255 per channel. */
export type Rgb = readonly [number, number, number];

export type ColorScheme = 'dark' | 'light';

/** `auto` follows the luminance of `--arsenal-background`. */
export type PaletteMode = 'auto' | ColorScheme;

/** A colour prop: an RGB triplet or any CSS colour string `parseColor` understands. */
export type ColorInput = Rgb | string;

function clampChannel(n: number): number {
  return Math.max(0, Math.min(255, Math.round(n)));
}

/**
 * Parses `#rgb`, `#rrggbb`, `#rrggbbaa`, `rgb()/rgba()` (comma or space separated) and bare
 * `r, g, b` triplets such as `--arsenal-accent-rgb`. Returns null for anything else.
 */
export function parseColor(value: string): Rgb | null {
  const text = value.trim().toLowerCase();
  if (!text) return null;

  if (text.startsWith('#')) {
    const hex = text.slice(1);
    if (!/^[0-9a-f]+$/.test(hex)) return null;
    if (hex.length === 3 || hex.length === 4) {
      const r = parseInt(hex.charAt(0) + hex.charAt(0), 16);
      const g = parseInt(hex.charAt(1) + hex.charAt(1), 16);
      const b = parseInt(hex.charAt(2) + hex.charAt(2), 16);
      return [r, g, b];
    }
    if (hex.length === 6 || hex.length === 8) {
      return [
        parseInt(hex.slice(0, 2), 16),
        parseInt(hex.slice(2, 4), 16),
        parseInt(hex.slice(4, 6), 16),
      ];
    }
    return null;
  }

  const fn = /^rgba?\(([^)]*)\)$/.exec(text);
  const body = fn ? (fn[1] ?? '') : text;
  const parts = body
    .split(/[\s,/]+/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length < 3) return null;
  const channels = parts.slice(0, 3).map((part) => {
    if (part.endsWith('%')) return (parseFloat(part) / 100) * 255;
    return parseFloat(part);
  });
  if (channels.some((n) => !Number.isFinite(n))) return null;
  return [
    clampChannel(channels[0] ?? 0),
    clampChannel(channels[1] ?? 0),
    clampChannel(channels[2] ?? 0),
  ];
}

export function toRgb(input: ColorInput, fallback: Rgb): Rgb {
  if (typeof input !== 'string') return input;
  return parseColor(input) ?? fallback;
}

/** WCAG relative luminance, 0 (black) to 1 (white). */
export function relativeLuminance(rgb: Rgb): number {
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(rgb[0]) + 0.7152 * lin(rgb[1]) + 0.0722 * lin(rgb[2]);
}

/** Light backgrounds get the light palette. */
export function schemeForBackground(background: Rgb): ColorScheme {
  return relativeLuminance(background) > 0.4 ? 'light' : 'dark';
}

export function rgba(rgb: Rgb, alpha: number): string {
  const a = Math.max(0, Math.min(1, alpha));
  return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${Number.isFinite(a) ? +a.toFixed(4) : 0})`;
}

/** Linear mix: t = 0 gives `a`, t = 1 gives `b`. */
export function mixRgb(a: Rgb, b: Rgb, t: number): Rgb {
  return [
    clampChannel(a[0] + (b[0] - a[0]) * t),
    clampChannel(a[1] + (b[1] - a[1]) * t),
    clampChannel(a[2] + (b[2] - a[2]) * t),
  ];
}
