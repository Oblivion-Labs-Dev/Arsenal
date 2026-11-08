/** Pure figure-eight particle field (seeded). Ported from VercelPortfolio infinityParticleField. */
import {
  infinityNorm,
  infinityNormNormal,
  infinityNormTangent,
} from './infinity-curve'
import { createRng, gaussian, type Rng } from './random'

export type ParticleTier = 'base' | 'bright' | 'core'

export type InfinityParticle = {
  /** Lighting tier: structure vs sparkle vs focal stars. */
  tier: ParticleTier
  homeU: number
  homeV: number
  /** Curve parameter for path-aligned drift (subset of particles). */
  curveT: number
  /** Offset from infinityNorm(curveT) in normalized figure-eight space. */
  deltaU: number
  deltaV: number
  /** Radians / second along curve; 0 = no path drift. */
  driftRate: number
  baseX: number
  baseY: number
  x: number
  y: number
  vx: number
  vy: number
  size: number
  alpha: number
  phase: number
  side: 'left' | 'right' | 'center'
  ambient: number
}

export type InfinityFieldViewport = {
  width: number
  height: number
  cx: number
  cy: number
  scale: number
}

/** Inner radius: full repulsion (virtual units). */
const INFLUENCE_VU = 116
/** Outer radius: soft attention / coherence before inner zone. */
const ATTENTION_VU = 278
const REPEL = 6.4
const SPRING = 0.052
const DAMP = 0.9
const INTEGRATE = 0.7

function sideForU(homeU: number): 'left' | 'right' | 'center' {
  if (homeU < -0.28) return 'left'
  if (homeU > 0.28) return 'right'
  return 'center'
}

export function createInfinityFieldViewport(
  width: number,
  height: number,
): InfinityFieldViewport {
  const cx = width / 2
  const cy = height / 2
  const scale = Math.min(width, height) * 0.36
  return { width, height, cx, cy, scale }
}

export function createInfinityParticleField(
  width: number,
  height: number,
  count: number,
  /** Seed or rng; same seed, same field. */
  seed: number | Rng = 1,
): InfinityParticle[] {
  const rng: Rng = typeof seed === 'number' ? createRng(seed) : seed
  const viewport = createInfinityFieldViewport(width, height)
  const particles: InfinityParticle[] = []

  for (let i = 0; i < count; i++) {
    const pinch = rng() < 0.24
    const t = pinch
      ? (rng() < 0.5 ? 0 : Math.PI) + gaussian(rng) * 0.33
      : rng() * Math.PI * 2
    const p = infinityNorm(t)
    const n = infinityNormNormal(t)
    const tan = infinityNormTangent(t)
    const normalSpread = (gaussian(rng) * (pinch ? 5.6 : 7.8)) / viewport.scale
    const tangentSpread = (gaussian(rng) * (pinch ? 3.1 : 4.9)) / viewport.scale
    const dustSpread = (gaussian(rng) * 2.2) / viewport.scale
    const homeU =
      p.x + n.x * normalSpread + tan.x * tangentSpread + n.y * dustSpread * 0.35
    const homeV =
      p.y + n.y * normalSpread + tan.y * tangentSpread - n.x * dustSpread * 0.35

    const side = sideForU(homeU)
    const baseX = viewport.cx + homeU * viewport.scale
    const baseY = viewport.cy - homeV * viewport.scale

    const rFromCross = Math.hypot(baseX - viewport.cx, baseY - viewport.cy)

    const alphaBoost =
      (side === 'center' ? 0.12 : 0) +
      (rFromCross < 96 ? 0.065 * (1 - rFromCross / 96) : 0)

    /** More visible accents: ~78% base, ~17% bright, ~5% core. */
    let tier: ParticleTier
    const roll = rng()
    if (roll < 0.78) tier = 'base'
    else if (roll < 0.95) tier = 'bright'
    else tier = 'core'

    if (tier !== 'base' && rFromCross > 285) tier = 'base'
    if (tier === 'core' && rFromCross > 112) tier = rFromCross < 185 ? 'bright' : 'base'
    if (tier === 'bright' && rFromCross > 265) tier = 'base'

    let sizeBase: number
    if (tier === 'base') {
      sizeBase = 0.3 + rng() * 0.58
    } else if (tier === 'bright') {
      sizeBase = 0.44 + rng() * 0.38
    } else {
      sizeBase = 0.54 + rng() * 0.3
    }

    let sizeMul = 1
    let alphaMul = 1
    if (tier === 'bright') {
      sizeMul = 1.14
      alphaMul = 1.22
    } else if (tier === 'core') {
      sizeMul = 1.28
      alphaMul = 1.28
    }

    const driftRate =
      rng() < 0.18 ? 0.28 + rng() * 0.65 : 0

    particles.push({
      tier,
      homeU,
      homeV,
      curveT: wrapAngle(t),
      deltaU: homeU - p.x,
      deltaV: homeV - p.y,
      driftRate,
      baseX,
      baseY,
      x: baseX,
      y: baseY,
      vx: 0,
      vy: 0,
      size: (sizeBase + (pinch ? 0.04 : 0)) * sizeMul,
      alpha:
        (0.13 + rng() * 0.18 + (1 - Math.abs(p.x)) * 0.07 + alphaBoost) *
        alphaMul,
      phase: rng() * Math.PI * 2,
      side,
      ambient: 0.45 + rng() * 0.55,
    })
  }

  return particles
}

