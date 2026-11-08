export type Rgb = [number, number, number];

/**
 * Parses a canvas-normalised colour string (`#rrggbb`, `#rgb`, `rgb(...)`, `rgba(...)`) into 0..1
 * channels. Returns null for anything it does not understand, so callers choose the fallback.
 */
export function parseCssColor(css: string): Rgb | null {
  const s = css.trim().toLowerCase();
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})([0-9a-f]{2})?$/.exec(s);
  if (hex?.[1]) {
    const h = hex[1].length === 3 ? [...hex[1]].map((c) => c + c).join('') : hex[1];
    return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255) as Rgb;
  }
  const fn = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/.exec(s);
  if (fn?.[1] && fn[2] && fn[3]) {
    return [Number(fn[1]) / 255, Number(fn[2]) / 255, Number(fn[3]) / 255];
  }
  return null;
}

/** sRGB 0..1 to approximately linear light (gamma 2.2), for blending in a shader. */
export function toLinear(color: Rgb): Rgb {
  return [color[0] ** 2.2, color[1] ** 2.2, color[2] ** 2.2];
}

/** Whether a background colour is dark (channel sum under 1.2 of 3). */
export function isDarkColor(color: Rgb): boolean {
  return color[0] + color[1] + color[2] < 1.2;
}

let probe: CanvasRenderingContext2D | null | undefined;

/**
 * Any CSS colour (named, hsl, oklch, var-resolved value) as rgb 0..1, normalised through a 2D
 * canvas context. Falls back to `fallback` (white by default) when the browser cannot parse it.
 */
export function rgb(css: string, fallback: Rgb = [1, 1, 1]): Rgb {
  if (typeof document === 'undefined') return parseCssColor(css) ?? fallback;
  if (probe === undefined) probe = document.createElement('canvas').getContext('2d');
  if (!probe) return parseCssColor(css) ?? fallback;
  probe.fillStyle = '#000';
  probe.fillStyle = css || '#fff';
  return parseCssColor(String(probe.fillStyle)) ?? fallback;
}

/** Reads a CSS custom property from the root element as rgb 0..1. */
export function cssVarRgb(name: string, fallback?: Rgb, root?: Element): Rgb {
  if (typeof document === 'undefined') return fallback ?? [1, 1, 1];
  const value = getComputedStyle(root ?? document.documentElement)
    .getPropertyValue(name)
    .trim();
  return rgb(value, fallback);
}
