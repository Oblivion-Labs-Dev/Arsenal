import { createRng, gaussian, type Rng } from './random'

/** Pure log-spiral galaxy particle sim (seeded). Ported from VercelPortfolio galaxyParticleField. */
export type GalaxyLayer = 'dust' | 'mid' | 'core'

export type GalaxyHue = 'pearl' | 'ice' | 'cyan'

export type GalaxyKind = 'spiral' | 'halo'

/**
 * Logarithmic spiral in the galactic plane, then projected with disc tilt
 * (oblique / “Milky Way at an angle”): wide ellipse, not a face-on circle.
 */
export type GalaxyParticle = {
  kind: GalaxyKind
  layer: GalaxyLayer
  arm: number
  /** Angle parameter along log spiral (rad). */
  spiralTheta: number
  deltaPhi: number
  deltaR: number
  lateralPhi: number
  curveRate: number
  haloPhi: number
  haloR: number
  /** sin(φ) before tilt — near side of disc reads slightly brighter in canvas. */
  sinPhi: number
  baseX: number
  baseY: number
  x: number
  y: number
  vx: number
  vy: number
  size: number
  alpha: number
  phase: number
  ambient: number
  hue: GalaxyHue
  /** Fixed |gaussian| used to scatter points out of the central void (keeps steps deterministic). */
  voidJitter: number
}

export type GalaxyFieldViewport = {
  width: number
  height: number
  cx: number
  cy: number
  scale: number
}

const INFLUENCE_VU = 92
const ATTENTION_VU = 248
const REPEL = 3.05
const SPRING = 0.046
const DAMP = 0.91
const INTEGRATE = 0.66

/** Log spiral: r = rIn * exp(K * (θ - θMin)). */
const R_IN_FRAC = 0.052
const R_OUT_FRAC = 0.93
const THETA_MIN = 0.42
const THETA_MAX = 5.95

/** Oblique disc: squash Y (tilt) + slight X stretch — horizontal ellipse. */
const DISC_TILT_Y = 0.4
const DISC_STRETCH_X = 1.07

function logSpiralK(rIn: number, rOut: number): number {
  return Math.log(rOut / Math.max(rIn, 1e-9)) / (THETA_MAX - THETA_MIN)
}

function rFromTheta(theta: number, rIn: number, k: number): number {
  return rIn * Math.exp(k * (theta - THETA_MIN))
}

function spiralBounds(scale: number) {
  const rIn = scale * R_IN_FRAC
  const rOut = scale * R_OUT_FRAC
  const k = logSpiralK(rIn, rOut)
  return { rIn, rOut, k, thetaMin: THETA_MIN, thetaMax: THETA_MAX }
}

export function createGalaxyFieldViewport(
  width: number,
  height: number,
): GalaxyFieldViewport {
  const cx = width / 2
  const cy = height / 2
  const scale = Math.min(width, height) * 0.44
  return { width, height, cx, cy, scale }
}

function syncParticleBase(
  p: GalaxyParticle,
  viewport: GalaxyFieldViewport,
  numArms: number,
  galaxyRotation: number,
): void {
  const { cx, cy, scale } = viewport
  const { rIn, k, thetaMin, thetaMax } = spiralBounds(scale)

  if (p.kind === 'halo') {
    const phi = p.haloPhi + galaxyRotation * 0.35
    const c = Math.cos(phi)
    const s = Math.sin(phi)
    const xg = c * p.haloR
    const yg = s * p.haloR
    p.sinPhi = s
    p.baseX = cx + xg * DISC_STRETCH_X
    p.baseY = cy + yg * DISC_TILT_Y
    return
  }

  let theta = p.spiralTheta
  if (theta < thetaMin) theta = thetaMin
  if (theta > thetaMax) theta = thetaMax

  let r = rFromTheta(theta, rIn, k) + p.deltaR
  const armPhase = (p.arm / numArms) * Math.PI * 2
  const phi =
    theta +
    armPhase +
    p.deltaPhi +
    p.lateralPhi * (0.038 / (1 + theta * 0.045)) +
    galaxyRotation

  p.sinPhi = Math.sin(phi)

  const voidR = scale * 0.048
  if (r < voidR && p.layer !== 'dust') {
    r = voidR + p.voidJitter * scale * 0.018
  }

  let xg = Math.cos(phi) * r
  let yg = Math.sin(phi) * r

  /** Narrow perpendicular offset — keeps arm spines, dark inter-arm lanes. */
  const armW =
    p.lateralPhi * scale * 0.018 * (0.2 + 0.8 * (theta - thetaMin) / Math.max(thetaMax - thetaMin, 1e-6))
  xg += -Math.sin(phi) * armW
  yg += Math.cos(phi) * armW * 0.85

  p.baseX = cx + xg * DISC_STRETCH_X
  p.baseY = cy + yg * DISC_TILT_Y
}

