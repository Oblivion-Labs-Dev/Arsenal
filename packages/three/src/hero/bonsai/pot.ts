import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import type { HeroQuality } from '../shared';

/** Pot footprint: a soft rounded oval (superellipse) the wall profile is swept around. */
const FOOT_A = 0.6;
const FOOT_B = 0.385;
const FOOT_POWER = 2.6;
/** Where the moss meets the inner wall, as an offset from the footprint (under the lip). */
const MOSS_EDGE = -0.016;
/** Moss mound height above the soil line at the centre of the pot. */
export const MOSS_MOUND = 0.036;
/** Floor height of the studio: the stand's legs end here. */
export const POT_FLOOR_Y = -0.5;

/**
 * Wall profile as (offset from the footprint, height): rounded foot, gently flaring outer wall,
 * thick rounded rim peaking at y≈0.028, then down the inner wall to below the moss line.
 */
const PROFILE: ReadonlyArray<readonly [number, number]> = [
  [-0.06, -0.175],
  [-0.045, -0.172],
  [-0.035, -0.162],
  [-0.028, -0.14],
  [-0.016, -0.1],
  [-0.004, -0.055],
  [0.008, -0.018],
  [0.02, 0.002],
  [0.025, 0.014],
  [0.022, 0.024],
  [0.012, 0.028],
  [0, 0.026],
  [-0.012, 0.018],
  [-0.016, 0.004],
  [-0.018, -0.01],
];

const DETAIL: Record<
  HeroQuality,
  { around: number; boxSegments: number; mossRings: number; stoneDetail: number }
> = {
  high: { around: 96, boxSegments: 2, mossRings: 14, stoneDetail: 1 },
  medium: { around: 64, boxSegments: 2, mossRings: 10, stoneDetail: 1 },
  low: { around: 36, boxSegments: 1, mossRings: 7, stoneDetail: 0 },
};

function superellipse(t: number): readonly [number, number] {
  const e = 2 / FOOT_POWER;
  const c = Math.cos(t);
  const s = Math.sin(t);
  return [FOOT_A * Math.sign(c) * Math.abs(c) ** e, FOOT_B * Math.sign(s) * Math.abs(s) ** e];
}

/** Point on the footprint at angle `t`, plus its outward unit normal in the xz plane. */
function footprint(t: number): { x: number; z: number; nx: number; nz: number } {
  const [x, z] = superellipse(t);
  const [x0, z0] = superellipse(t - 1e-3);
  const [x1, z1] = superellipse(t + 1e-3);
  const tx = x1 - x0;
  const tz = z1 - z0;
  const len = Math.hypot(tx, tz) || 1;
  return { x, z, nx: tz / len, nz: -tx / len };
}

/** Rough perimeter of the footprint, for square-ish texels on the wall. */
function footprintPerimeter(): number {
  let length = 0;
  let prev = superellipse(0);
  for (let i = 1; i <= 256; i += 1) {
    const p = superellipse((i / 256) * Math.PI * 2);
    length += Math.hypot(p[0] - prev[0], p[1] - prev[1]);
    prev = p;
  }
  return length;
}

/** Moss surface height above the soil line at (x, z): a soft mound, lower toward the rim. */
export function mossHeight(x: number, z: number): number {
  const r2 = Math.min(1, (x / FOOT_A) ** 2 + (z / FOOT_B) ** 2);
  return -0.004 + (MOSS_MOUND + 0.004) * (1 - r2) ** 1.4;
}

function withColor(
  geometry: THREE.BufferGeometry,
  color: readonly [number, number, number],
): THREE.BufferGeometry {
  const count = geometry.getAttribute('position').count;
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i += 1) colors.set(color, i * 3);
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return geometry;
}

/** The pot body swept around the footprint, with a closed base. One indexed grid, no seam. */
function buildBody(around: number): THREE.BufferGeometry {
  const rows = PROFILE.length;
  const cols = around + 1;
  const positions = new Float32Array((rows * cols + 1) * 3);
  const uvs = new Float32Array((rows * cols + 1) * 2);
  const repeatsU = Math.max(1, Math.round(footprintPerimeter() * 2));
  const profileV: number[] = [0];
  for (let r = 1; r < rows; r += 1) {
    const [d0, y0] = PROFILE[r - 1]!;
    const [d1, y1] = PROFILE[r]!;
    profileV.push(profileV[r - 1]! + Math.hypot(d1 - d0, y1 - y0) * 2);
  }
  for (let c = 0; c < cols; c += 1) {
    const f = footprint((c / around) * Math.PI * 2);
    for (let r = 0; r < rows; r += 1) {
      const [d, y] = PROFILE[r]!;
      const i = r * cols + c;
      positions.set([f.x + f.nx * d, y, f.z + f.nz * d], i * 3);
      uvs.set([(c / around) * repeatsU, profileV[r]!], i * 2);
    }
  }
  const centre = rows * cols;
  positions.set([0, PROFILE[0]![1], 0], centre * 3);
  uvs.set([0.5, 0], centre * 2);
  const indices: number[] = [];
  for (let r = 0; r < rows - 1; r += 1) {
    for (let c = 0; c < around; c += 1) {
      const a = r * cols + c;
      const b = a + cols;
      indices.push(a, a + 1, b, b, a + 1, b + 1);
    }
  }
  for (let c = 0; c < around; c += 1) indices.push(centre, c + 1, c);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  // The first and last columns are the same place: share their normals so there is no seam.
  const normal = geometry.getAttribute('normal') as THREE.BufferAttribute;
  const n = new THREE.Vector3();
  for (let r = 0; r < rows; r += 1) {
    const first = r * cols;
    const last = first + around;
    n.set(
      normal.getX(first) + normal.getX(last),
      normal.getY(first) + normal.getY(last),
      normal.getZ(first) + normal.getZ(last),
    ).normalize();
    normal.setXYZ(first, n.x, n.y, n.z);
    normal.setXYZ(last, n.x, n.y, n.z);
  }
  return geometry;
}

