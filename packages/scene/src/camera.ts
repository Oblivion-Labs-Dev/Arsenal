import type { StageFit } from './fit.js';
import type { Point, SceneMap } from './types.js';

/**
 * The plate "camera": a small 2D move of the fitted stage (pan + zoom) that stands in for a
 * dolly. Idle holds still apart from a damped pointer parallax; a focused point draws the frame
 * toward it; a moving subject (a packet) is followed gently; scrolling out of the hero pushes in
 * a little. Zoom pivots on the map's sphere. Everything is springed, nothing spins, and reduced
 * motion should use `IDENTITY_POSE`.
 */
export interface CameraPose {
  /** Pan in screen px, applied after the zoom. */
  x: number;
  y: number;
  /** Zoom around the sphere, 1 = the fitted composition. */
  scale: number;
}

export interface CameraInput {
  /** Pointer over the hero, each axis in -1..1 (0 when unknown or touch). */
  pointer: Point;
  /** Point to frame (selected or failed element), in plate px. Outweighs `packet`. */
  focus: Point | null;
  /** Moving subject to follow, in plate px. */
  packet: Point | null;
  /** How far the hero has scrolled out of view, 0..1. */
  scroll: number;
}

export interface CameraTuning {
  /** Max parallax pan in screen px per axis. */
  parallaxX: number;
  parallaxY: number;
  /** Fraction of the distance to the sphere the frame moves toward a focus / packet. */
  focusPull: number;
  packetPull: number;
  /** Extra zoom while framing a focus / packet. */
  focusZoom: number;
  packetZoom: number;
  /** Zoom and lift (screen px) at full scroll-out. */
  scrollZoom: number;
  scrollLift: number;
}

export const IDENTITY_POSE: Readonly<CameraPose> = Object.freeze({ x: 0, y: 0, scale: 1 });

/** The values tuned on the amsborse.github.io hero. */
export const DEFAULT_CAMERA: Readonly<CameraTuning> = Object.freeze({
  parallaxX: 9,
  parallaxY: 5,
  focusPull: 0.07,
  packetPull: 0.025,
  focusZoom: 0.035,
  packetZoom: 0.012,
  scrollZoom: 0.05,
  scrollLift: 28,
});

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const finite = (v: number, fallback = 0) => (Number.isFinite(v) ? v : fallback);

/** Where the camera wants to be, in screen px for a stage fitted at `fit.scale`. */
export function cameraTarget(
  map: Pick<SceneMap, 'sphere'>,
  input: CameraInput,
  fit: Pick<StageFit, 'scale'>,
  tuning: CameraTuning = DEFAULT_CAMERA,
): CameraPose {
  const px = clamp(finite(input.pointer.x), -1, 1);
  const py = clamp(finite(input.pointer.y), -1, 1);
  const scroll = clamp(finite(input.scroll), 0, 1);
  // Parallax moves the scene against the pointer, so the sculpture reads as the near layer.
  let x = -px * tuning.parallaxX;
  let y = -py * tuning.parallaxY - scroll * tuning.scrollLift;
  let scale = 1 + scroll * tuning.scrollZoom;
  const lead = input.focus ?? input.packet;
  if (lead) {
    const pull = input.focus ? tuning.focusPull : tuning.packetPull;
    // Bring the subject toward the sphere's axis: the frame moves toward it.
    x += (map.sphere.x - lead.x) * fit.scale * pull;
    y += (map.sphere.y - lead.y) * fit.scale * pull;
    scale += input.focus ? tuning.focusZoom : tuning.packetZoom;
  }
  return { x, y, scale };
}

/**
 * One critically damped spring step (exact for a constant target), so the move eases in and
 * out with no overshoot and stays stable at any frame time.
 */
export function springStep(
  value: number,
  velocity: number,
  target: number,
  omega: number,
  dt: number,
): [number, number] {
  const offset = value - target;
  const decay = Math.exp(-omega * dt);
  const k = velocity + omega * offset;
  return [target + (offset + k * dt) * decay, (velocity - omega * k * dt) * decay];
}

/** Advance `pose` / `velocity` in place one spring step toward `goal`. */
export function stepPose(
  pose: CameraPose,
  velocity: CameraPose,
  goal: CameraPose,
  dt: number,
  omega = 5.5,
): void {
  [pose.x, velocity.x] = springStep(pose.x, velocity.x, goal.x, omega, dt);
  [pose.y, velocity.y] = springStep(pose.y, velocity.y, goal.y, omega, dt);
  [pose.scale, velocity.scale] = springStep(pose.scale, velocity.scale, goal.scale, omega, dt);
}

/**
 * The stage transform (CSS translate + scale, origin top-left) for a pose. Zoom is around the
 * sphere; pan is then limited so any edge of the frame the fitted plate covered stays covered
 * (no page showing at the sides).
 */
export function stageTransform(
  map: Pick<SceneMap, 'width' | 'height' | 'sphere'>,
  fit: StageFit,
  frame: { width: number; height: number },
  pose: CameraPose,
): CameraPose {
  const s = Math.max(1, pose.scale);
  const w = map.width * fit.scale;
  const h = map.height * fit.scale;
  const ox = fit.x + map.sphere.x * fit.scale * (1 - s);
  const oy = fit.y + map.sphere.y * fit.scale * (1 - s);
  const limit = (pan: number, origin: number, start: number, size: number, span: number) => {
    let lo = -Infinity;
    let hi = Infinity;
    if (start <= 0) hi = -origin; // left/top edge was covered
    if (start + size >= span) lo = span - origin - size * s; // right/bottom edge was covered
    return lo > hi ? pan : clamp(pan, lo, hi);
  };
  return {
    x: ox + limit(pose.x, ox, fit.x, w, frame.width),
    y: oy + limit(pose.y, oy, fit.y, h, frame.height),
    scale: s,
  };
}

export const poseSettled = (pose: CameraPose, target: CameraPose, velocity: CameraPose) =>
  Math.abs(pose.x - target.x) < 0.05 &&
  Math.abs(pose.y - target.y) < 0.05 &&
  Math.abs(pose.scale - target.scale) < 0.0002 &&
  Math.abs(velocity.x) < 0.05 &&
  Math.abs(velocity.y) < 0.05 &&
  Math.abs(velocity.scale) < 0.0002;