function sampleThetaBiased(rng: Rng, thetaMin: number, thetaMax: number, power: number): number {
  const u = rng()
  return thetaMin + (thetaMax - thetaMin) * Math.pow(u, power)
}

export function createGalaxyParticleField(
  width: number,
  height: number,
  count: number,
  /** Seed or rng; same seed, same galaxy. */
  seed: number | Rng = 1,
): { particles: GalaxyParticle[]; numArms: number } {
  const rng: Rng = typeof seed === 'number' ? createRng(seed) : seed
  const viewport = createGalaxyFieldViewport(width, height)
  /** 2–3 major arms (MW-like). */
  const numArms = 2 + Math.floor(rng() * 2)
  const particles: GalaxyParticle[] = []
  const { scale } = viewport
  const { rIn, k, thetaMin, thetaMax } = spiralBounds(scale)

  const haloCount = Math.max(0, Math.floor(count * 0.035))
  const spiralCount = count - haloCount

  for (let i = 0; i < spiralCount; i++) {
    const arm = Math.floor(rng() * numArms)

    let spiralTheta: number
    if (rng() < 0.12) {
      spiralTheta = thetaMin + rng() * (thetaMax - thetaMin) * 0.12
    } else {
      spiralTheta = sampleThetaBiased(rng, thetaMin, thetaMax, 1.88)
    }

    const deltaPhi = gaussian(rng) * 0.048
    const deltaR = gaussian(rng) * scale * 0.017
    const lateralPhi = gaussian(rng) * 0.055

    const rApprox = rFromTheta(spiralTheta, rIn, k) + deltaR
    const rn = rApprox / Math.max(1e-6, scale)

    let layer: GalaxyLayer
    const roll = rng()
    if (rn < 0.2) {
      if (roll < 0.4) layer = 'core'
      else if (roll < 0.8) layer = 'mid'
      else layer = 'dust'
    } else if (rn < 0.48) {
      if (roll < 0.68) layer = 'mid'
      else layer = 'dust'
    } else {
      layer = 'dust'
    }

    if (layer === 'core' && rn > 0.28) layer = 'mid'
    if (layer === 'mid' && rn > 0.58 && rng() < 0.48) layer = 'dust'

    let sizeBase = 0.22 + rng() * 0.75
    let alphaBase = 0.07 + rng() * 0.17

    if (layer === 'mid') {
      sizeBase *= 1.14
      alphaBase *= 1.15
    } else if (layer === 'core') {
      sizeBase *= 1.38
      alphaBase *= 1.22
    } else {
      sizeBase *= 0.82
      alphaBase *= 0.68
    }

    if (rn > 0.14 && rn < 0.62 && rng() < 0.06) {
      sizeBase *= 1.22
      alphaBase *= 1.12
    }

    const hueRoll = rng()
    let hue: GalaxyHue = 'pearl'
    if (hueRoll < 0.28) hue = 'ice'
    else if (hueRoll < 0.38) hue = 'cyan'

    const curveRate =
      rng() < 0.28 ? 0.12 + rng() * 0.55 : 0

    const p: GalaxyParticle = {
      kind: 'spiral',
      layer,
      arm,
      spiralTheta,
      deltaPhi,
      deltaR,
      lateralPhi,
      curveRate,
      haloPhi: 0,
      haloR: 0,
      sinPhi: 0,
      baseX: 0,
      baseY: 0,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      size: sizeBase,
      alpha: alphaBase,
      phase: rng() * Math.PI * 2,
      ambient: 0.3 + rng() * 0.58,
      hue,
      voidJitter: Math.abs(gaussian(rng)),
    }

    syncParticleBase(p, viewport, numArms, 0)
    p.x = p.baseX
    p.y = p.baseY

    particles.push(p)
  }

  const rMinH = rFromTheta(thetaMin, rIn, k) * 1.02
  const rMaxH = scale * R_OUT_FRAC * 0.96
  for (let i = 0; i < haloCount; i++) {
    const haloPhi = rng() * Math.PI * 2
    const u = rng()
    const haloR = rMinH + Math.pow(u, 0.85) * (rMaxH - rMinH)

    const p: GalaxyParticle = {
      kind: 'halo',
      layer: 'dust',
      arm: 0,
      spiralTheta: 0,
      deltaPhi: 0,
      deltaR: 0,
      lateralPhi: 0,
      curveRate: 0,
      haloPhi,
      haloR,
      sinPhi: 0,
      baseX: 0,
      baseY: 0,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      size: 0.14 + rng() * 0.38,
      alpha: 0.022 + rng() * 0.048,
      phase: rng() * Math.PI * 2,
      ambient: 0.18 + rng() * 0.32,
      hue: rng() < 0.4 ? 'ice' : 'pearl',
      voidJitter: 0,
    }

    syncParticleBase(p, viewport, numArms, 0)
    p.x = p.baseX
    p.y = p.baseY

    particles.push(p)
  }

  return { particles, numArms }
}

