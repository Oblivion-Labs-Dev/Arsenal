/**
 * Shared-element surface changes through the View Transitions API. Give the same
 * `view-transition-name` (see `viewTransitionName`) to the element before and after the change,
 * and wrap the state update in `transitionSurface`. Falls back to an instant update when the API
 * is missing or motion is reduced/paused.
 */
import { flushSync } from "react-dom";
import { shouldReduceMotion } from "../motion-gate";

/**
 * A valid, collision-free `view-transition-name` for any id. Every code point is hex-encoded, so
 * ids with spaces, punctuation or non-Latin text stay unique and legal as CSS identifiers.
 */
export function viewTransitionName(id: string, prefix = "surface"): string {
  const safePrefix = prefix.replace(/[^a-zA-Z0-9_-]/g, "") || "surface";
  const head = /^[a-zA-Z_]/.test(safePrefix) ? safePrefix : `vt-${safePrefix}`;
  const body = Array.from(id, (c) => (c.codePointAt(0) ?? 0).toString(16)).join("-");
  return body ? `${head}-${body}` : head;
}

type ViewTransitionDocument = Document & {
  startViewTransition?: (callback: () => void) => { finished: Promise<void> };
};

export interface TransitionSurfaceOptions {
  /** Run the update inside React's `flushSync` so the DOM is committed in the snapshot. Default true. */
  flush?: boolean;
}

/** Apply `update` inside a view transition. Resolves when the transition (if any) has finished. */
export function transitionSurface(
  update: () => void,
  options: TransitionSurfaceOptions = {},
): Promise<void> {
  const { flush = true } = options;
  if (typeof document === "undefined") {
    update();
    return Promise.resolve();
  }
  const doc = document as ViewTransitionDocument;
  if (typeof doc.startViewTransition !== "function" || shouldReduceMotion()) {
    update();
    return Promise.resolve();
  }
  const transition = doc.startViewTransition(() => (flush ? flushSync(update) : update()));
  return transition.finished.catch(() => undefined);
}
