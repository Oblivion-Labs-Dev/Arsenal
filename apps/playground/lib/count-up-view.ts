/**
 * IntersectionObserver root margin for CountUp. Only the bottom edge is inset, so a number
 * sitting near the left or right edge of a phone screen still counts as in view.
 */
export const COUNT_UP_VIEW_MARGIN = '0px 0px -40px 0px';

type Box = { top: number; right: number; bottom: number; left: number };

/** Parses a CSS-style px margin shorthand (1–4 values) into top/right/bottom/left. */
export function parsePxMargin(margin: string): Box {
  const v = margin.trim().split(/\s+/).map((part) => Number.parseFloat(part));
  const [top, right = top, bottom = top, left = right] = v;
  return { top, right, bottom, left };
}

/** Whether a rect intersects the viewport after applying an IntersectionObserver root margin. */
export function intersectsWithMargin(rect: Box, viewport: { width: number; height: number }, margin: string) {
  const m = parsePxMargin(margin);
  const root = { top: -m.top, left: -m.left, right: viewport.width + m.right, bottom: viewport.height + m.bottom };
  return rect.left < root.right && rect.right > root.left && rect.top < root.bottom && rect.bottom > root.top;
}
