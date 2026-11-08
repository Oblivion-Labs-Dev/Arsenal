'use client';

import { motion, useScroll, useTransform, type MotionValue } from 'framer-motion';
import type { CSSProperties } from 'react';
import { mixRgb, rgba, toRgb, type ColorInput, type PaletteMode, type Rgb } from './color';
import { useArsenalTheme } from './use-arsenal-theme';
import { useReducedMotionGate } from './use-reduced-motion';

export type AuroraBackgroundProps = {
  /** Upper-left glow. Defaults to `--arsenal-accent-violet`. */
  violet?: ColorInput;
  /** Right glow. Defaults to `--arsenal-accent-cyan`. */
  cyan?: ColorInput;
  /** Low wide glow. Defaults to a violet/blue mix. */
  indigo?: ColorInput;
  /** Small warm glow. Defaults to `--arsenal-accent-amber`. */
  amber?: ColorInput;
  palette?: PaletteMode;
  /** Blobs drift apart a little as the page scrolls. */
  scrollParallax?: boolean;
  /** Darken (or, in light mode, wash) the edges toward the page background. */
  vignette?: boolean;
  /** Overall strength, 0–1. */
  intensity?: number;
  className?: string;
  style?: CSSProperties;
};

type Blob = {
  key: string;
  style: CSSProperties;
  drift?: 'down' | 'up';
  x: number[];
  y: number[];
  duration: number;
};

function blobs(c: { violet: Rgb; cyan: Rgb; indigo: Rgb; amber: Rgb }, k: number): Blob[] {
  return [
    {
      key: 'violet',
      style: {
        width: 'min(52vw, 520px)',
        height: 'min(52vw, 520px)',
        left: '5%',
        top: '8%',
        background: `radial-gradient(circle at 40% 40%, ${rgba(c.violet, 0.55 * k)}, ${rgba(c.indigo, 0.15 * k)} 60%, transparent 72%)`,
      },
      drift: 'down',
      x: [0, 28, -18, 0],
      y: [0, -22, 14, 0],
      duration: 28,
    },
    {
      key: 'cyan',
      style: {
        width: 'min(48vw, 480px)',
        height: 'min(48vw, 480px)',
        right: '-6%',
        top: '18%',
        background: `radial-gradient(circle at 50% 50%, ${rgba(c.cyan, 0.42 * k)}, ${rgba(c.cyan, 0.12 * k)} 58%, transparent 72%)`,
      },
      drift: 'up',
      x: [0, -32, 24, 0],
      y: [0, 26, -16, 0],
      duration: 32,
    },
    {
      key: 'indigo',
      style: {
        width: 'min(60vw, 620px)',
        height: 'min(42vw, 420px)',
        left: '25%',
        bottom: '-8%',
        background: `radial-gradient(circle at 50% 50%, ${rgba(c.indigo, 0.38 * k)}, ${rgba(c.violet, 0.08 * k)} 62%, transparent 74%)`,
      },
      x: [0, 20, -26, 0],
      y: [0, 18, -22, 0],
      duration: 36,
    },
    {
      key: 'amber',
      style: {
        width: 'min(28vw, 280px)',
        height: 'min(28vw, 280px)',
        right: '22%',
        bottom: '12%',
        opacity: 0.65,
        background: `radial-gradient(circle at 50% 50%, ${rgba(c.amber, 0.35 * k)}, transparent 68%)`,
      },
      drift: 'down',
      x: [0, -14, 18, 0],
      y: [0, -12, 10, 0],
      duration: 22,
    },
  ];
}

/** Four soft colour pools that drift slowly behind content. Static when motion is reduced. */
export function AuroraBackground({
  violet,
  cyan,
  indigo,
  amber,
  palette = 'auto',
  scrollParallax = true,
  vignette = true,
  intensity = 1,
  className,
  style,
}: AuroraBackgroundProps) {
  const theme = useArsenalTheme(palette);
  const reduced = useReducedMotionGate();
  const { scrollY } = useScroll();
  const driftDown = useTransform(scrollY, [0, 700], [0, 56]);
  const driftUp = useTransform(scrollY, [0, 700], [0, -44]);

  const light = theme.scheme === 'light';
  const v = toRgb(violet ?? theme.violet, theme.violet);
  const colors = {
    violet: v,
    cyan: toRgb(cyan ?? theme.cyan, theme.cyan),
    indigo: toRgb(indigo ?? mixRgb(v, theme.blue, 0.5), mixRgb(v, theme.blue, 0.5)),
    amber: toRgb(amber ?? theme.amber, theme.amber),
  };
  const k = Math.max(0, Math.min(1, intensity)) * (light ? 0.55 : 1);
  const items = blobs(colors, k);
  const driftFor = (b: Blob): MotionValue<number> | undefined =>
    !scrollParallax || reduced || !b.drift ? undefined : b.drift === 'down' ? driftDown : driftUp;

  return (
    <div
      aria-hidden
      className={className}
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
        ...style,
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: '-15% -20%',
          filter: `blur(${reduced ? 64 : 72}px)`,
          opacity: light ? 0.9 : 0.72,
        }}
      >
        {items.map((b) => {
          const base: CSSProperties = {
            position: 'absolute',
            borderRadius: '50%',
            // Screen brightens on dark pages; on light paper it would wash out, so blend normally.
            mixBlendMode: light ? 'multiply' : 'screen',
            ...b.style,
          };
          if (reduced) return <div key={b.key} style={base} />;
          const drift = driftFor(b);
          return (
            <motion.div
              key={b.key}
              style={{ ...base, willChange: 'transform', ...(drift ? { y: drift } : {}) }}
              animate={{ x: b.x, translateY: b.y }}
              transition={{ duration: b.duration, repeat: Infinity, ease: 'easeInOut' }}
            />
          );
        })}
      </div>
      {vignette ? (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: `radial-gradient(ellipse 85% 65% at 50% 40%, transparent 35%, ${rgba(theme.background, light ? 0.7 : 0.85)} 100%)`,
          }}
        />
      ) : null}
    </div>
  );
}
