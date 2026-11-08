/**
 * Width of the page's vertical scrollbar, so locking scroll can pad the body by the same amount
 * instead of letting the layout jump wider.
 */
export function scrollbarCompensation(
  bodyRectWidth: number,
  bodyClientWidth: number,
  borderLeft: number,
  borderRight: number,
): number {
  const width = bodyRectWidth - bodyClientWidth - (borderLeft || 0) - (borderRight || 0);
  return width > 0 ? width : 0;
}

/**
 * Where Tab should go inside a focus trap: the element to focus, "block" to swallow the key
 * (nothing focusable), or null to let the browser move focus normally. Focus on `container`
 * itself counts as "before the first element".
 */
export function trapFocusTarget<T>(
  focusables: readonly T[],
  active: T | null,
  shiftKey: boolean,
  container: T,
): T | 'block' | null {
  const first = focusables[0];
  const last = focusables[focusables.length - 1];
  if (first === undefined || last === undefined) return 'block';
  if (shiftKey && (active === first || active === container)) return last;
  if (!shiftKey && active === last) return first;
  return null;
}

export const FOCUSABLE_SELECTOR =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),summary,[tabindex]:not([tabindex="-1"])';
