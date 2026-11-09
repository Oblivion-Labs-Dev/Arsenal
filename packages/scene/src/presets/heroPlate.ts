import type { ComponentName, Rect, SceneMap } from "../types.js";

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

/** One piece of the hero plate: the region of the art it shows and the live layers that animate it. */
export interface PlatePiece {
  crop: Rect;
  components: readonly ComponentName[];
}

/**
 * The hero plate cut into its pieces, measured on the plate (same composition in dark and light),
 * so each can be shown on its own with `<CinematicPlate crop={…} components={…} />`.
 */
export const HERO_PLATE_PIECES = {
  "island-base": { crop: { x0: 540, y0: 470, x1: 1410, y1: 740 }, components: ["water", "falls"] },
  "bonsai-tree": { crop: { x0: 595, y0: 345, x1: 915, y1: 610 }, components: [] },
  waterfall: { crop: { x0: 860, y0: 585, x1: 1170, y1: 800 }, components: ["falls", "water"] },
  "water-basin": { crop: { x0: 520, y0: 690, x1: 1520, y1: 905 }, components: ["water"] },
  "orbital-ring": { crop: { x0: 760, y0: 110, x1: 1460, y1: 495 }, components: ["rings", "orbits"] },
  "core-sphere": { crop: { x0: 1010, y0: 235, x1: 1250, y1: 455 }, components: ["sphere", "orbits"] },
  "service-node": { crop: { x0: 1250, y0: 150, x1: 1400, y1: 250 }, components: ["orbits"] },
  "data-path": { crop: { x0: 1000, y0: 330, x1: 1300, y1: 600 }, components: ["beam", "orbits", "sphere"] },
  "scene-accents": { crop: { x0: 1150, y0: 470, x1: 1420, y1: 650 }, components: ["water"] },
} as const satisfies Record<string, PlatePiece>;

export type HeroPlatePieceId = keyof typeof HERO_PLATE_PIECES;
