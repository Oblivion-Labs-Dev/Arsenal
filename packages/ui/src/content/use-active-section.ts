'use client';

import { useEffect, useState } from 'react';
import { isAtPageEnd, pickActiveSection } from './chapter-rail-logic';

/**
 * Id of the section currently being read: the one crossing the middle band of the viewport, or
 * the last one once the page is scrolled to its foot. Drives ChapterRail and can drive
 * TableOfContents' `activeId`. Returns the first id before anything is observed or on the server.
 */
export function useActiveSection(ids: readonly string[]): string | undefined {
  const key = ids.join('\n');
  const [active, setActive] = useState<string | undefined>(ids[0]);

  useEffect(() => {
    const list = key ? key.split('\n') : [];
    setActive((prev) => pickActiveSection(list, new Set(), false, prev));
    if (list.length === 0 || typeof IntersectionObserver === 'undefined') return undefined;
    const crossing = new Set<string>();
    const update = () => {
      const root = document.documentElement;
      const end = isAtPageEnd(window.scrollY, window.innerHeight, root.scrollHeight);
      setActive((prev) => pickActiveSection(list, crossing, end, prev));
    };
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) crossing.add(entry.target.id);
          else crossing.delete(entry.target.id);
        }
        update();
      },
      { rootMargin: '-45% 0px -45% 0px' },
    );
    for (const id of list) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }
    window.addEventListener('scroll', update, { passive: true });
    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', update);
    };
  }, [key]);

  return active;
}