function roundedBox(
  size: readonly [number, number, number],
  at: readonly [number, number, number],
  segments: number,
  radius: number,
): THREE.BufferGeometry {
  const box = new RoundedBoxGeometry(size[0], size[1], size[2], segments, radius);
  box.translate(at[0], at[1], at[2]);
  return box;
}

/** Clay pot, its four feet and the low stone stand, merged into one geometry (one draw call). */
function buildClay(quality: HeroQuality): THREE.BufferGeometry {
  const { around, boxSegments } = DETAIL[quality];
  const clay = [1, 1, 1] as const;
  const stand = [0.58, 0.55, 0.52] as const;
  const footY = PROFILE[0]![1] - 0.014;
  const parts: THREE.BufferGeometry[] = [withColor(buildBody(around), clay)];
  for (const [x, z] of [
    [-0.4, -0.22],
    [0.4, -0.22],
    [-0.4, 0.22],
    [0.4, 0.22],
  ] as const) {
    parts.push(
      withColor(roundedBox([0.13, 0.032, 0.085], [x, footY, z], boxSegments, 0.012), clay),
    );
  }
  const slabTop = footY - 0.016;
  const slabHeight = 0.075;
  parts.push(
    withColor(
      roundedBox([1.5, slabHeight, 1.0], [0, slabTop - slabHeight / 2, 0], boxSegments, 0.022),
      stand,
    ),
  );
  const legTop = slabTop - slabHeight;
  const legHeight = legTop - POT_FLOOR_Y;
  for (const [x, z] of [
    [-0.62, -0.38],
    [0.62, -0.38],
    [-0.62, 0.38],
    [0.62, 0.38],
  ] as const) {
    parts.push(
      withColor(
        roundedBox(
          [0.11, legHeight + 0.01, 0.11],
          [x, legTop - legHeight / 2, z],
          boxSegments,
          0.02,
        ),
        stand,
      ),
    );
  }
  // RoundedBoxGeometry is non-indexed; give every part an index so they merge.
  const indexed = parts.map((part) => {
    if (part.index) return part;
    const count = part.getAttribute('position').count;
    part.setIndex(Array.from({ length: count }, (_, i) => i));
    return part;
  });
  const merged = mergeGeometries(indexed);
  parts.forEach((part) => part.dispose());
  if (!merged) throw new Error('[arsenal/three] bonsai pot: geometry merge failed');
  return merged;
}

/** Moss surface filling the pot: a mounded fan from the centre to just under the lip. */
function buildMoss(quality: HeroQuality): THREE.BufferGeometry {
  const { around, mossRings } = DETAIL[quality];
  const cols = around + 1;
  const positions: number[] = [0, mossHeight(0, 0), 0];
  const uvs: number[] = [0, 0];
  for (let ring = 1; ring <= mossRings; ring += 1) {
    const k = ring / mossRings;
    for (let c = 0; c < cols; c += 1) {
      const t = (c / around) * Math.PI * 2;
      const f = footprint(t);
      // Small irregular lumps, strongest mid-way, zero at the centre and the wall.
      const lump =
        0.004 * k * (1 - k) * 4 * (Math.sin(t * 7 + k * 5) * 0.6 + Math.sin(t * 13 - k * 3) * 0.4);
      const x = (f.x + f.nx * MOSS_EDGE) * k;
      const z = (f.z + f.nz * MOSS_EDGE) * k;
      positions.push(x, mossHeight(x, z) + lump, z);
      uvs.push(x * 3, z * 3);
    }
  }
  const indices: number[] = [];
  for (let c = 0; c < around; c += 1) indices.push(0, 1 + c + 1, 1 + c);
  for (let ring = 1; ring < mossRings; ring += 1) {
    for (let c = 0; c < around; c += 1) {
      const a = 1 + (ring - 1) * cols + c;
      const b = a + cols;
      indices.push(a, a + 1, b, b, a + 1, b + 1);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

/** A few stones resting on the moss: x, z, size, yaw. Kept clear of the trunk base. */
export const POT_STONES: ReadonlyArray<readonly [number, number, number, number]> = [
  [-0.36, 0.13, 0.042, 0.4],
  [-0.27, -0.17, 0.03, 1.9],
  [0.31, 0.16, 0.036, 2.6],
  [0.42, -0.08, 0.026, 0.9],
  [0.18, -0.24, 0.022, 3.7],
  [-0.46, -0.02, 0.024, 5.1],
];

export interface PotGeometries {
  clay: THREE.BufferGeometry;
  moss: THREE.BufferGeometry;
  stones: THREE.BufferGeometry;
}

/** Build the pot's three geometries (clay+stand, moss, stone prototype) for a quality. */
export function buildPotGeometries(quality: HeroQuality = 'high'): PotGeometries {
  return {
    clay: buildClay(quality),
    moss: buildMoss(quality),
    stones: new THREE.IcosahedronGeometry(1, DETAIL[quality].stoneDetail),
  };
}

function triangles(geometry: THREE.BufferGeometry): number {
  return (geometry.index ? geometry.index.count : geometry.getAttribute('position').count) / 3;
}

/** Total pot triangles for a quality, counting every instanced stone. */
export function potTriangleCount(quality: HeroQuality = 'high'): number {
  const g = buildPotGeometries(quality);
  const total = triangles(g.clay) + triangles(g.moss) + POT_STONES.length * triangles(g.stones);
  g.clay.dispose();
  g.moss.dispose();
  g.stones.dispose();
  return total;
}
