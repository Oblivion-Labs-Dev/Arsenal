import { createRng, type Rng } from './random';

export const MORPH_SHAPES = [
  'sphere',
  'torus',
  'wave',
  'cube',
  'pyramid',
  'galaxy',
  'fermat',
  'doubleHelix',
  'saturn',
  'mobius',
  'infinity',
  'vortex',
  'hourglass',
  'blackhole',
  'supernova',
  'conical',
] as const;

export type MorphShape = (typeof MORPH_SHAPES)[number];

export type Vec3 = { x: number; y: number; z: number };

export type MorphPoint = Vec3 & {
  id: number;
  /** Index into the colour list. */
  colorIndex: number;
  /** +1 or -1: which way the point swirls while morphing. */
  swirlDirection: number;
};

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

/** `n` points on a sphere of `radius`, spread by the golden angle. */
function fibonacciSphere(i: number, n: number, rx: number, ry: number): Vec3 {
  const y = n > 1 ? 1 - (i / (n - 1)) * 2 : 0;
  const rad = Math.sqrt(Math.max(0, 1 - y * y)) * rx;
  const theta = GOLDEN_ANGLE * i;
  return { x: Math.cos(theta) * rad, y: y * ry, z: Math.sin(theta) * rad };
}

/**
 * Target positions for `count` points forming `shape`, centred on the origin and roughly within
 * a 300-unit cube. Shapes that scatter use `rng`, so the same seed gives the same layout.
 */
