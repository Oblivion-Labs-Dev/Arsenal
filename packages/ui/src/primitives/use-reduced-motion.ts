'use client';

import { useEffect, useState } from 'react';
import { onMotionPreferenceChange, shouldReduceMotion } from '@arsenal/motion';

/**
 * React view of the Arsenal motion gate: true when the OS asks for reduced motion or the page sets
 * `<html data-motion="paused">`. Starts false on the server so markup matches before hydration.
 */
export function useReducedMotionGate(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    setReduced(shouldReduceMotion());
    return onMotionPreferenceChange(() => setReduced(shouldReduceMotion()));
  }, []);
  return reduced;
}
