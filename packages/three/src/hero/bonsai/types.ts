// Shared contract for the studio bonsai. Every bonsai module codes against these types, so the
// skeleton, trunk mesher, foliage and studio can be built and tested independently.
//
// Units and frame: +Y is up, the trunk base (soil line) sits at the origin, and the tree is about
// 2 units tall. The pot, when shown, sits below y = 0 with its soil surface at y = 0.

import type { HeroQuality } from '../shared';

export type V3 = [number, number, number];

export type BonsaiSeason = 'summer' | 'autumn';

export type BonsaiBranchKind =
  /** The main stem, from the soil to the apex. Exactly one per skeleton, always index 0. */
  | 'trunk'
  /** Living branches of order 1 (primary tier), 2 (secondary) and 3 (tertiary twigs). */
  | 'branch'
  /** Dead-wood stubs: pale, stripped, no foliage. Excluded from the pipe-model check. */
  | 'jin'
  /** Nebari surface roots flaring from the trunk base into the soil. Excluded from the pipe check. */
  | 'root';

export interface BonsaiBranch {
  /** Index of this branch in `BonsaiSkeleton.branches`. */
  id: number;
  kind: BonsaiBranchKind;
  /** 0 for the trunk and roots, 1 primary, 2 secondary, 3 tertiary. */
  order: number;
  /** Centreline samples from base to tip (at least 3). */
  points: V3[];
  /** Radius at each centreline sample; same length as `points`. Never increases toward the tip. */
  radii: number[];
  /**
   * Where this branch leaves its parent: `parent` is a branch id and `index` the parent's point
   * index it starts at. `null` for the trunk. Roots attach to the trunk at index 0.
   *
   * Pipe model (living branches only): for every parent point index `i` that has living children
   * attached, `radii[i]^2 ≈ radii[i + 1]^2 + Σ child.radii[0]^2` within 5% (relative to the left side).
   */
  attach: { parent: number; index: number } | null;
}

export interface BonsaiPad {
  /** Pad (foliage cloud) centre in tree space. */
  center: V3;
  /** Ellipsoid semi-axes; y is the flattened one (pads are wide and shallow). */
  radii: V3;
  /** Rotation of the ellipsoid about +Y, radians. */
  yaw: number;
  /** The living branch whose tip this pad crowns. */
  branch: number;
}

/** The pale silver-grey shari (stripped bark) strip running up one side of the trunk. */
export interface BonsaiShari {
  /** Branch id the strip lies on (normally the trunk, 0). */
  branch: number;
  /** Start and end along the branch, 0 = base, 1 = tip. */
  from: number;
  to: number;
  /** Angle around the branch where the strip is centred, radians. */
  angle: number;
  /** Angular half-width of the strip, radians. */
  halfWidth: number;
}

export interface BonsaiSkeleton {
  seed: number;
  branches: BonsaiBranch[];
  pads: BonsaiPad[];
  shari: BonsaiShari;
  /** Axis-aligned bounds of the whole tree including pads. */
  bounds: { min: V3; max: V3 };
}

export interface BonsaiOptions {
  /** A different tree from the same rules. Default 7. */
  seed?: number;
  quality?: HeroQuality;
  /** Leaf-card density multiplier, 0.25–2. Default 1. */
  foliageDensity?: number;
}

export const BONSAI_DEFAULT_SEED = 7;

/** Triangle budgets for the whole tree (trunk + roots + leaves + pot). */
export const BONSAI_TRIANGLE_BUDGET: Record<HeroQuality, number> = {
  high: 120_000,
  medium: 60_000,
  low: 25_000,
};

/**
 * Texture files, served from a base URL (default `/assets/bonsai/`). Sources live in
 * `packages/three/assets/bonsai/` and are copied into the playground's public folder.
 * The leaf atlas is a 2×2 grid of RGBA leaf-cluster variants (alpha = cut-out); the thickness map
 * uses the same layout (white = thin, lets light through).
 */
export const BONSAI_TEXTURE_FILES = {
  barkAlbedo: 'bark-albedo.webp',
  barkNormal: 'bark-normal.webp',
  barkRoughness: 'bark-roughness.webp',
  leafAtlas: 'leaf-atlas.webp',
  leafThickness: 'leaf-thickness.webp',
  mossAlbedo: 'moss-albedo.webp',
  mossNormal: 'moss-normal.webp',
  clayAlbedo: 'clay-albedo.webp',
  clayRoughness: 'clay-roughness.webp',
} as const;

export type BonsaiTextureKey = keyof typeof BONSAI_TEXTURE_FILES;

export const BONSAI_TEXTURE_BASE = '/assets/bonsai/';

/** Palettes. Dark matches the plate: chartreuse sunlit tops falling to deep olive undersides. */
export const BONSAI_PALETTE = {
  dark: {
    leafTop: '#80a83a',
    leafMid: '#4b702c',
    leafDeep: '#1e3014',
    bark: '#664a36',
    shari: '#4a4036',
  },
  light: {
    leafTop: '#8fb23c',
    leafMid: '#4d7a24',
    leafDeep: '#25401a',
    bark: '#6a5139',
    shari: '#a89a86',
  },
  autumn: { leafTop: '#e0a33a', leafMid: '#b8562a', leafDeep: '#5a2414' },
} as const;