function wrapTheta(
  theta: number,
  thetaMin: number,
  thetaMax: number,
): number {
  const span = thetaMax - thetaMin
  if (span <= 1e-9) return thetaMin
  let x = theta
  while (x > thetaMax) x -= span
  while (x < thetaMin) x += span
  return x
}

export function stepGalaxyParticleField(
  particles: GalaxyParticle[],
  numArms: number,
  pointer: { x: number; y: number } | null,
  dt: number,
  deltaMs: number,
  elapsedMs: number,
  viewport: GalaxyFieldViewport,
  galaxyRotationRef: { current: number },
  options?: {
    influenceRadius?: number
    attentionRadius?: number
    reduceMotion?: boolean
  },
): void {
  const inf = options?.influenceRadius ?? INFLUENCE_VU
  const attention = options?.attentionRadius ?? ATTENTION_VU
  const inf2 = inf * inf
  const reduceMotion = options?.reduceMotion ?? false

  const dts = Math.max(0, deltaMs) / 1000
  const { thetaMin, thetaMax } = spiralBounds(viewport.scale)

  if (!reduceMotion) {
    galaxyRotationRef.current += 0.000013 * deltaMs
  }

  for (const p of particles) {
    if (!reduceMotion && p.kind === 'spiral' && p.curveRate > 0 && dts > 0) {
      p.spiralTheta = wrapTheta(
        p.spiralTheta +
          p.curveRate *
            dts *
            0.18 *
            (0.88 + 0.12 * Math.sin(elapsedMs * 0.000014 + p.phase)),
        thetaMin,
        thetaMax,
      )
    }

    syncParticleBase(p, viewport, numArms, galaxyRotationRef.current)

    const breathSlow =
      Math.sin(elapsedMs * 0.00007 + p.phase * 0.35) * 0.28 + 0.72
    const ambientX =
      Math.sin(elapsedMs * 0.00018 + p.phase) * 0.88 * p.ambient * breathSlow
    const ambientY =
      Math.cos(elapsedMs * 0.00015 + p.phase * 1.11) * 0.58 * p.ambient * breathSlow
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
        springMul += 0.28 * coherence
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
