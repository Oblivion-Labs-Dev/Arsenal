/**
 * Crosshair cursor: two hairlines that follow a fine pointer across the page, with a live
 * coordinate readout — the "drafting table" cursor.
 *
 * Origin: amsborse.github.io redesign, `src/designs/blueprint/effects.ts` (+ `.bp-crosshair` CSS).
 * Lift-and-shift: copy this file and `crosshair-cursor.css`; replace the `./motion-gate` import
 * with a `matchMedia("(prefers-reduced-motion: reduce)")` check if you copy it alone.
 *
 * Guards kept from the original: reduced motion (and `<html data-motion="paused">`), mouse with a
 * fine hovering pointer only, hidden over editable targets, rAF-throttled, hidden while the tab
 * is hidden or the window loses focus, and a cleanup that removes every listener and the overlay.
 */
import { onMotionPreferenceChange, shouldReduceMotion } from './motion-gate';

export interface CrosshairCursorOptions {
  /** BEM block for the overlay: `<prefix>`, `<prefix>__x`, `<prefix>__y`, `<prefix>__label`. The shipped CSS styles the default. */
  classPrefix?: string;
  /** Text of the readout. Default: `X 0412 / Y 0087`. Return an empty string to hide the label. */
  formatLabel?: (x: number, y: number) => string;
  /** Inline z-index for the overlay. Default: the CSS value (`--arsenal-crosshair-z`, 45). */
  zIndex?: number;
  /** Element the overlay is appended to. Default: `document.body`. */
  container?: HTMLElement;
}

export const DEFAULT_CROSSHAIR_PREFIX = 'arsenal-crosshair';
const FINE_POINTER = '(hover: hover) and (pointer: fine)';
const EDITABLE =
  'input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="textbox"]';
const CLASS_NAME = /^-?[_a-zA-Z][_a-zA-Z0-9-]*$/;

export const defaultCrosshairLabel = (x: number, y: number) =>
  `X ${String(Math.round(x)).padStart(4, '0')} / Y ${String(Math.round(y)).padStart(4, '0')}`;

function isEditable(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest(EDITABLE) !== null;
}

/** Mount the crosshair. Returns a cleanup function; calling it twice is safe. */
export function mountCrosshairCursor(options: CrosshairCursorOptions = {}): () => void {
  const prefix = options.classPrefix ?? DEFAULT_CROSSHAIR_PREFIX;
  if (!CLASS_NAME.test(prefix)) {
    throw new TypeError(
      `mountCrosshairCursor: classPrefix "${prefix}" is not a valid CSS class name`,
    );
  }
  if (options.zIndex !== undefined && !Number.isInteger(options.zIndex)) {
    throw new TypeError(`mountCrosshairCursor: zIndex must be an integer (got ${options.zIndex})`);
  }
  if (typeof window === 'undefined' || typeof document === 'undefined') return () => undefined;

  const formatLabel = options.formatLabel ?? defaultCrosshairLabel;
  const container = options.container ?? document.body;
  const fine = typeof window.matchMedia === 'function' ? window.matchMedia(FINE_POINTER) : null;

  const overlay = document.createElement('div');
  overlay.className = prefix;
  overlay.setAttribute('aria-hidden', 'true');
  overlay.hidden = true;
  if (options.zIndex !== undefined) overlay.style.zIndex = String(options.zIndex);
  const lineX = document.createElement('span');
  lineX.className = `${prefix}__x`;
  const lineY = document.createElement('span');
  lineY.className = `${prefix}__y`;
  const label = document.createElement('span');
  label.className = `${prefix}__label`;
  overlay.append(lineX, lineY, label);
  container.append(overlay);

  let frame = 0;
  let x = 0;
  let y = 0;
  let disposed = false;

  const hide = () => {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    overlay.hidden = true;
  };

  const paint = () => {
    frame = 0;
    if (disposed) return;
    overlay.style.setProperty('--crosshair-x', `${x}px`);
    overlay.style.setProperty('--crosshair-y', `${y}px`);
    const text = formatLabel(x, y);
    label.textContent = text;
    label.hidden = text === '';
    overlay.hidden = false;
  };

  const allowed = () => !shouldReduceMotion() && (fine?.matches ?? false) && !document.hidden;

  const onMove = (event: PointerEvent) => {
    if (event.pointerType !== 'mouse' || !allowed() || isEditable(event.target)) {
      hide();
      return;
    }
    x = event.clientX;
    y = event.clientY;
    if (!frame) frame = requestAnimationFrame(paint);
  };
  const onFocusIn = (event: FocusEvent) => {
    if (isEditable(event.target)) hide();
  };
  const onVisibility = () => {
    if (document.hidden) hide();
  };
  const onPreference = () => {
    if (!allowed()) hide();
  };

  const root = document.documentElement;
  document.addEventListener('pointermove', onMove, { passive: true });
  root.addEventListener('pointerleave', hide);
  document.addEventListener('focusin', onFocusIn);
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('blur', hide);
  fine?.addEventListener('change', onPreference);
  const stopPreference = onMotionPreferenceChange(onPreference);

  return () => {
    if (disposed) return;
    disposed = true;
    hide();
    document.removeEventListener('pointermove', onMove);
    root.removeEventListener('pointerleave', hide);
    document.removeEventListener('focusin', onFocusIn);
    document.removeEventListener('visibilitychange', onVisibility);
    window.removeEventListener('blur', hide);
    fine?.removeEventListener('change', onPreference);
    stopPreference();
    overlay.remove();
  };
}
