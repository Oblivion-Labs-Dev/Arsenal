/**
 * Card-to-dialog flip. The dialog starts exactly over the element that opened it, showing a live
 * copy of that element on its back face, then travels to its resting place while growing and
 * turning over to show its content: one continuous movement. Closing plays the same path in
 * reverse, back into the origin.
 *
 * Pure DOM + Web Animations (transform and opacity only), so it runs on the compositor and needs
 * no layout library. Mark a child of the dialog with `data-flip-cover` to receive the copy.
 */
import { shouldReduceMotion } from "../motion-gate";

export const FLIP_MS = 620;
export const FLIP_EASE = "cubic-bezier(0.2, 0.8, 0.2, 1)";
const PERSPECTIVE = "perspective(1800px)";

/** Attributes removed from the cloned cover so it can never clash with the live original. */
export const DEFAULT_FLIP_STRIP_ATTRIBUTES: readonly string[] = ["id", "tabindex", "role"];

export interface RectLike {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface FlipTransform {
  sx: number;
  sy: number;
  from: string;
  to: string;
}

/** Transform that lays a box of `target` size over `origin`, flipped to show its back face. */
export function flipOriginTransform(target: RectLike, origin: RectLike): FlipTransform {
  const dx = origin.left + origin.width / 2 - (target.left + target.width / 2);
  const dy = origin.top + origin.height / 2 - (target.top + target.height / 2);
  const sx = target.width === 0 ? 1 : origin.width / target.width;
  const sy = target.height === 0 ? 1 : origin.height / target.height;
  return {
    sx,
    sy,
    from: `${PERSPECTIVE} translate(${dx}px, ${dy}px) scale(${sx}, ${sy}) rotateY(180deg)`,
    to: `${PERSPECTIVE} translate(0px, 0px) scale(1, 1) rotateY(0deg)`,
  };
}

export interface RunFlipOptions {
  /** Attributes stripped from the cloned cover (and its descendants). */
  stripAttributes?: readonly string[];
  /** Selector for the back-face element inside the dialog. */
  coverSelector?: string;
  /** Duration of the full flip in ms. */
  duration?: number;
}

export interface FlipRun {
  animation: Animation;
  restore: () => void;
}

function dressCover(
  cover: HTMLElement,
  origin: HTMLElement,
  originRect: RectLike,
  sx: number,
  sy: number,
  strip: readonly string[],
): void {
  const clone = origin.cloneNode(true) as HTMLElement;
  const selector = strip.map((name) => `[${name}]`).join(",");
  const nodes = selector ? [clone, ...clone.querySelectorAll<HTMLElement>(selector)] : [clone];
  for (const el of nodes) for (const name of strip) el.removeAttribute(name);
  clone.setAttribute("aria-hidden", "true");
  clone.style.cssText += `;position:absolute;left:0;top:0;margin:0;width:${originRect.width}px;height:${originRect.height}px;transform:scale(${1 / sx}, ${1 / sy});transform-origin:0 0;animation:none;translate:none;`;
  cover.replaceChildren(clone);
}

/**
 * Animate `dialog` in from `origin` (or out, when `reverse`). Returns null when nothing was
 * animated. The origin is hidden while the dialog is "made of" it, so there are never two copies
 * on screen. Reduced motion gets a short fade instead.
 */
export function runFlip(
  dialog: HTMLElement,
  origin: HTMLElement | null,
  reverse: boolean,
  options: RunFlipOptions = {},
): FlipRun | null {
  if (typeof dialog.animate !== "function") return null;
  const {
    stripAttributes = DEFAULT_FLIP_STRIP_ATTRIBUTES,
    coverSelector = "[data-flip-cover]",
    duration = FLIP_MS,
  } = options;
  const timing = (ms: number): KeyframeAnimationOptions => ({
    duration: ms,
    easing: FLIP_EASE,
    fill: "both",
    direction: reverse ? "reverse" : "normal",
  });
  const noop = () => undefined;

  if (shouldReduceMotion()) {
    return { animation: dialog.animate([{ opacity: 0 }, { opacity: 1 }], timing(160)), restore: noop };
  }
  const originRect = origin?.isConnected ? origin.getBoundingClientRect() : null;
  if (!origin || !originRect || originRect.width === 0) {
    const animation = dialog.animate(
      [
        { opacity: 0, transform: "scale(0.96)" },
        { opacity: 1, transform: "none" },
      ],
      timing(260),
    );
    return { animation, restore: noop };
  }

  const { from, to, sx, sy } = flipOriginTransform(dialog.getBoundingClientRect(), originRect);
  const cover = dialog.querySelector<HTMLElement>(coverSelector);
  if (cover) dressCover(cover, origin, originRect, sx, sy, stripAttributes);

  const previousVisibility = origin.style.visibility;
  origin.style.visibility = "hidden";
  const animation = dialog.animate([{ transform: from }, { transform: to }], timing(duration));
  const restore = () => {
    origin.style.visibility = previousVisibility;
  };
  animation.finished.then(restore, restore);
  // A finished opening drops its fill, so the open dialog carries no 3D transform and its text
  // renders as crisp as the rest of the page.
  if (!reverse) animation.finished.then(() => animation.cancel(), noop);
  return { animation, restore };
}
