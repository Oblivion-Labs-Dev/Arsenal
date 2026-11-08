/** Lemniscate-style figure-eight curve math, ported from VercelPortfolio infinityCurve. */
/** Horizontal figure-eight: x = sin(t), y = sin(2t) / 2, t ∈ [0, 2π] */
export function infinityNorm(t: number): { x: number; y: number } {
  return { x: Math.sin(t), y: Math.sin(2 * t) / 2 }
}

export function infinityNormTangent(t: number): { x: number; y: number } {
  const dt = 0.004
  const a = infinityNorm(t)
  const b = infinityNorm(t + dt)
  const dx = b.x - a.x
  const dy = b.y - a.y
  const len = Math.sqrt(dx * dx + dy * dy) || 1
  return { x: dx / len, y: dy / len }
}

export function infinityNormNormal(t: number): { x: number; y: number } {
  const tan = infinityNormTangent(t)
  return { x: -tan.y, y: tan.x }
}

export function infinityToPixel(
  t: number,
  cx: number,
  cy: number,
  scale: number,
): { x: number; y: number } {
  const p = infinityNorm(t)
  return { x: cx + p.x * scale, y: cy - p.y * scale }
}

/** Build SVG path d for viewBox centered at (cx, cy). */
export function buildInfinityPathD(
  cx: number,
  cy: number,
  scale: number,
  segments = 96,
): string {
  const pts: { x: number; y: number }[] = []
  for (let i = 0; i <= segments; i++) {
    const t = (i / segments) * Math.PI * 2
    pts.push(infinityToPixel(t, cx, cy, scale))
  }
  let d = `M ${pts[0].x.toFixed(3)} ${pts[0].y.toFixed(3)}`
  for (let i = 1; i < pts.length; i++) {
    d += ` L ${pts[i].x.toFixed(3)} ${pts[i].y.toFixed(3)}`
  }
  return d
}
