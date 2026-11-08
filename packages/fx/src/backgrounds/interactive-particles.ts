import { createRng, type Rng } from './random';

/** Pure simulation for `InteractiveParticles`: a drifting, depth-layered constellation mesh. */

export type MeshIntensity = 'normal' | 'intense';
export type MeshLayer = 'back' | 'mid' | 'front';
/** Colour slot; the renderer maps each to a theme ink. */
export type MeshHue = 'cyan' | 'amber' | 'violet' | 'accent';

export type MeshParticle = {
  /** Baseline position (before scroll parallax and pointer offset). */
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  layer: MeshLayer;
  hue: MeshHue;
  /** 0.35 back, 0.7 mid, 1.3 front. Scales parallax and pointer response. */
  depth: number;
  angle: number;
  angleSpeed: number;
  wobble: number;
  offsetX: number;
  offsetY: number;
  lifePhase: number;
  pulseSpeed: number;
  /** 0–1 glow left behind by the pointer; decays every frame. */
  influence: number;
  /** +1 leans toward the pointer on hover, −1 pushes away. */
  charge: -1 | 1;
  /** Drawn position, written by `stepMeshParticles`. */
  drawX: number;
  drawY: number;
};

export const MESH_REFERENCE_AREA = 1920 * 1080;
/** Particles wrap this far outside the viewport so they never pop in at the edge. */
export const MESH_WRAP_PADDING = 150;

const LAYER_HUES: Record<MeshLayer, readonly MeshHue[]> = {
  back: ['cyan', 'violet'],
  mid: ['cyan', 'amber', 'violet'],
  front: ['cyan', 'amber', 'accent', 'violet'],
};

/** sqrt(area / 1920×1080): distances scale with this so large screens stay equally rich. */
export function meshViewportScale(width: number, height: number): number {
  return Math.sqrt(Math.max(width * height, 1) / MESH_REFERENCE_AREA);
}

/** Particle count calibrated against a 1080p reference, clamped per intensity. */
export function meshParticleCount(width: number, height: number, intensity: MeshIntensity): number {
  const intense = intensity === 'intense';
  const areaScale = Math.max(width * height, 1) / MESH_REFERENCE_AREA;
  const target = Math.round((intense ? 240 : 110) * areaScale);
  return Math.min(intense ? 900 : 420, Math.max(intense ? 120 : 60, target));
}

export function createMeshParticles(
  width: number,
  height: number,
  intensity: MeshIntensity = 'normal',
  seed: number | Rng = 1,
): MeshParticle[] {
  const rng = typeof seed === 'function' ? seed : createRng(seed);
  const intense = intensity === 'intense';
  const count = meshParticleCount(width, height, intensity);
  const out: MeshParticle[] = [];
  for (let i = 0; i < count; i++) {
    const roll = rng();
    let layer: MeshLayer = 'mid';
    let depth = 0.7;
    let radius = rng() * 1.0 + 1.0;
    let vy = -(rng() * 0.15 + 0.15);
    if (roll < 0.4) {
      layer = 'back';
      depth = 0.35;
      radius = rng() * 0.5 + 0.6;
      vy = -(rng() * 0.08 + 0.08);
    } else if (roll > (intense ? 0.78 : 0.88)) {
      layer = 'front';
      depth = 1.3;
      radius = rng() * (intense ? 1.8 : 1.2) + 2.0;
      vy = -(rng() * 0.25 + 0.25);
    }
    const hues = LAYER_HUES[layer];
    const x = rng() * width;
    const y = rng() * (height + 2 * MESH_WRAP_PADDING) - MESH_WRAP_PADDING;
    out.push({
      x,
      y,
      vx: (rng() - 0.5) * 0.25,
      vy,
      radius,
      layer,
      hue: hues[Math.floor(rng() * hues.length)] ?? 'cyan',
      depth,
      angle: rng() * Math.PI * 2,
      angleSpeed: rng() * 0.02 + 0.005,
      wobble: rng() * 0.15 + 0.05,
      offsetX: 0,
      offsetY: 0,
      lifePhase: rng() * Math.PI * 2,
      pulseSpeed: rng() * 0.025 + 0.01,
      influence: 0,
      charge: rng() > 0.48 ? 1 : -1,
      drawX: x,
      drawY: y,
    });
  }
  return out;
}

export type MeshPointer = {
  x: number;
  y: number;
  /** Milliseconds the pointer has been held down; null when not pressed. */
  holdMs: number | null;
};

