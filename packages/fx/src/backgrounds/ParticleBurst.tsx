'use client';

import { forwardRef, useImperativeHandle, useRef, type CSSProperties } from 'react';
import { mixRgb, rgba, toRgb, type ColorInput, type PaletteMode, type Rgb } from './color';
import { createBurst, stepSparks, type BurstOptions, type Spark } from './particle-burst';
import { createRng, randomSeed } from './random';
import { useArsenalTheme } from './use-arsenal-theme';
import { useCanvasLoop } from './use-canvas-loop';

export type ParticleBurstHandle = {
  /**
   * Releases a burst at (x, y) in canvas CSS pixels, or at the centre when omitted.
   * Accepts a pointer event too: its client position is mapped into the canvas.
   */
  burst: (
    at?: { x: number; y: number } | { clientX: number; clientY: number },
    options?: BurstOptions,
  ) => void;
  clear: () => void;
};

export type ParticleBurstProps = {
  /** Spark colours, cycled. Defaults to the theme's cyan, amber, violet, blue and accent. */
  colors?: readonly ColorInput[];
  /** Defaults applied to every burst. */
  burst?: BurstOptions;
  seed?: number;
  palette?: PaletteMode;
  className?: string;
  style?: CSSProperties;
};

const WHITE: Rgb = [255, 255, 255];

/**
 * A transparent overlay that throws sparks with gravity and soft wall bounces. Call
 * `ref.current.burst(event)` from any click handler. With reduced motion, bursts are skipped.
 */
export const ParticleBurst = forwardRef<ParticleBurstHandle, ParticleBurstProps>(
  function ParticleBurst(
    { colors, burst: defaults, seed, palette = 'auto', className, style },
    ref,
  ) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const theme = useArsenalTheme(palette);
    const sparksRef = useRef<Spark[]>([]);
    const rngRef = useRef(createRng(seed ?? randomSeed()));
    const reducedRef = useRef(false);

    const light = theme.scheme === 'light';
    const fallback: readonly Rgb[] = [
      theme.cyan,
      theme.amber,
      theme.violet,
      theme.blue,
      theme.accent,
    ];
    const inks = (colors && colors.length > 0 ? colors : fallback).map((c, i) => {
      const rgb = toRgb(c, fallback[i % fallback.length] ?? theme.accent);
      return light ? mixRgb(rgb, theme.text, 0.18) : mixRgb(rgb, WHITE, 0.08);
    });
    const inkKey = inks.map((c) => c.join()).join('|');

    useImperativeHandle(
      ref,
      () => ({
        burst: (at, options) => {
          const canvas = canvasRef.current;
          if (!canvas || reducedRef.current) return;
          const rect = canvas.getBoundingClientRect();
          let x = rect.width / 2;
          let y = rect.height / 2;
          if (at && 'clientX' in at) {
            x = at.clientX - rect.left;
            y = at.clientY - rect.top;
          } else if (at) {
            x = at.x;
            y = at.y;
          }
          const merged: BurstOptions = { ...defaults, ...options, colorCount: inks.length };
          sparksRef.current.push(...createBurst(x, y, merged, rngRef.current));
        },
        clear: () => {
          sparksRef.current.length = 0;
        },
      }),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [defaults, inks.length],
    );

    useCanvasLoop(
      canvasRef,
      {
        draw: ({ ctx, width, height, dt, reduced }) => {
          reducedRef.current = reduced;
          const sparks = sparksRef.current;
          if (reduced) sparks.length = 0;
          ctx.clearRect(0, 0, width, height);
          if (sparks.length === 0) return;
          stepSparks(sparks, width, height, dt);
          ctx.globalCompositeOperation = light ? 'source-over' : 'lighter';
          for (const s of sparks) {
            const ink = inks[s.colorIndex % inks.length] ?? theme.accent;
            ctx.fillStyle = rgba(ink, s.alpha * (light ? 0.16 : 0.22));
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.size * 2.2, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = rgba(ink, s.alpha);
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.globalCompositeOperation = 'source-over';
        },
      },
      [theme, inkKey],
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
  },
);
