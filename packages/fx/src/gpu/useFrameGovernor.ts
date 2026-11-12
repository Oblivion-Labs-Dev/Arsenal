import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react';
import { onMotionPreferenceChange, shouldReduceMotion } from '@arsenal/motion';
import {
  createFrameGovernor,
  type FrameGovernor,
  type FrameGovernorOptions,
} from './frame-governor';

/**
 * React binding for `createFrameGovernor`. Feed `frame(now)` from your own requestAnimationFrame
 * loop (it returns the tier synchronously, so the loop needs no state) and call `reset()` when the
 * loop pauses. The component re-renders only when the tier changes, never per frame. Reduced
 * motion follows the user's preference live and pins the last rung.
 *
 * The ladder and options are read once; remount (change `key`) to start over with new ones.
 */
export function useFrameGovernor<T>(
  ladder: readonly T[],
  options: Omit<FrameGovernorOptions<T>, 'reducedMotion'> = {},
) {
  const ref = useRef<FrameGovernor<T> | null>(null);
  if (!ref.current) {
    ref.current = createFrameGovernor(ladder, { ...options, reducedMotion: shouldReduceMotion() });
  }
  const governor = ref.current;

  useEffect(
    () => onMotionPreferenceChange((reduced) => governor.setReducedMotion(reduced)),
    [governor],
  );

  const tier = useSyncExternalStore(
    governor.subscribe,
    () => governor.tier,
    () => governor.tier,
  );
  const frame = useCallback((now: number) => governor.frame(now), [governor]);
  const reset = useCallback(() => governor.reset(), [governor]);
  return { tier, frame, reset, governor };
}