export function morphShapeTargets(
  shape: MorphShape,
  count: number,
  seed: number | Rng = 1,
): Vec3[] {
  const rng = typeof seed === 'number' ? createRng(seed) : seed;
  const n = Math.max(0, Math.floor(count));
  const out: Vec3[] = Array.from({ length: n }, () => ({ x: 0, y: 0, z: 0 }));
  if (n === 0) return out;
  const set = (i: number, x: number, y: number, z: number) => {
    const p = out[i];
    if (!p) return;
    p.x = x;
    p.y = y;
    p.z = z;
  };

  switch (shape) {
    case 'sphere':
      for (let i = 0; i < n; i++) {
        const p = fibonacciSphere(i, n, 140, 140);
        set(i, p.x, p.y, p.z);
      }
      break;
    case 'torus': {
      const R = 110;
      const r = 45;
      const uCount = Math.max(1, Math.floor(Math.sqrt(n)));
      const vCount = Math.ceil(n / uCount);
      for (let i = 0; i < n; i++) {
        const u = ((i % uCount) / uCount) * Math.PI * 2;
        const v = (Math.floor(i / uCount) / vCount) * Math.PI * 2;
        set(
          i,
          (R + r * Math.cos(v)) * Math.cos(u),
          (R + r * Math.cos(v)) * Math.sin(u),
          r * Math.sin(v),
        );
      }
      break;
    }
    case 'wave': {
      const size = 260;
      const cols = Math.max(1, Math.floor(Math.sqrt(n)));
      const rows = Math.ceil(n / cols);
      for (let i = 0; i < n; i++) {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const u = (col / cols - 0.5) * Math.PI * 2;
        const v = (row / rows - 0.5) * Math.PI * 2;
        set(
          i,
          (col / cols - 0.5) * size,
          Math.sin(u * 2.5) * Math.cos(v * 2.5) * 45,
          (row / rows - 0.5) * size,
        );
      }
      break;
    }
    case 'cube': {
      const side = Math.max(2, Math.ceil(Math.cbrt(n)));
      let idx = 0;
      for (let x = 0; x < side && idx < n; x++) {
        for (let y = 0; y < side && idx < n; y++) {
          for (let z = 0; z < side && idx < n; z++) {
            set(
              idx++,
              (x / (side - 1) - 0.5) * 190,
              (y / (side - 1) - 0.5) * 190,
              (z / (side - 1) - 0.5) * 190,
            );
          }
        }
      }
      break;
    }
    case 'pyramid': {
      const height = 180;
      const baseWidth = 190;
      const layers = 10;
      let idx = 0;
      for (let l = 0; l < layers && idx < n; l++) {
        const hPct = l / (layers - 1);
        const currentY = (hPct - 0.4) * height;
        const currentWidth = (1 - hPct) * baseWidth;
        const inLayer = Math.max(4, Math.floor(((1 - hPct) / (layers / 2)) * n));
        const sidePoints = Math.ceil(Math.sqrt(inLayer));
        for (let r = 0; r < sidePoints && idx < n; r++) {
          for (let c = 0; c < sidePoints && idx < n; c++) {
            const xPct = sidePoints > 1 ? r / (sidePoints - 1) - 0.5 : 0;
            const zPct = sidePoints > 1 ? c / (sidePoints - 1) - 0.5 : 0;
            set(idx++, xPct * currentWidth, currentY, zPct * currentWidth);
          }
        }
      }
      while (idx < n) set(idx++, 0, height * 0.6, 0);
      break;
    }
    case 'galaxy': {
      const bulge = Math.floor(n * 0.35);
      for (let i = 0; i < n; i++) {
        if (i < bulge) {
          const y = bulge > 1 ? 1 - (i / (bulge - 1)) * 2 : 0;
          const rad = Math.sqrt(Math.max(0, 1 - y * y)) * (30 + rng() * 15);
          const phi = GOLDEN_ANGLE * i;
          set(i, Math.cos(phi) * rad, y * (25 + rng() * 10), Math.sin(phi) * rad);
        } else {
          const armPct = (i - bulge) / Math.max(1, n - bulge);
          const theta = armPct * 4 * Math.PI + (i % 2) * Math.PI;
          const dist = 35 + armPct * 135 + rng() * 12;
          set(i, Math.cos(theta) * dist, (rng() - 0.5) * 12, Math.sin(theta) * dist);
        }
      }
      break;
    }
    case 'fermat':
      for (let i = 0; i < n; i++) {
        const theta = i * 137.5 * (Math.PI / 180);
        const r = Math.sqrt(i) * 7.8 * Math.sqrt(450 / Math.max(450, n));
        set(i, r * Math.cos(theta), Math.sin(i * 0.08) * 8, r * Math.sin(theta));
      }
      break;
    case 'doubleHelix':
      for (let i = 0; i < n; i++) {
        const pct = i / n;
        const theta = pct * 6 * Math.PI + (i % 2) * Math.PI;
        set(i, Math.cos(theta) * 60, (pct - 0.5) * 260, Math.sin(theta) * 60);
      }
      break;
    case 'saturn': {
      const body = Math.floor(n * 0.4);
      for (let i = 0; i < n; i++) {
        if (i < body) {
          const p = fibonacciSphere(i, body, 45, 45);
          set(i, p.x, p.y, p.z);
        } else {
          const theta = (i / Math.max(1, n - body)) * Math.PI * 2;
          const ring = 75 + (i % 5) * 16 + rng() * 4;
          set(i, Math.cos(theta) * ring, (rng() - 0.5) * 4, Math.sin(theta) * ring);
        }
      }
      break;
    }
    case 'mobius':
      for (let i = 0; i < n; i++) {
        const u = (i / n) * Math.PI * 2;
        const v = ((i % 12) / 11 - 0.5) * 40;
        set(
          i,
          (110 + v * Math.cos(u / 2)) * Math.cos(u),
          (110 + v * Math.cos(u / 2)) * Math.sin(u),
          v * Math.sin(u / 2),
        );
      }
      break;
    case 'infinity':
      for (let i = 0; i < n; i++) {
        const t = (i / n) * Math.PI * 2;
        const scale = 150 / (3 - Math.cos(2 * t));
        const angle = rng() * Math.PI * 2;
        const scatter = rng() * 10;
        set(
          i,
          scale * Math.cos(t) + Math.cos(angle) * scatter,
          (scale * Math.sin(2 * t)) / 2 + Math.sin(angle) * scatter,
          Math.sin(t) * 40,
        );
      }
      break;
    case 'vortex':
      for (let i = 0; i < n; i++) {
        const pct = i / n;
        const r = 15 + pct * pct * 145;
        const theta = pct * 12 * Math.PI;
        set(i, Math.cos(theta) * r, (pct - 0.5) * 240, Math.sin(theta) * r);
      }
      break;
    case 'hourglass':
      for (let i = 0; i < n; i++) {
        const pct = i / n;
        const y = (pct - 0.5) * 240;
        const r = 20 + Math.abs(y) * 0.75;
        const theta = pct * 10 * Math.PI;
        set(i, Math.cos(theta) * r, y, Math.sin(theta) * r);
      }
      break;
    case 'blackhole': {
      const horizon = Math.floor(n * 0.25);
      for (let i = 0; i < n; i++) {
        if (i < horizon) {
          const p = fibonacciSphere(i, horizon, 25, 25);
          set(i, p.x, p.y, p.z);
        } else {
          const pct = (i - horizon) / Math.max(1, n - horizon);
          const theta = pct * 8 * Math.PI;
          const r = 35 + pct * 135;
          // Lensing: the disk bends more the closer it is to the horizon.
          set(i, Math.cos(theta) * r, Math.sin(theta) * (600 / (r + 1)), Math.sin(theta) * r);
        }
      }
      break;
    }
    case 'supernova': {
      const core = Math.floor(n * 0.35);
      const directions = Array.from({ length: 12 }, (_, j) => fibonacciSphere(j, 12, 1, 1));
      for (let i = 0; i < n; i++) {
        if (i < core) {
          const y = core > 1 ? 1 - (i / (core - 1)) * 2 : 0;
          const rad = Math.sqrt(Math.max(0, 1 - y * y)) * (15 + rng() * 10);
          const phi = GOLDEN_ANGLE * i;
          set(i, Math.cos(phi) * rad, y * (15 + rng() * 10), Math.sin(phi) * rad);
        } else {
          const dir = directions[i % directions.length] ?? { x: 0, y: 1, z: 0 };
          const dist = 30 + rng() * 140;
          set(i, dir.x * dist, dir.y * dist, dir.z * dist);
        }
      }
      break;
    }
    case 'conical':
      for (let i = 0; i < n; i++) {
        const pct = i / n;
        const r = pct * 140 + 15;
        const theta = pct * 14 * Math.PI;
        set(i, Math.cos(theta) * r, (pct - 0.5) * 220, Math.sin(theta) * r);
      }
      break;
  }
  return out;
}