export function remapInfinityParticleField(
  particles: InfinityParticle[],
  previous: InfinityFieldViewport,
  next: InfinityFieldViewport,
): void {
  if (!particles.length) return
  const ratio = next.scale / Math.max(1e-6, previous.scale)

  for (const p of particles) {
    const worldU = (p.x - previous.cx) / Math.max(1e-6, previous.scale)
    const worldV = (previous.cy - p.y) / Math.max(1e-6, previous.scale)
    p.x = next.cx + worldU * next.scale
    p.y = next.cy - worldV * next.scale
    p.vx *= ratio
    p.vy *= ratio
    syncParticleBaseFromCurve(p, next)
    p.homeU =
      (p.baseX - next.cx) / Math.max(1e-6, next.scale)
    p.homeV =
      (next.cy - p.baseY) / Math.max(1e-6, next.scale)
    p.side = sideForU(p.homeU)
  }
}

function syncParticleBaseFromCurve(
  p: InfinityParticle,
  viewport: InfinityFieldViewport,
): void {
  const pc = infinityNorm(p.curveT)
  const u = pc.x + p.deltaU
  const v = pc.y + p.deltaV
  p.baseX = viewport.cx + u * viewport.scale
  p.baseY = viewport.cy - v * viewport.scale
}

function wrapAngle(a: number): number {
  const t = Math.PI * 2
  let x = a % t
  if (x < 0) x += t
  return x
}

export function stepInfinityParticleField(
  particles: InfinityParticle[],
  pointer: { x: number; y: number } | null,
  dt: number,
  deltaMs: number,
  elapsedMs: number,
  viewport: InfinityFieldViewport,
  options?: { influenceRadius?: number; attentionRadius?: number },
): void {
  const inf = options?.influenceRadius ?? INFLUENCE_VU
  const attention = options?.attentionRadius ?? ATTENTION_VU
  const inf2 = inf * inf

  const dts = Math.max(0, deltaMs) / 1000

  for (const p of particles) {
    if (p.driftRate > 0 && dts > 0) {
      p.curveT = wrapAngle(
        p.curveT + p.driftRate * dts * 0.11 * (0.85 + 0.15 * Math.sin(elapsedMs * 0.00002 + p.phase)),
      )
      syncParticleBaseFromCurve(p, viewport)
    }

    const breathSlow = Math.sin(elapsedMs * 0.00009 + p.phase * 0.4) * 0.28 + 0.72
    const ambientX =
      Math.sin(elapsedMs * 0.00024 + p.phase) * 0.82 * p.ambient * breathSlow
    const ambientY =
      Math.cos(elapsedMs * 0.00019 + p.phase * 1.17) * 0.62 * p.ambient * breathSlow
    const homeX = p.baseX + ambientX
    const homeY = p.baseY + ambientY

    let springMul = 1
    if (pointer) {
      const dx = p.x - pointer.x
      const dy = p.y - pointer.y
      const d2 = dx * dx + dy * dy
      const d = Math.sqrt(Math.max(d2, 0.04))
      if (d2 >= inf2 && d > inf && d < attention) {
        const t = (d - inf) / Math.max(1e-6, attention - inf)
        const coherence = (1 - t) ** 2
        springMul += 0.42 * coherence
      }
    }

    let fx = (homeX - p.x) * SPRING * springMul
    let fy = (homeY - p.y) * SPRING * springMul

    if (pointer) {
      const dx = p.x - pointer.x
      const dy = p.y - pointer.y
      const d2 = dx * dx + dy * dy
      if (d2 < inf2 && d2 > 0.2) {
        const d = Math.sqrt(Math.max(d2, 0.04))
        const nx = dx / d
        const ny = dy / d
        const falloff = (1 - d / inf) ** 2
        const f = falloff * REPEL
        fx += nx * f
        fy += ny * f
      }
    }

    p.vx = (p.vx + fx * dt) * DAMP
    p.vy = (p.vy + fy * dt) * DAMP
    p.x += p.vx * dt * INTEGRATE
    p.y += p.vy * dt * INTEGRATE
  }
}
