'use client';

import { useRef, type CSSProperties } from 'react';
import { mixRgb, rgba, toRgb, type ColorInput, type PaletteMode, type Rgb } from './color';
import {
  createInfinityFieldViewport,
  createInfinityParticleField,
  stepInfinityParticleField,
  type InfinityParticle,
  type ParticleTier,
} from './infinity-field';
import { randomSeed } from './random';
import { useArsenalTheme } from './use-arsenal-theme';
import { useCanvasLoop, usePointer } from './use-canvas-loop';

export type InfinityParticleCanvasProps = {
  seed?: number;
  /** Left lobe colour. Defaults to `--arsenal-accent-amber` / gold. */
  leftColor?: ColorInput;
  /** Right lobe colour. Defaults to `--arsenal-accent-violet`. */
  rightColor?: ColorInput;
  palette?: PaletteMode;
  interactive?: boolean;
  minCount?: number;
  maxCount?: number;
  className?: string;
  style?: CSSProperties;
};

const VIRTUAL_WIDTH = 1000;
const VIRTUAL_HEIGHT = 620;
const TIERS: readonly ParticleTier[] = ['base', 'bright', 'core'];
const GLOW_SCALE: Record<ParticleTier, number> = { core: 4.55, bright: 3.55, base: 2.92 };
const WHITE: Rgb = [255, 255, 255];

type Ink = { glow: Rgb; glowK: number; core: Rgb; coreK: number };
type Inks = Record<InfinityParticle['side'], Record<ParticleTier, Ink>>;

function buildInks(left: Rgb, right: Rgb, light: boolean, text: Rgb): Inks {
  const center = mixRgb(left, right, 0.5);
  const side = (c: Rgb): Record<ParticleTier, Ink> =>
    light
      ? {
          core: { glow: c, glowK: 0.3, core: mixRgb(c, text, 0.35), coreK: 1.5 },
          bright: { glow: c, glowK: 0.24, core: mixRgb(c, text, 0.25), coreK: 1.3 },
          base: {
            glow: mixRgb(c, text, 0.3),
            glowK: 0.16,
            core: mixRgb(c, text, 0.45),
            coreK: 1.1,
          },
        }
      : {
          core: {
            glow: mixRgb(c, WHITE, 0.3),
            glowK: 0.48,
            core: mixRgb(c, WHITE, 0.85),
            coreK: 0.9,
          },
          bright: {
            glow: mixRgb(c, WHITE, 0.2),
            glowK: 0.38,
            core: mixRgb(c, WHITE, 0.7),
            coreK: 0.8,
          },
          base: {
            glow: mixRgb(c, [40, 36, 60], 0.45),
            glowK: 0.29,
            core: mixRgb(c, WHITE, 0.6),
            coreK: 0.68,
          },
        };
  return { left: side(left), right: side(right), center: side(center) };
}

function particleCount(w: number, h: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.floor(Math.max(1, w * h) / 72)));
}

