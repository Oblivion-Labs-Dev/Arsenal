import * as THREE from 'three';

/** Interaction state of a node, path or ring, matching the hero's interaction states sheet. */
export type HeroStatus = 'idle' | 'hover' | 'selected' | 'dependency' | 'failure' | 'recovery';

/** The hero palette: amber accent, green success, red error, plus light-theme brass. */
export const HERO_COLORS = {
  accent: '#ffc766',
  accentLight: '#9b6a32',
  success: '#5bd68d',
  error: '#ff686b',
  muted: '#a8a29e',
} as const;

/** Seconds a recovery spends fading red → green, then green → resting amber. */
export const RECOVERY_TO_GREEN = 1.6;
export const RECOVERY_SETTLE = 0.8;

const ACCENT = new THREE.Color(HERO_COLORS.accent);
const ACCENT_LIGHT = new THREE.Color(HERO_COLORS.accentLight);
const SUCCESS = new THREE.Color(HERO_COLORS.success);
const ERROR = new THREE.Color(HERO_COLORS.error);

/**
 * Colour for a status `elapsed` seconds after it began. Failure holds red; recovery eases red to
 * green and then settles back to the resting accent. Writes into `target` and returns it.
 */
export function statusColor(
  status: HeroStatus,
  elapsed: number,
  light: boolean,
  target: THREE.Color = new THREE.Color(),
): THREE.Color {
  const rest = light ? ACCENT_LIGHT : ACCENT;
  if (status === 'failure') return target.copy(ERROR);
  if (status === 'recovery') {
    const t = Number.isNaN(elapsed) ? 0 : Math.max(0, elapsed);
    if (t < RECOVERY_TO_GREEN) return target.copy(ERROR).lerp(SUCCESS, t / RECOVERY_TO_GREEN);
    return target.copy(SUCCESS).lerp(rest, Math.min((t - RECOVERY_TO_GREEN) / RECOVERY_SETTLE, 1));
  }
  return target.copy(rest);
}

/** Whether a status draws attention (rings, brighter bodies). */
export function isFocused(status: HeroStatus): boolean {
  return status === 'hover' || status === 'selected';
}

/**
 * Remembers when each keyed status last changed, on the scene clock, so recoveries and pulses
 * start from the moment the state arrived rather than from page load.
 */
export class StatusClock {
  private readonly since = new Map<string, { status: HeroStatus; at: number }>();

  elapsed(key: string, status: HeroStatus, now: number): number {
    const prev = this.since.get(key);
    if (!prev || prev.status !== status) {
      this.since.set(key, { status, at: now });
      return 0;
    }
    return now - prev.at;
  }
}
