'use client';

import { useEffect, useRef, type CSSProperties } from 'react';
import { mixRgb, rgba, toRgb, type ColorInput, type PaletteMode, type Rgb } from './color';
import {
  cosmicParticleAlpha,
  createCosmicParticleField,
  stepCosmicParticleField,
  type CosmicHue,
  type CosmicParticle,
} from './cosmic-field';
import { randomSeed } from './random';
import { useArsenalTheme } from './use-arsenal-theme';
import { useCanvasLoop, usePointer } from './use-canvas-loop';

export type CosmicParticleBackgroundProps = {
  seed?: number;
  /** Violet stars. Defaults to `--arsenal-accent-violet`. */
  violet?: ColorInput;
  /** Blue stars. Defaults to `--arsenal-accent-blue`. */
  blue?: ColorInput;
  /** Warm stars. Defaults to `--arsenal-accent-amber`. */
  amber?: ColorInput;
  palette?: PaletteMode;
  interactive?: boolean;
  /** Sink layers at different rates as the page scrolls. */
  scrollParallax?: boolean;
  className?: string;
  style?: CSSProperties;
};

const WHITE: Rgb = [248, 250, 255];

/** A quiet diagonal band of layered stars that drifts, twinkles and parts around the pointer. */
export function CosmicParticleBackground({
  seed,
  violet,
  blue,
  amber,
  palette = 'auto',
  interactive = true,
  scrollParallax = true,
  className,
  style,
}: CosmicParticleBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const theme = useArsenalTheme(palette);
  const pointerRef = usePointer(canvasRef, interactive);
  const seedRef = useRef(seed ?? randomSeed());
  const particlesRef = useRef<CosmicParticle[] | null>(null);
  const scrollRef = useRef(0);

  useEffect(() => {
    if (!scrollParallax) {
      scrollRef.current = 0;
      return;
    }
    const onScroll = () => {
      scrollRef.current = window.scrollY || 0;
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [scrollParallax]);

  const light = theme.scheme === 'light';
  const v = toRgb(violet ?? theme.violet, theme.violet);
  const b = toRgb(blue ?? theme.blue, theme.blue);
  const a = toRgb(amber ?? theme.amber, theme.amber);
  // Dark: pale tints that glow additively. Light: the tokens darkened toward the text colour.
  const inks: Record<CosmicHue, Rgb> = light
    ? {
        white: mixRgb(theme.text, b, 0.25),
        violet: mixRgb(v, theme.text, 0.2),
        blue: mixRgb(b, theme.text, 0.2),
        amber: mixRgb(a, theme.text, 0.15),
      }
    : {
        white: WHITE,
        violet: mixRgb(v, WHITE, 0.55),
        blue: mixRgb(b, WHITE, 0.6),
        amber: mixRgb(a, WHITE, 0.4),
      };
  const alphaLift = light ? 2.6 : 1;

  useCanvasLoop(
    canvasRef,
    {
      rootMargin: '0px',
      onResize: ({ width, height }) => {
        particlesRef.current = createCosmicParticleField(width, height, seedRef.current);
      },
      draw: ({ ctx, width: w, height: h, dt, time, reduced }) => {
        const list = particlesRef.current;
        if (!list) return;
        const t = reduced ? 0 : time;
        stepCosmicParticleField(list, {
          width: w,
          height: h,
          dt,
          time: t,
          pointer: reduced ? null : pointerRef.current,
          scrollY: reduced ? 0 : scrollRef.current,
        });

        ctx.clearRect(0, 0, w, h);
        const band = ctx.createLinearGradient(0, h * 0.06, w, h * 0.88);
        band.addColorStop(0, rgba(b, 0));
        band.addColorStop(0.31, rgba(v, light ? 0.04 : 0.026));
        band.addColorStop(0.55, rgba(a, light ? 0.028 : 0.016));
        band.addColorStop(1, rgba(b, 0));
        ctx.fillStyle = band;
        ctx.fillRect(0, 0, w, h);
        ctx.globalCompositeOperation = light ? 'source-over' : 'lighter';

        for (const p of list) {
          const alpha = Math.min(1, cosmicParticleAlpha(p, t) * alphaLift);
          const ink = inks[p.hue];
          if (p.layer === 'dust' || p.layer === 'hero') {
            const reach = p.layer === 'dust' ? 3.8 : 4.4;
            const radius = p.layer === 'dust' ? 2.8 : 3.6;
            const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * reach);
            g.addColorStop(0, rgba(ink, alpha * 0.34));
            g.addColorStop(1, rgba(ink, 0));
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * radius, 0, Math.PI * 2);
            ctx.fill();
            if (p.layer === 'dust') continue;
          }
          ctx.fillStyle = rgba(ink, alpha);
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalCompositeOperation = 'source-over';
      },
    },
    [theme, v.join(), b.join(), a.join()],
  );

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className={className}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        display: 'block',
        pointerEvents: 'none',
        ...style,
      }}
    />
  );
}
