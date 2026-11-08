'use client';

import { useSyncExternalStore } from 'react';
import { onMotionPreferenceChange, shouldReduceMotion } from '@arsenal/motion';

const subscribe = (notify: () => void) => onMotionPreferenceChange(() => notify());
const serverSnapshot = () => false;

/** Live `shouldReduceMotion()`: reacts to the OS setting and `<html data-motion="paused">`. */
export function useReduceMotion(): boolean {
  return useSyncExternalStore(subscribe, shouldReduceMotion, serverSnapshot);
}