/** Points start collapsed at the origin and fly out to their first shape. */
export function createMorphPoints(
  count: number,
  colors: number,
  seed: number | Rng = 1,
): MorphPoint[] {
  const rng = typeof seed === 'number' ? createRng(seed) : seed;
  const palette = Math.max(1, Math.floor(colors));
  return Array.from({ length: Math.max(0, Math.floor(count)) }, (_, id) => ({
    id,
    x: 0,
    y: 0,
    z: 0,
    colorIndex: id % palette,
    swirlDirection: rng() < 0.5 ? 1 : -1,
  }));
}

export const MORPH_DURATION_MS = 450;

/**
 * Eases each point toward its target. While a morph is in flight (`progress` < 1) targets are
 * swirled around the Y axis and rippled, so shapes pour into each other instead of cross-fading.
 * `dt` is in 60fps frames.
 */
export function stepMorphPoints(
  points: MorphPoint[],
  targets: readonly Vec3[],
  progress: number,
  dt: number,
): void {
  const p01 = Math.max(0, Math.min(1, progress));
  const swirl = p01 < 1 ? Math.sin(p01 * Math.PI) * 0.35 : 0;
  const ease = 1 - Math.pow(1 - 0.065, Math.max(0, dt));
  for (const p of points) {
    const t = targets[p.id];
    if (!t) continue;
    let tx = t.x;
    let ty = t.y;
    let tz = t.z;
    if (swirl > 0) {
      const angle = swirl * Math.PI * 0.8 * p.swirlDirection;
      const c = Math.cos(angle);
      const s = Math.sin(angle);
      tx = t.x * c - t.z * s;
      tz = t.z * c + t.x * s;
      ty = t.y + Math.sin(p01 * Math.PI * 1.5 + p.id * 0.1) * 8;
    }
    p.x += (tx - p.x) * ease;
    p.y += (ty - p.y) * ease;
    p.z += (tz - p.z) * ease;
  }
}

export type Projected = { sx: number; sy: number; depth: number; scale: number };

/** Rotates around Y then X and applies a simple perspective with focal length `fov`. */
export function projectPoint(
  p: Vec3,
  rotX: number,
  rotY: number,
  cx: number,
  cy: number,
  fov = 400,
): Projected {
  const cosY = Math.cos(rotY);
  const sinY = Math.sin(rotY);
  const cosX = Math.cos(rotX);
  const sinX = Math.sin(rotX);
  const x1 = p.x * cosY - p.z * sinY;
  const z1 = p.z * cosY + p.x * sinY;
  const y2 = p.y * cosX - z1 * sinX;
  const z2 = z1 * cosX + p.y * sinX;
  const scale = fov / Math.max(1e-3, fov + z2);
  return { sx: cx + x1 * scale, sy: cy + y2 * scale, depth: z2, scale };
}
