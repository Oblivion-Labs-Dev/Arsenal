import type { SceneMap } from "../types.js";

/**
 * The amsborse.github.io hero plate (1672×941): a glowing core inside three glass rings
 * above a floating island, with two falls into a lake. Measured on the plate image itself;
 * the plate is an illustration, not a picture of any real system.
 */
export const HERO_PLATE: SceneMap = {
  width: 1672,
  height: 941,
  sphere: { x: 1130, y: 343, r: 92 },
  rings: { x0: 770, y0: 118, x1: 1452, y1: 480 },
  orbits: [
    { cx: 1110, cy: 297, a: 336, b: 85, rot: -4, speed: 0.32 },
    { cx: 1130, cy: 400, a: 255, b: 85, rot: -10, speed: -0.41 },
    { cx: 1110, cy: 325, a: 209, b: 118, rot: 75.5, speed: 0.27 },
  ],
  falls: [
    { x0: 898, y0: 605, x1: 1008, y1: 722 },
    { x0: 1036, y0: 645, x1: 1146, y1: 735 },
  ],
  mist: { x0: 880, y0: 705, x1: 1170, y1: 790 },
  horizonY: 712,
  ripple: { x: 1000, y: 716 },
  beam: { x: 1148, y0: 436, y1: 576 },
  focus: { x0: 640, y0: 100, x1: 1470, y1: 770 },
};