export type MeshStepInput = {
  width: number;
  height: number;
  /** Frame step in 60fps units; 0 freezes drift (static frame). */
  dt: number;
  /** Frames elapsed (60fps units), drives the hover bend and pulse. */
  frame: number;
  pointer: MeshPointer | null;
  /** Page scroll for parallax. */
  scrollY?: number;
  /** Smoothed scroll velocity (px/frame); pushes layers as the page moves. */
  scrollVelocity?: number;
  rng?: Rng;
};

/**
 * Holding the pointer pulls the mesh in, slowly at first: quartic ease over 1.5 s, up to 0.22.
 */
export function meshAttraction(holdMs: number): number {
  const raw = Math.min(1, Math.max(0, holdMs) / 1500);
  return Math.pow(raw, 4) * 0.22;
}

/** Wraps a y coordinate into [-padding, height + padding). */
export function wrapMeshY(y: number, height: number, padding = MESH_WRAP_PADDING): number {
  const span = height + padding * 2;
  return ((((y + padding) % span) + span) % span) - padding;
}

/** Advances drift, wrapping, scroll parallax and pointer response; writes `drawX/drawY`. */
export function stepMeshParticles(particles: MeshParticle[], input: MeshStepInput): void {
  const { width, height, dt, frame, pointer } = input;
  const scrollY = input.scrollY ?? 0;
  const velocityImpact = Math.min(Math.max((input.scrollVelocity ?? 0) * 0.22, -15), 15);
  const rng = input.rng ?? Math.random;
  const scale = meshViewportScale(width, height);
  const pull = pointer && pointer.holdMs !== null ? meshAttraction(pointer.holdMs) : 0;
  const decay = 1 - Math.pow(1 - 0.075, dt);
  const fade = Math.pow(0.92, dt);
  const pad = MESH_WRAP_PADDING;

  for (const p of particles) {
    if (dt > 0) {
      p.y += (p.vy - velocityImpact * p.depth * 0.08) * dt;
      p.x += (p.vx + Math.sin(p.angle) * p.wobble) * dt;
      p.angle += p.angleSpeed * dt;
      if (p.y < -pad || p.y > height + pad) {
        p.y = p.y < -pad ? height + pad : -pad;
        p.x = rng() * width;
        p.offsetX = 0;
        p.offsetY = 0;
      }
      if (p.x < -50) p.x = width + 50;
      if (p.x > width + 50) p.x = -50;
    }

    const visualY = wrapMeshY(p.y - scrollY * p.depth * 0.12, height);

    if (pointer && dt > 0) {
      if (pointer.holdMs !== null) {
        const k = 1 - Math.pow(1 - Math.min(1, pull * p.depth), dt);
        p.offsetX += (pointer.x - p.x - p.offsetX) * k;
        p.offsetY += (pointer.y - visualY - p.offsetY) * k;
      } else {
        p.offsetX -= p.offsetX * decay;
        p.offsetY -= p.offsetY * decay;
        const dx = pointer.x - (p.x + p.offsetX);
        const dy = pointer.y - (visualY + p.offsetY);
        const dist = Math.sqrt(dx * dx + dy * dy);
        const reach = 105 * scale;
        if (dist < reach) {
          const force = (reach - dist) / reach;
          const safe = Math.max(dist, 0.001);
          const strength = p.charge > 0 ? 1.65 : 3.1;
          const bend = Math.sin(p.lifePhase + frame * p.pulseSpeed) * force * 1.35;
          p.offsetX +=
            ((dx / safe) * force * strength * p.charge + (-dy / safe) * bend) * p.depth * dt;
          p.offsetY +=
            ((dy / safe) * force * strength * p.charge + (dx / safe) * bend) * p.depth * dt;
          p.influence = Math.max(p.influence, force);
        }
      }
    } else if (dt > 0) {
      p.offsetX -= p.offsetX * decay;
      p.offsetY -= p.offsetY * decay;
    }

    p.influence *= fade;
    p.drawX = p.x + p.offsetX;
    p.drawY = visualY + p.offsetY;
  }
}

/** Max link distance between two particles in the same depth band. */
export function meshLinkReach(depth: number, scale: number, intensity: MeshIntensity): number {
  const base = (depth > 0.8 ? 120 : 85) * scale;
  return intensity === 'intense' ? base * 1.35 : base;
}

/** Link opacity: fades with distance, brighter in the front layer and near the pointer. */
export function meshLinkAlpha(
  dist: number,
  reach: number,
  depth: number,
  intensity: MeshIntensity,
  influence: number,
): number {
  if (dist >= reach) return 0;
  const intense = intensity === 'intense';
  const layer = depth > 0.8 ? (intense ? 0.75 : 0.55) : intense ? 0.55 : 0.35;
  return ((reach - dist) / reach) * layer * (1 + influence * 0.75);
}
