'use client';

import { useEffect, useState, type RefObject } from 'react';
import { bindCanvasRunState, useReducedMotionGate } from '@arsenal/fx';

export type SceneFrameloop = 'always' | 'demand';

/**
 * Animate only while the scene is on screen, the tab is visible and motion is allowed. Otherwise
 * render on demand: R3F draws one complete still frame and then stops.
 */
export function sceneFrameloop(running: boolean, reduced: boolean): SceneFrameloop {
  return running && !reduced ? 'always' : 'demand';
}

/** Live frameloop for the scene inside `ref`, plus whether motion is reduced. */
export function useSceneFrameloop(ref: RefObject<HTMLElement | null>): {
  frameloop: SceneFrameloop;
  reduced: boolean;
} {
  const reduced = useReducedMotionGate();
  const [running, setRunning] = useState(false);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    return bindCanvasRunState(element, setRunning);
  }, [ref]);
  return { frameloop: sceneFrameloop(running, reduced), reduced };
}

/** Largest step a resumed scene may take, so a long pause never shows as a jump. */
export const MAX_SCENE_STEP = 1 / 20;

/** Largest step the grow-in intro may take: slow devices still finish it, a tab switch never pops it. */
export const MAX_INTRO_STEP = 1 / 4;

/** Advance a 0→1 intro by `delta` seconds; settles to exactly 1 once close. */
export function advanceIntro(current: number, delta: number, rate = 2.4): number {
  if (current >= 0.999) return 1;
  const step = Math.min(Math.max(delta, 0), MAX_INTRO_STEP);
  const next = 1 - (1 - current) * Math.exp(-rate * step);
  return next >= 0.999 ? 1 : next;
}
