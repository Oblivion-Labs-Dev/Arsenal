/** All positions are in plate pixels: the pixel grid of the art plate image the scene is drawn over. */
export interface Point {
  x: number;
  y: number;
}

export interface Rect {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/** A glass ring as an ellipse: centre, semi-axes, rotation in degrees (clockwise on screen). */
export interface Orbit {
  cx: number;
  cy: number;
  a: number;
  b: number;
  rot: number;
  /** Radians per second; the sign sets the direction of travel. */
  speed: number;
}

/** Where each live element sits on a plate. One map drives every component. */
export interface SceneMap {
  width: number;
  height: number;
  /** The glowing core. */
  sphere: { x: number; y: number; r: number };
  /** Box around the glass rings; ring streaks only draw inside it. */
  rings: Rect;
  /** Ellipses that orbit lights travel along. */
  orbits: readonly Orbit[];
  /** Waterfall boxes. */
  falls: readonly Rect[];
  /** Mist band at the foot of the falls. */
  mist: Rect;
  /** Where the lake starts, and where its ripples spread from. */
  horizonY: number;
  ripple: Point;
  /** Vertical light beam from the core down into the island. */
  beam: { x: number; y0: number; y1: number };
  /** Area that must stay visible on narrow screens. */
  focus: Rect;
}

export type ComponentName = "water" | "falls" | "rings" | "orbits" | "sphere" | "beam";