/** A figure-eight of stars, warm on the left lobe and cool on the right, that parts around the pointer. */
export function InfinityParticleCanvas({
  seed,
  leftColor,
  rightColor,
  palette = 'auto',
  interactive = true,
  minCount = 720,
  maxCount = 1550,
  className,
  style,
}: InfinityParticleCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const theme = useArsenalTheme(palette);
  const pointerRef = usePointer(canvasRef, interactive);
  const seedRef = useRef(seed ?? randomSeed());
  const particlesRef = useRef<InfinityParticle[] | null>(null);
  const viewport = createInfinityFieldViewport(VIRTUAL_WIDTH, VIRTUAL_HEIGHT);

  const light = theme.scheme === 'light';
  const left = toRgb(leftColor ?? theme.amber, theme.amber);
  const right = toRgb(rightColor ?? theme.violet, theme.violet);
  const inks = buildInks(left, right, light, theme.text);
  const lift = light ? 1 : 1.32;
  const center = mixRgb(left, right, 0.5);

  useCanvasLoop(
    canvasRef,
    {
      rootMargin: '160px 0px',
      onResize: ({ width, height }) => {
        const desired = particleCount(width, height, minCount, maxCount);
        const existing = particlesRef.current;
        const ratio = existing ? desired / Math.max(1, existing.length) : 0;
        if (!existing || ratio < 0.82 || ratio > 1.18) {
          particlesRef.current = createInfinityParticleField(
            VIRTUAL_WIDTH,
            VIRTUAL_HEIGHT,
            desired,
            seedRef.current,
          );
        }
      },
      draw: ({ ctx, width, height, dt, deltaMs, time, reduced }) => {
        const list = particlesRef.current;
        if (!list) return;
        const scale = Math.min(width / VIRTUAL_WIDTH, height / VIRTUAL_HEIGHT);
        const offsetX = (width - VIRTUAL_WIDTH * scale) * 0.5;
        const offsetY = (height - VIRTUAL_HEIGHT * scale) * 0.5;
        const pc = reduced ? null : pointerRef.current;
        const pointer = pc
          ? {
              x: (pc.x - offsetX) / Math.max(1e-9, scale),
              y: (pc.y - offsetY) / Math.max(1e-9, scale),
            }
          : null;
        const t = reduced ? 0 : time;
        stepInfinityParticleField(list, pointer, dt, deltaMs, t, viewport);

        ctx.clearRect(0, 0, width, height);
        ctx.save();
        ctx.translate(offsetX, offsetY);
        ctx.scale(scale, scale);
        ctx.globalCompositeOperation = light ? 'source-over' : 'lighter';

        const breathGlobal = 0.98 + 0.02 * Math.sin(t * 0.000088);
        const glowBreath = 1 + 0.028 * Math.sin(t * 0.000076 + 1.05);
        for (const tier of TIERS) {
          for (const p of list) {
            if (p.tier !== tier) continue;
            const twinkleBase = 0.97 + 0.03 * Math.sin(t * 0.00015 + p.phase * 1.3);
            const sparkle =
              tier === 'base'
                ? 1
                : 1 + 0.022 * Math.sin(t * 0.00021 + p.phase * 2.8) * (tier === 'core' ? 1.04 : 1);
            const toneScale = 0.94 + 0.08 * (0.5 + 0.5 * Math.sin(p.phase * 2.2));
            const alpha = p.alpha * twinkleBase * sparkle * breathGlobal * toneScale * 1.08 * lift;
            const ink = inks[p.side][p.tier];
            const glowSize = p.size * GLOW_SCALE[tier] * glowBreath * (tier === 'core' ? 1.06 : 1);

            ctx.fillStyle = rgba(ink.glow, Math.min(1, alpha * ink.glowK));
            ctx.beginPath();
            ctx.arc(p.x, p.y, glowSize, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = rgba(ink.core, Math.min(1, alpha * ink.coreK));
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();

            if (tier === 'core' && !light) {
              const glint = 0.36 + 0.22 * Math.sin(t * 0.00018 + p.phase);
              const c = p.side === 'left' ? left : p.side === 'right' ? right : center;
              ctx.fillStyle = rgba(
                mixRgb(c, WHITE, 0.88),
                alpha * 0.22 * glint * (p.side === 'center' ? 1.12 : 1),
              );
              ctx.beginPath();
              ctx.arc(p.x, p.y, p.size * 0.38, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        }

        const cx = VIRTUAL_WIDTH * 0.5;
        const cy = VIRTUAL_HEIGHT * 0.5;
        const shimmer =
          0.075 + 0.026 * Math.sin(t * 0.000104) + 0.02 * Math.sin(t * 0.000171 + 0.7);
        const hot = light ? center : mixRgb(center, WHITE, 0.85);
        const sg = ctx.createRadialGradient(cx, cy, 0, cx, cy, 64);
        sg.addColorStop(0, rgba(hot, shimmer * 0.2));
        sg.addColorStop(0.2, rgba(mixRgb(center, WHITE, light ? 0.2 : 0.6), shimmer * 0.11));
        sg.addColorStop(0.4, rgba(left, shimmer * 0.07));
        sg.addColorStop(0.52, rgba(right, shimmer * 0.075));
        sg.addColorStop(0.72, rgba(right, shimmer * 0.04));
        sg.addColorStop(1, rgba(right, 0));
        ctx.fillStyle = sg;
        ctx.beginPath();
        ctx.arc(cx, cy, 64, 0, Math.PI * 2);
        ctx.fill();

        const beam = ctx.createLinearGradient(cx, cy - 88, cx, cy + 92);
        beam.addColorStop(0, rgba(hot, shimmer * 0.038));
        beam.addColorStop(0.48, rgba(hot, shimmer * 0.062));
        beam.addColorStop(0.54, rgba(hot, shimmer * 0.07));
        beam.addColorStop(0.66, rgba(mixRgb(right, WHITE, light ? 0 : 0.6), shimmer * 0.045));
        beam.addColorStop(1, rgba(hot, 0));
        ctx.fillStyle = beam;
        ctx.beginPath();
        ctx.ellipse(cx, cy + 5, 32, 92, 0, 0, Math.PI * 2);
        ctx.fill();

        const r = Math.min(VIRTUAL_WIDTH, VIRTUAL_HEIGHT) * 0.62;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.scale(1.08, 0.86);
        ctx.globalCompositeOperation = 'destination-in';
        const edge = ctx.createRadialGradient(0, 0, r * 0.24, 0, 0, r);
        edge.addColorStop(0, 'rgba(0, 0, 0, 1)');
        edge.addColorStop(0.52, 'rgba(0, 0, 0, 0.99)');
        edge.addColorStop(0.78, 'rgba(0, 0, 0, 0.52)');
        edge.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = edge;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        ctx.globalCompositeOperation = 'source-over';
        ctx.restore();
      },
    },
    [theme, left.join(), right.join(), minCount, maxCount],
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
        ...style,
      }}
    />
  );
}
