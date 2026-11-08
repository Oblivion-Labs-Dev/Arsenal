import type { Orbit, Point, Rect, SceneMap } from "./types.js";

export interface StageFit {
  /** CSS px per plate px. */
  scale: number;
  /** Stage offset inside the container, CSS px. */
  x: number;
  y: number;
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

/**
 * Place the plate in a container like `object-fit: cover`, anchored on the focus rect: the
 * subject stays as centred as the crop allows, and when the crop would cut into it the plate
 * shrinks until the focus rect fits. A plate shorter than the container sits on the bottom
 * edge. Up to `topSlack` of the height may stay uncovered at the top, so wide screens show
 * the full plate width instead of zooming in.
 */
export function fitPlate(
  map: Pick<SceneMap, "width" | "height" | "focus">,
  width: number,
  height: number,
  { topSlack = 0.1, focus = map.focus }: { topSlack?: number; focus?: Rect } = {}
): StageFit {
  if (width <= 0 || height <= 0) return { scale: 0, x: 0, y: 0 };
  const cover = Math.max(width / map.width, (height * (1 - topSlack)) / map.height);
  const fitFocus = Math.min(width / (focus.x1 - focus.x0), height / (focus.y1 - focus.y0));
  const scale = Math.min(cover, fitFocus);
  const w = map.width * scale;
  const h = map.height * scale;
  const cx = ((focus.x0 + focus.x1) / 2) * scale;
  const cy = ((focus.y0 + focus.y1) / 2) * scale;
  const place = (size: number, content: number, centre: number, slack: number) =>
    content <= size ? (size - content) * slack : clamp(size / 2 - centre, size - content, 0);
  return { scale, x: place(width, w, cx, 0.5), y: place(height, h, cy, 1) };
}

/** Plate pixel → percentage of the plate, for CSS positioning of hotspots and callouts. */
export const platePercent = (map: Pick<SceneMap, "width" | "height">, point: Point) => ({
  left: `${(point.x / map.width) * 100}%`,
  top: `${(point.y / map.height) * 100}%`,
});

/** A point on an orbit at parameter angle `theta` (radians), in plate px. */
export function orbitPoint(o: Orbit, theta: number): Point {
  const r = (o.rot * Math.PI) / 180;
  const x = o.a * Math.cos(theta);
  const y = o.b * Math.sin(theta);
  return {
    x: o.cx + x * Math.cos(r) - y * Math.sin(r),
    y: o.cy + x * Math.sin(r) + y * Math.cos(r),
  };
}

/** Where the lead light of orbit `index` is at `time` seconds, matching the shader's phase. */
export function orbitLightAt(o: Orbit, index: number, time: number): Point {
  return orbitPoint(o, time * o.speed + index * 2.1);
}
