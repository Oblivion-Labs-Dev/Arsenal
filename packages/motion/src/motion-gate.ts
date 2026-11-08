/**
 * One switch for "should this animate?". Honors the OS reduced-motion setting and a
 * site-wide kill switch: `<html data-motion="paused">`. Every Arsenal animation checks this.
 */
const REDUCED_QUERY = "(prefers-reduced-motion: reduce)";

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia(REDUCED_QUERY).matches;
}

export function isMotionPaused(): boolean {
  if (typeof document === "undefined") return false;
  return document.documentElement.dataset.motion === "paused";
}

/** True when motion should be skipped for any reason. */
export function shouldReduceMotion(): boolean {
  return prefersReducedMotion() || isMotionPaused();
}

/** Subscribe to changes of either signal. Returns an unsubscribe function. */
export function onMotionPreferenceChange(listener: (reduce: boolean) => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  const emit = () => listener(shouldReduceMotion());
  const mql = typeof window.matchMedia === "function" ? window.matchMedia(REDUCED_QUERY) : null;
  mql?.addEventListener("change", emit);
  const observer =
    typeof MutationObserver === "undefined"
      ? null
      : new MutationObserver(emit);
  observer?.observe(document.documentElement, { attributes: true, attributeFilter: ["data-motion"] });
  return () => {
    mql?.removeEventListener("change", emit);
    observer?.disconnect();
  };
}
