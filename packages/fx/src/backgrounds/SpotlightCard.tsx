'use client';

import {
  useRef,
  useState,
  type CSSProperties,
  type HTMLAttributes,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import { tiltAngles } from '@arsenal/motion';
import { mixRgb, rgba, toRgb, type ColorInput, type PaletteMode, type Rgb } from './color';
import { pointerAngleDeg, pointerInBox } from './scene-math';
import { useArsenalTheme } from './use-arsenal-theme';
import { useReducedMotionGate } from './use-reduced-motion';

export type SpotlightCardProps = Omit<HTMLAttributes<HTMLDivElement>, 'children'> & {
  children?: ReactNode;
  /** Main glow colour. Defaults to `--arsenal-accent-cyan`. */
  accent?: ColorInput;
  /** Second colour of the rim light. Defaults to `--arsenal-accent-violet`. */
  secondary?: ColorInput;
  palette?: PaletteMode;
  /** Maximum tilt in degrees. 0 turns the tilt off; it is always off under reduced motion. */
  maxTilt?: number;
  radius?: number;
  padding?: CSSProperties['padding'];
};

const WHITE: Rgb = [255, 255, 255];
const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';
const fill: CSSProperties = {
  position: 'absolute',
  pointerEvents: 'none',
  borderRadius: 'inherit',
};

/**
 * A glass card that answers the pointer: a soft spotlight follows it, a rim light swings round the
 * border toward it, and the card tilts a few degrees. Content sits above the light.
 */
export function SpotlightCard({
  children,
  accent,
  secondary,
  palette = 'auto',
  maxTilt = 9,
  radius = 20,
  padding = '1.75rem 1.7rem 1.9rem',
  style,
  onPointerMove,
  onPointerEnter,
  onPointerLeave,
  ...rest
}: SpotlightCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState(false);
  const theme = useArsenalTheme(palette);
  const reduced = useReducedMotionGate();
  const light = theme.scheme === 'light';

  const a = toRgb(accent ?? theme.cyan, theme.cyan);
  const b = toRgb(secondary ?? theme.violet, theme.violet);
  const ink = theme.text;
  const sheen = light ? a : WHITE;
  const surfaceTop = light ? mixRgb(theme.background, WHITE, 0.75) : ink;
  const blend: CSSProperties['mixBlendMode'] = light ? 'normal' : 'screen';

  const rest0 = () => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty('--mx', '50%');
    el.style.setProperty('--my', '45%');
    el.style.setProperty('--angle', '0deg');
    el.style.transform = 'perspective(1200px) rotateX(0deg) rotateY(0deg) translateZ(0)';
  };

  const handleMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    onPointerMove?.(e);
    const el = ref.current;
    if (!el || e.pointerType === 'touch') return;
    const p = pointerInBox(e.clientX, e.clientY, el.getBoundingClientRect());
    el.style.setProperty('--mx', `${p.px}%`);
    el.style.setProperty('--my', `${p.py}%`);
    el.style.setProperty('--angle', `${pointerAngleDeg(p.nx, p.ny)}deg`);
    if (!reduced && maxTilt > 0) {
      const t = tiltAngles(p.nx, p.ny, maxTilt);
      el.style.transform = `perspective(1200px) rotateX(${t.rotateX}deg) rotateY(${t.rotateY}deg) translateZ(10px)`;
    }
  };

  const ring = 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)';

  return (
    <div
      ref={ref}
      {...rest}
      onPointerMove={handleMove}
      onPointerEnter={(e) => {
        onPointerEnter?.(e);
        if (e.pointerType !== 'touch') setHover(true);
      }}
      onPointerLeave={(e) => {
        onPointerLeave?.(e);
        setHover(false);
        rest0();
      }}
      style={{
        position: 'relative',
        isolation: 'isolate',
        overflow: 'hidden',
        borderRadius: radius,
        padding,
        color: rgba(ink, 1),
        border: `1px solid ${rgba(light ? ink : WHITE, hover ? 0.16 : light ? 0.1 : 0.09)}`,
        background: light
          ? `linear-gradient(155deg, ${rgba(surfaceTop, 0.96)}, ${rgba(surfaceTop, 0.82)})`
          : `linear-gradient(155deg, ${rgba(ink, 0.075)}, ${rgba(ink, 0.018)} 44%, ${rgba(ink, 0.026)})`,
        backdropFilter: 'blur(26px)',
        WebkitBackdropFilter: 'blur(26px)',
        boxShadow: light
          ? `0 18px 40px -26px ${rgba(ink, hover ? 0.4 : 0.28)}, 0 1px 2px ${rgba(ink, 0.06)}`
          : `0 24px 62px -34px rgba(0,0,0,0.84)${hover ? `, inset 0 0 42px -22px ${rgba(a, 0.35)}` : ''}`,
        transformStyle: 'preserve-3d',
        transition: `transform 0.55s ${EASE}, border-color 0.45s ${EASE}, box-shadow 0.45s ${EASE}`,
        willChange: 'transform',
        ...style,
      }}
    >
      {/* Spotlight under the pointer. */}
      <span
        aria-hidden
        style={{
          ...fill,
          inset: 0,
          zIndex: -1,
          background: `radial-gradient(560px circle at var(--mx, 50%) var(--my, 45%), ${rgba(sheen, light ? 0.1 : 0.08)}, transparent 52%)`,
          opacity: hover ? 1 : 0,
          transition: `opacity 0.45s ${EASE}`,
        }}
      />
      {/* Coloured edge glow. */}
      <span
        aria-hidden
        style={{
          ...fill,
          inset: -2,
          zIndex: -1,
          background: `radial-gradient(420px circle at var(--mx, 50%) var(--my, 45%), ${rgba(a, light ? 0.12 : 0.2)}, ${rgba(b, light ? 0.07 : 0.11)} 34%, transparent 62%)`,
          filter: 'blur(14px)',
          mixBlendMode: blend,
          opacity: hover ? 0.75 : 0,
          transition: `opacity 0.5s ${EASE}`,
        }}
      />
      {/* Rim light that swings toward the pointer. */}
      <span
        aria-hidden
        style={{
          ...fill,
          inset: 0,
          padding: 1,
          background: `conic-gradient(from calc(var(--angle, 0deg) - 15deg), transparent 0deg, ${rgba(a, light ? 0.55 : 0.38)} 58deg, ${rgba(b, light ? 0.45 : 0.32)} 132deg, transparent 228deg)`,
          WebkitMask: ring,
          WebkitMaskComposite: 'xor',
          mask: ring,
          maskComposite: 'exclude',
          opacity: hover ? 0.62 : 0,
          transition: `opacity 0.5s ${EASE}`,
        }}
      />
      {children}
    </div>
  );
}
