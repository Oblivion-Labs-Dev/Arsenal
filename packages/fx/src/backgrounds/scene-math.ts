import { mixRgb, rgba, type Rgb } from './color';

/** Pure maths shared by the composed scenes (InfinityScene, GalaxyScene, ImmersiveBackground, SpotlightCard). */

export type SceneOffset = { x: number; y: number };

export type SceneRect = { left: number; top: number; width: number; height: number };

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
const finite = (v: number) => (Number.isFinite(v) ? v : 0);

/**
 * How far a scene drifts toward the pointer: the pointer's distance from the scene centre times
 * `strength`, clamped to ±`max` px. Non-finite input yields no drift.
 */
export function pointerParallaxOffset(
  clientX: number,
  clientY: number,
  rect: SceneRect,
  strength = 0.034,
  max = 28,
): SceneOffset {
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const limit = Math.abs(finite(max));
  return {
    x: clamp(finite((clientX - cx) * strength), -limit, limit) + 0,
    y: clamp(finite((clientY - cy) * strength), -limit, limit) + 0,
  };
}

/** Scroll drift of the infinity scene: the ambient haze sinks while the symbol lifts slightly. */
export function infinitySceneScrollOffsets(
  scrollY: number,
  reduced = false,
): { ambient: number; symbol: number } {
  if (reduced) return { ambient: 0, symbol: 0 };
  const y = clamp(finite(scrollY), 0, 600);
  return { ambient: y * 0.032, symbol: y * -0.017 + 0 };
}

/** Scroll drift of the three immersive background layers (back is slowest). */
export function immersiveLayerOffsets(
  scrollY: number,
  reduced = false,
): { back: number; mid: number; front: number } {
  if (reduced) return { back: 0, mid: 0, front: 0 };
  const y = clamp(finite(scrollY), 0, 1200);
  return { back: y * 0.03, mid: y * 0.055, front: y * 0.075 };
}

/** Pointer position inside a box as percentages plus centre-relative -1..1 coordinates. */
export function pointerInBox(
  clientX: number,
  clientY: number,
  rect: SceneRect,
): { px: number; py: number; nx: number; ny: number } {
  const w = rect.width > 0 ? rect.width : 1;
  const h = rect.height > 0 ? rect.height : 1;
  const fx = clamp(finite((clientX - rect.left) / w), 0, 1);
  const fy = clamp(finite((clientY - rect.top) / h), 0, 1);
  return { px: fx * 100, py: fy * 100, nx: fx * 2 - 1, ny: fy * 2 - 1 };
}

/** Angle in degrees from the box centre to the pointer (0 = right, 90 = down). */
export function pointerAngleDeg(nx: number, ny: number): number {
  if (!Number.isFinite(nx) || !Number.isFinite(ny) || (nx === 0 && ny === 0)) return 0;
  return Math.round(((Math.atan2(ny, nx) * 180) / Math.PI) * 100) / 100 + 0;
}

export type GradientStop = { offset: number; color: string };

/** Left-to-right stroke gradient of the infinity mark: left colour, bright centre, right colour. */
export function infinityMarkStops(left: Rgb, right: Rgb, center: Rgb): GradientStop[] {
  const mid = mixRgb(mixRgb(left, right, 0.5), center, 0.55);
  return [
    { offset: 0, color: rgba(left, 0.88) },
    { offset: 0.38, color: rgba(mid, 0.45) },
    { offset: 0.5, color: rgba(center, 0.95) },
    { offset: 0.62, color: rgba(mid, 0.42) },
    { offset: 1, color: rgba(right, 0.82) },
  ];
}
