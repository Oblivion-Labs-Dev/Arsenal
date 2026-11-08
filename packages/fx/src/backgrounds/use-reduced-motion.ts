'use client';

import { useEffect, useState } from 'react';
import { onMotionPreferenceChange, shouldReduceMotion } from '@arsenal/motion';

/**
 * True when motion should be reduced: the OS setting or `<html data-motion="paused">`. Starts
 * false on the server and settles on mount, so markup stays hydration-safe.
 */
export function useReducedMotionGate(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    setReduced(shouldReduceMotion());
    return onMotionPreferenceChange(setReduced);
  }, []);
  return reduced;
}
