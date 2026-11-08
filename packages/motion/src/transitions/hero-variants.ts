import type { Variants } from 'framer-motion';

export interface HeroStaggerOptions {
  /** Delay between children, seconds. Default 0.07. */
  stagger?: number;
  /** Delay before the first child, seconds. Default 0.08. */
  delay?: number;
}

/** Container variants that stagger hero children in. With `reduce`, everything appears at once. */
export function getHeroStagger(reduce: boolean, options: HeroStaggerOptions = {}): Variants {
  const { stagger = 0.07, delay = 0.08 } = options;
  return {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: reduce ? 0 : stagger,
        delayChildren: reduce ? 0 : delay,
      },
    },
  };
}

/** Item variants for one hero child: fade and rise. With `reduce`, opacity only and instant. */
export function getHeroItem(reduce = false, distance = 22): Variants {
  return {
    hidden: { opacity: 0, y: reduce ? 0 : distance },
    visible: {
      opacity: 1,
      y: 0,
      transition: reduce ? { duration: 0 } : { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
    },
  };
}

/** Default hero item (fade and rise 22px over 0.6s). */
export const heroItem: Variants = getHeroItem(false);
