'use client';

import {
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
} from 'react';
import { usePrefersReducedMotion } from './transitions/pointer-hooks';

export interface MagneticLinkProps extends ComponentPropsWithoutRef<'a'> {
  /** How far the link leans toward the pointer, as a fraction of the pointer's distance from its centre. */
  strength?: number;
  /** Paint a soft highlight under the pointer. */
  sheen?: boolean;
  /** Highlight colour. Defaults to a tint of the link's own text colour, so it works on any theme. */
  sheenColor?: string;
}

/** Lean of a magnetic element for a pointer at (clientX, clientY). Zero strength or bad input gives no lean. */
export function magneticOffset(
  clientX: number,
  clientY: number,
  rect: { left: number; top: number; width: number; height: number },
  strength: number,
): { x: number; y: number; px: number; py: number } {
  const w = rect.width > 0 ? rect.width : 1;
  const h = rect.height > 0 ? rect.height : 1;
  const fx = (clientX - rect.left) / w;
  const fy = (clientY - rect.top) / h;
  if (!Number.isFinite(fx) || !Number.isFinite(fy) || !Number.isFinite(strength)) {
    return { x: 0, y: 0, px: 50, py: 50 };
  }
  const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
  const round = (v: number) => Math.round(v * 100) / 100 + 0;
  return {
    x: round((clientX - (rect.left + w / 2)) * strength),
    y: round((clientY - (rect.top + h / 2)) * strength),
    px: round(clamp01(fx) * 100),
    py: round(clamp01(fy) * 100),
  };
}

/**
 * A link that leans toward the pointer and carries a highlight under it. It also exposes the
 * pointer as `--mx` / `--my` (percent) and sets `data-hover="true"` while hovered, for your own
 * styling. The lean is off under reduced motion; the highlight stays.
 */
export function MagneticLink({
  strength = 0.1,
  sheen = true,
  sheenColor = 'color-mix(in srgb, currentColor 16%, transparent)',
  children,
  style,
  onMouseMove,
  onMouseLeave,
  ...rest
}: MagneticLinkProps) {
  const ref = useRef<HTMLAnchorElement>(null);
  const [hover, setHover] = useState(false);
  const reduced = usePrefersReducedMotion();

  const handleMove = (e: ReactMouseEvent<HTMLAnchorElement>) => {
    onMouseMove?.(e);
    const el = ref.current;
    if (!el) return;
    const o = magneticOffset(e.clientX, e.clientY, el.getBoundingClientRect(), strength);
    el.style.setProperty('--mx', `${o.px}%`);
    el.style.setProperty('--my', `${o.py}%`);
    if (!reduced) el.style.transform = `translate(${o.x}px, ${o.y}px)`;
    if (!hover) setHover(true);
  };

  const handleLeave = (e: ReactMouseEvent<HTMLAnchorElement>) => {
    onMouseLeave?.(e);
    const el = ref.current;
    if (el) {
      el.style.setProperty('--mx', '50%');
      el.style.setProperty('--my', '50%');
      el.style.transform = 'translate(0px, 0px)';
    }
    setHover(false);
  };

  const base: CSSProperties = {
    position: 'relative',
    display: 'inline-flex',
    alignItems: 'center',
    overflow: 'hidden',
    isolation: 'isolate',
    transition: 'transform 0.22s cubic-bezier(0.22, 1, 0.36, 1)',
  };

  return (
    <a
      ref={ref}
      data-hover={hover ? 'true' : undefined}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      style={{ ...base, ...style }}
      {...rest}
    >
      {sheen ? (
        <span
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: -1,
            borderRadius: 'inherit',
            pointerEvents: 'none',
            background: `radial-gradient(160px circle at var(--mx, 50%) var(--my, 50%), ${sheenColor}, transparent 72%)`,
            opacity: hover ? 1 : 0,
            transition: 'opacity 0.35s ease',
          }}
        />
      ) : null}
      {children}
    </a>
  );
}
