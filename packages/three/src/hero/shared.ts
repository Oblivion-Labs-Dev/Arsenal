import { createContext, useContext } from 'react';
import type { ThreeElements } from '@react-three/fiber';

/** Detail level: fewer instances and cheaper materials on weaker devices. */
export type HeroQuality = 'high' | 'medium' | 'low';

/** Position, rotation, scale and the other group props every hero piece passes through. */
export type HeroGroupProps = Omit<ThreeElements['group'], 'ref' | 'children'>;

export type Vec3 = readonly [number, number, number];

/** Props every animated hero piece shares. */
export interface HeroPieceProps {
  /** Light-theme materials (paper, brass, sage) instead of the dark ones. */
  light?: boolean;
  /** Freeze motion on a calm, composed still. */
  reducedMotion?: boolean;
}

/** Cheap deterministic 2D noise in [-1, 1]; the island, strata and accents share it. */
export function seededNoise(x: number, z: number): number {
  return Math.sin(x * 9.13 + z * 4.77) * Math.cos(z * 11.3 - x * 2.19);
}

/** Scene time for a frame: the clock while animating, a fixed still frame with reduced motion. */
export function heroTime(elapsed: number, reducedMotion: boolean, still = 0): number {
  return reducedMotion ? still : elapsed;
}

/** Scene-wide defaults a `HeroStage` hands its pieces; a piece's own prop always wins. */
export interface HeroEnv {
  light: boolean;
  reducedMotion: boolean;
}

export const HeroEnvContext = createContext<HeroEnv>({ light: false, reducedMotion: false });

/** Resolve a piece's `light` / `reducedMotion` against the surrounding stage. */
export function useHeroEnv(light?: boolean, reducedMotion?: boolean): HeroEnv {
  const env = useContext(HeroEnvContext);
  return { light: light ?? env.light, reducedMotion: reducedMotion ?? env.reducedMotion };
}
