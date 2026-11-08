import { createRng, gaussian, type Rng } from './random';

export type CosmicHue = 'white' | 'violet' | 'blue' | 'amber';
export type CosmicLayer = 'micro' | 'mid' | 'hero' | 'dust';

export type CosmicParticle = {
  baseX: number;
  baseY: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  depth: number;
  phase: number;
  hue: CosmicHue;
  layer: CosmicLayer;
};

export type CosmicCounts = Record<CosmicLayer, number>;

export const COSMIC_REPEL_RADIUS = 128;
const REPEL_FORCE = 0.32;
const SPRING = 0.02;
const DAMP = 0.92;
const INTEGRATE = 0.66;

const LAYERS: readonly CosmicLayer[] = ['micro', 'mid', 'hero', 'dust'];

function clamp(min: number, value: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Particles per layer for a viewport, scaled by area and clamped. */
export function cosmicCountsForViewport(width: number, height: number): CosmicCounts {
  const area = Math.max(1, width * height);
  return {
    micro: clamp(96, Math.floor(area / 20000), 300),
    mid: clamp(38, Math.floor(area / 48000), 130),
    hero: clamp(8, Math.floor(area / 165000), 32),
    dust: clamp(26, Math.floor(area / 56000), 88),
  };
}

function makeParticle(layer: CosmicLayer, width: number, height: number, rng: Rng): CosmicParticle {
  const x = rng() * width;
  const ySpread = layer === 'dust' ? 0.1 : 0.14;
  const bandY = height * 0.16 + (x / Math.max(1, width)) * height * 0.58;
  const inBand = rng() < (layer === 'micro' ? 0.44 : 0.62);
  const y = inBand ? bandY + gaussian(rng) * (height * ySpread) : rng() * height;
  const focusX = width * 0.72;
  const focusY = height * 0.46;
  const fx = x - focusX;
  const fy = y - focusY;
  const focusNorm = Math.sqrt(fx * fx + fy * fy) / Math.max(1e-9, Math.min(width, height) * 0.4);
  const focusFalloff = Math.max(0, 1 - focusNorm);
  const pull = focusFalloff * (layer === 'micro' ? 0.08 : 0.14);
  const rx = x + (focusX - x) * pull;
  const ry = y + (focusY - y) * pull;
  const hueRoll = rng();
  const hue: CosmicHue =
    hueRoll < 0.6 ? 'white' : hueRoll < 0.78 ? 'blue' : hueRoll < 0.92 ? 'violet' : 'amber';
  const depthBase =
    layer === 'hero' ? 1.2 : layer === 'mid' ? 0.92 : layer === 'dust' ? 0.72 : 0.52;
  const depth = depthBase + rng() * 0.75;
  const size =
    layer === 'hero'
      ? 1.3 + rng() * 1.8
      : layer === 'mid'
        ? 0.7 + rng() * 1.2
        : layer === 'dust'
          ? 0.9 + rng() * 1.7
          : 0.35 + rng() * 0.6;
  const alpha =
    layer === 'hero'
      ? 0.17 + rng() * 0.18
      : layer === 'mid'
        ? 0.08 + rng() * 0.13
        : layer === 'dust'
          ? 0.028 + rng() * 0.05
          : 0.02 + rng() * 0.04;
  const baseY = clamp(-height * 0.2, ry, height * 1.2);
  return {
    baseX: rx,
    baseY,
    x: rx,
    y: baseY,
    vx: 0,
    vy: 0,
    size,
    alpha,
    depth,
    phase: rng() * Math.PI * 2,
    hue,
    layer,
  };
}

/**
 * A diagonal band of stars across the viewport, denser around a focus point right of centre.
 * Same seed and size give the same field.
 */
export function createCosmicParticleField(
  width: number,
  height: number,
  seed: number | Rng = 1,
): CosmicParticle[] {
  const rng = typeof seed === 'number' ? createRng(seed) : seed;
  const counts = cosmicCountsForViewport(width, height);
  const particles: CosmicParticle[] = [];
  for (const layer of LAYERS) {
    for (let i = 0; i < counts[layer]; i++) particles.push(makeParticle(layer, width, height, rng));
  }
  return particles;
}

export type CosmicStepInput = {
  width: number;
  height: number;
  /** Frame step in 60fps units. */
  dt: number;
  /** Clock in ms; drives drift and twinkle. */
  time: number;
  pointer: { x: number; y: number } | null;
  /** Page scroll in px; the layers sink at different rates for depth. */
  scrollY?: number;
};

const SCROLL_FACTOR: Record<CosmicLayer, number> = {
  hero: 0.022,
  mid: 0.018,
  dust: 0.014,
  micro: 0.01,
};
const LAYER_FORCE: Record<CosmicLayer, number> = { hero: 0.82, mid: 0.68, dust: 0.54, micro: 0.4 };
const TWINKLE: Record<CosmicLayer, number> = { hero: 0.2, mid: 0.12, dust: 0.08, micro: 0.08 };

/** Springs each star toward its drifting home, pushes it away from the pointer, and integrates. */
export function stepCosmicParticleField(particles: CosmicParticle[], input: CosmicStepInput): void {
  const { width: w, height: h, dt, time, pointer } = input;
  const scrollY = Math.min(1800, Math.max(0, input.scrollY ?? 0));
  const repel2 = COSMIC_REPEL_RADIUS * COSMIC_REPEL_RADIUS;
  const px = pointer?.x ?? 0;
  const py = pointer?.y ?? 0;
  const parallaxX = pointer ? ((px - w * 0.5) / Math.max(1, w)) * 7.4 : 0;
  const parallaxY = pointer ? ((py - h * 0.5) / Math.max(1, h)) * 5.8 : 0;

  for (const p of particles) {
    const driftX = Math.sin(time * 0.00008 * p.depth + p.phase) * 1.8 * p.depth;
    const driftY = Math.cos(time * 0.00006 * p.depth + p.phase * 1.3) * 1.25 * p.depth;
    const targetX = p.baseX + driftX + parallaxX * p.depth * 0.22;
    const targetY =
      p.baseY + driftY + parallaxY * p.depth * 0.22 + scrollY * SCROLL_FACTOR[p.layer];
    let fx = (targetX - p.x) * SPRING;
    let fy = (targetY - p.y) * SPRING;
    if (pointer) {
      const dx = p.x - px;
      const dy = p.y - py;
      const d2 = dx * dx + dy * dy;
      if (d2 < repel2 && d2 > 0.2) {
        const d = Math.sqrt(d2);
        const falloff = (1 - d / COSMIC_REPEL_RADIUS) ** 2;
        const force = falloff * REPEL_FORCE * LAYER_FORCE[p.layer];
        fx += (dx / d) * force;
        fy += (dy / d) * force;
      }
    }
    p.vx = (p.vx + fx * dt) * DAMP;
    p.vy = (p.vy + fy * dt) * DAMP;
    p.x += p.vx * dt * INTEGRATE;
    p.y += p.vy * dt * INTEGRATE;
  }
}

/** Twinkling alpha for a star at `time`. */
export function cosmicParticleAlpha(p: CosmicParticle, time: number): number {
  const strength = TWINKLE[p.layer];
  return p.alpha * (1 - strength + strength * Math.sin(time * 0.00015 + p.phase));
}
