/** Pure state transitions for the studio turntable, using milliseconds from a monotonic clock. */
export const AUTO_ROTATE_RESUME_MS = 4_000;
export const AUTO_ROTATE_PERIOD_SECONDS = 55;

export interface AutoRotateState {
  dragging: boolean;
  resumeAt: number;
}

export const INITIAL_AUTO_ROTATE_STATE: AutoRotateState = { dragging: false, resumeAt: 0 };

export function autoRotateStart(_state: AutoRotateState, _now: number): AutoRotateState {
  return { dragging: true, resumeAt: Number.POSITIVE_INFINITY };
}

export function autoRotateEnd(_state: AutoRotateState, now: number): AutoRotateState {
  return { dragging: false, resumeAt: now + AUTO_ROTATE_RESUME_MS };
}

export function shouldAutoRotate(state: AutoRotateState, now: number, enabled: boolean): boolean {
  return enabled && !state.dragging && now >= state.resumeAt;
}

/** OrbitControls.autoRotateSpeed for one full turn every `periodSeconds` (when update gets a delta). */
export function autoRotateSpeed(periodSeconds: number): number {
  return 60 / periodSeconds;
}

export const ORBIT_POLAR_MIN = 0.12;
export const ORBIT_POLAR_MAX = Math.PI / 2 + 0.12;

/** Normalized discrete Gaussian taps, including their symmetric partners. */
export function gaussianWeights(sigma: number, radius = 4): number[] {
  const safeSigma = Math.max(sigma, Number.EPSILON);
  const weights = Array.from({ length: radius + 1 }, (_, i) => Math.exp(-(i * i) / (2 * safeSigma * safeSigma)));
  const sum = weights[0] + 2 * weights.slice(1).reduce((total, weight) => total + weight, 0);
  return weights.map((weight) => weight / sum);
}
