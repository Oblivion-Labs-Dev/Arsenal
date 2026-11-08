import { useEffect, useState, type RefObject } from 'react';

/**
 * True while the element is on screen and the tab is visible, so looping or entry animations can
 * pause offscreen. Falls back to `true` where IntersectionObserver is missing.
 */
export function useInViewActive(ref: RefObject<Element | null>): boolean {
  const [active, setActive] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    if (typeof IntersectionObserver === 'undefined') {
      setActive(true);
      return undefined;
    }
    let intersecting = false;
    const update = () => setActive(intersecting && document.visibilityState === 'visible');
    const observer = new IntersectionObserver(
      ([entry]) => {
        intersecting = Boolean(entry?.isIntersecting);
        update();
      },
      { threshold: 0.01 },
    );
    observer.observe(el);
    document.addEventListener('visibilitychange', update);
    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', update);
    };
  }, [ref]);
  return active;
}
