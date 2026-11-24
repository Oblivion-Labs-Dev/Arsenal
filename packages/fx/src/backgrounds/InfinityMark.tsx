'use client';

import { motion } from 'framer-motion';
import { useId, type CSSProperties } from 'react';
import { mixRgb, rgba, toRgb, type ColorInput, type PaletteMode, type Rgb } from './color';
import { buildInfinityPathD } from './infinity-curve';
import { infinityMarkStops } from './scene-math';
import { useArsenalTheme } from './use-arsenal-theme';
import { useReducedMotionGate } from './use-reduced-motion';

export type InfinityMarkProps = {
  /** Left lobe colour. Defaults to `--arsenal-accent-violet`. */
  leftColor?: ColorInput;
  /** Right lobe colour. Defaults to `--arsenal-accent-amber`. */
  rightColor?: ColorInput;
  /** Crossing highlight. Defaults to a pale `--arsenal-accent-cyan` (dark) or the text ink (light). */
  centerColor?: ColorInput;
  palette?: PaletteMode;
  /** Breathing pulse at the crossing. Off under reduced motion. */
  animated?: boolean;
  /** Soft halo behind the stroke. */
  halo?: boolean;
  /** Accessible name. Without it the mark is decorative (`aria-hidden`). */
  title?: string;
  className?: string;
  style?: CSSProperties;
};

const WHITE: Rgb = [255, 255, 255];
const PATH_D = buildInfinityPathD(200, 200, 128, 112);

/**
 * The infinity symbol as a crisp SVG mark: a layered glowing stroke with a breathing light at the
 * crossing. Scales with its box (square viewBox); use it as a logo, a loader accent or a hero mark.
 */
export function InfinityMark({
  leftColor,
  rightColor,
  centerColor,
  palette = 'auto',
  animated = true,
  halo = true,
  title,
  className,
  style,
}: InfinityMarkProps) {
  const uid = useId().replace(/:/g, '');
  const theme = useArsenalTheme(palette);
  const reduced = useReducedMotionGate();
  const light = theme.scheme === 'light';

  const left = toRgb(leftColor ?? theme.violet, theme.violet);
  const right = toRgb(rightColor ?? theme.amber, theme.amber);
  const centerFallback = light
    ? mixRgb(theme.cyan, theme.text, 0.35)
    : mixRgb(theme.cyan, WHITE, 0.8);
  const center = toRgb(centerColor ?? centerFallback, centerFallback);
  const stops = infinityMarkStops(left, right, center);

  const grad = `${uid}-grad`;
  const nexus = `${uid}-nexus`;
  const veil = `${uid}-veil`;
  const blur = `${uid}-blur`;
  const stroke = { fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' } as const;
  const pulse = animated && !reduced;
  // Light pages have nothing to "screen" against, so the glow layers get quieter and stay normal.
  const glowK = light ? 0.55 : 1;

  return (
    <svg
      viewBox="0 0 400 400"
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      className={className}
      style={{ display: 'block', width: '100%', height: '100%', overflow: 'visible', ...style }}
    >
      <defs>
        <linearGradient id={grad} gradientUnits="userSpaceOnUse" x1="48" y1="200" x2="352" y2="200">
          {stops.map((s) => (
            <stop key={s.offset} offset={s.offset} stopColor={s.color} />
          ))}
        </linearGradient>
        <radialGradient id={nexus} gradientUnits="userSpaceOnUse" cx="200" cy="200" r="18">
          <stop offset="0" stopColor={rgba(light ? center : WHITE, light ? 0.7 : 0.55)} />
          <stop offset="0.55" stopColor={rgba(center, 0.25)} />
          <stop offset="1" stopColor={rgba(left, 0)} />
        </radialGradient>
        <radialGradient id={veil} gradientUnits="userSpaceOnUse" cx="200" cy="200" r="160">
          <stop offset="0" stopColor={rgba(left, 0.12 * glowK)} />
          <stop offset="0.45" stopColor={rgba(center, 0.06 * glowK)} />
          <stop offset="1" stopColor={rgba(theme.background, 0)} />
        </radialGradient>
        <filter id={blur} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="3.2" />
        </filter>
      </defs>

      {halo ? (
        <ellipse cx="200" cy="200" rx="168" ry="118" fill={`url(#${veil})`} opacity={0.9} />
      ) : null}

      {halo ? (
        <g filter={`url(#${blur})`} opacity={0.55 * glowK}>
          <path
            d={PATH_D}
            {...stroke}
            stroke={rgba(mixRgb(left, WHITE, light ? 0 : 0.25), 0.45)}
            strokeWidth={10}
          />
          <path
            d={PATH_D}
            {...stroke}
            stroke={rgba(mixRgb(right, WHITE, light ? 0 : 0.25), 0.35)}
            strokeWidth={7}
            opacity={0.85}
          />
        </g>
      ) : null}

      <path d={PATH_D} {...stroke} stroke={`url(#${grad})`} strokeWidth={3.2} opacity={0.72} />
      <path d={PATH_D} {...stroke} stroke={`url(#${grad})`} strokeWidth={1.35} />

      {pulse ? (
        <motion.circle
          cx={200}
          cy={200}
          fill={`url(#${nexus})`}
          style={{ mixBlendMode: light ? 'normal' : 'screen' }}
          initial={{ r: 8.2, opacity: 0.38 }}
          animate={{ r: [8.2, 11.2, 8.2], opacity: [0.38, 0.58, 0.38] }}
          transition={{ duration: 6.8, repeat: Infinity, ease: [0.45, 0, 0.55, 1] }}
        />
      ) : (
        <circle
          cx={200}
          cy={200}
          r={9}
          fill={`url(#${nexus})`}
          opacity={0.48}
          style={{ mixBlendMode: light ? 'normal' : 'screen' }}
        />
      )}
    </svg>
  );
}
