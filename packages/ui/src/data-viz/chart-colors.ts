// Lightweight Charts parses colors itself and only understands hex and rgb()/rgba(). Tokens are
// scoped and written with var(), light-dark() and color-mix(), so they are resolved through the
// browser (a probe element's computed `color`) and normalised here.

const clampByte = (n: number) => Math.max(0, Math.min(255, Math.round(n)));

/** Normalise a computed CSS color to `rgba(r, g, b, a)`; null when the format is not understood. */
export function toRgba(computed: string, opacity = 1): string | null {
  const s = computed.trim();
  let r: number, g: number, b: number;
  let a = 1;
  const hex = s.match(/^#([0-9a-f]{6})([0-9a-f]{2})?$/i);
  const rgb = s.match(
    /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/i,
  );
  const srgb = s.match(
    /^color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+%?))?\s*\)$/i,
  );
  const alpha = (raw: string | undefined) =>
    raw === undefined ? 1 : raw.endsWith("%") ? Number(raw.slice(0, -1)) / 100 : Number(raw);
  if (hex) {
    const n = parseInt(hex[1]!, 16);
    [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    if (hex[2]) a = parseInt(hex[2], 16) / 255;
  } else if (rgb) {
    [r, g, b] = [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])];
    a = alpha(rgb[4]);
  } else if (srgb) {
    [r, g, b] = [Number(srgb[1]) * 255, Number(srgb[2]) * 255, Number(srgb[3]) * 255];
    a = alpha(srgb[4]);
  } else return null;
  const outA = Math.max(0, Math.min(1, a * opacity));
  return `rgba(${clampByte(r)}, ${clampByte(g)}, ${clampByte(b)}, ${Number(outA.toFixed(3))})`;
}

/**
 * Resolve tokens as they apply inside `scope`. Unresolvable tokens fall back to the given color so
 * the chart never receives a string it cannot parse.
 */
export function readChartColors<K extends string>(
  scope: HTMLElement,
  tokens: Record<K, { token: string; fallback: string }>,
): Record<K, string> {
  const probe = document.createElement("span");
  probe.style.display = "none";
  scope.appendChild(probe);
  const out = {} as Record<K, string>;
  for (const key of Object.keys(tokens) as K[]) {
    const { token, fallback } = tokens[key];
    probe.style.color = "";
    probe.style.color = `var(${token}, ${fallback})`;
    out[key] = toRgba(getComputedStyle(probe).color) ?? fallback;
  }
  probe.remove();
  return out;
}
