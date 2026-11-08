'use client';

import { useRef, type CSSProperties } from 'react';
import { mixRgb, rgba, toRgb, type ColorInput, type PaletteMode, type Rgb } from './color';
import {
  createGalaxyFieldViewport,
  createGalaxyParticleField,
  stepGalaxyParticleField,
  type GalaxyHue,
  type GalaxyLayer,
  type GalaxyParticle,
} from './galaxy-field';
import { randomSeed } from './random';
import { useArsenalTheme } from './use-arsenal-theme';
import { useCanvasLoop, usePointer } from './use-canvas-loop';

export type GalaxyParticleCanvasProps = {
  /** Seed for the arm layout; omitted means a new galaxy per mount. */
  seed?: number;
  /** Cool accent used for the `cyan` stars and the core lift. Defaults to a pale ice blue (dark) or `--arsenal-accent-blue` (light). */
  accent?: ColorInput;
  /** Star ink on light backgrounds. Defaults to `--arsenal-text-primary`. */
  ink?: ColorInput;
  palette?: PaletteMode;
  /** Particles push away from the pointer. */
  interactive?: boolean;
  minCount?: number;
  maxCount?: number;
  className?: string;
  style?: CSSProperties;
};

const VIRTUAL_WIDTH = 1000;
const VIRTUAL_HEIGHT = 820;
const LAYERS: readonly GalaxyLayer[] = ['dust', 'mid', 'core'];
const GLOW_SCALE: Record<GalaxyLayer, number> = { core: 3.55, mid: 2.75, dust: 1.95 };

type Ink = { glow: Rgb; glowK: number; core: Rgb; coreK: number };
type GalaxyInks = Record<GalaxyLayer, Record<GalaxyHue, Ink>>;

/** Source palette: cool white / pale ice blue on dark. `cyan` follows the accent. */
function darkInks(accent: Rgb): GalaxyInks {
  const cyan = (base: Rgb) => mixRgb(base, accent, 0.25);
  return {
    core: {
      cyan: { glow: cyan([140, 195, 235]), glowK: 0.46, core: [232, 248, 255], coreK: 0.9 },
      ice: { glow: [175, 205, 238], glowK: 0.44, core: [248, 252, 255], coreK: 0.88 },
      pearl: { glow: [200, 218, 242], glowK: 0.45, core: [255, 255, 255], coreK: 0.9 },
    },
    mid: {
      cyan: { glow: cyan([95, 150, 205]), glowK: 0.3, core: [200, 230, 255], coreK: 0.76 },
      ice: { glow: [120, 155, 200], glowK: 0.28, core: [215, 232, 252], coreK: 0.74 },
      pearl: { glow: [105, 130, 168], glowK: 0.26, core: [210, 225, 245], coreK: 0.72 },
    },
    dust: {
      cyan: { glow: cyan([70, 110, 165]), glowK: 0.2, core: [165, 200, 240], coreK: 0.52 },
      ice: { glow: [78, 105, 145], glowK: 0.19, core: [175, 200, 235], coreK: 0.48 },
      pearl: { glow: [72, 88, 118], glowK: 0.18, core: [188, 202, 228], coreK: 0.52 },
    },
  };
}

/** Light paper: graphite and accent ink, drawn source-over with stronger alpha. */
function lightInks(accent: Rgb, ink: Rgb): GalaxyInks {
  const hue = (h: GalaxyHue, t: number): Rgb =>
    h === 'cyan' ? accent : h === 'ice' ? mixRgb(ink, accent, 0.45 * t) : ink;
  const layer = (glowK: number, coreK: number, t: number): Record<GalaxyHue, Ink> => ({
    cyan: { glow: hue('cyan', t), glowK, core: hue('cyan', t), coreK },
    ice: { glow: hue('ice', t), glowK, core: hue('ice', t), coreK },
    pearl: { glow: mixRgb(ink, accent, 0.2), glowK, core: hue('pearl', t), coreK },
  });
  return { core: layer(0.22, 1.6, 1), mid: layer(0.16, 1.35, 0.8), dust: layer(0.1, 1.05, 0.6) };
}

function particleCount(w: number, h: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.floor(Math.max(1, w * h) / 78)));
}

/**
 * An oblique log-spiral galaxy of a few hundred to ~1.4k stars that drift along their arms and
 * part around the pointer. Additive glow on dark, graphite ink on light.
 */
export function GalaxyParticleCanvas({
  seed,
  accent,
  ink,
  palette = 'auto',
  interactive = true,
  minCount = 560,
  maxCount = 1380,
  className,
  style,
}: GalaxyParticleCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const theme = useArsenalTheme(palette);
  const pointerRef = usePointer(canvasRef, interactive);
  const seedRef = useRef(seed ?? randomSeed());
  const fieldRef = useRef<{ particles: GalaxyParticle[]; numArms: number } | null>(null);
  const rotationRef = useRef(0);
  const viewport = createGalaxyFieldViewport(VIRTUAL_WIDTH, VIRTUAL_HEIGHT);

  const light = theme.scheme === 'light';
  const accentRgb = toRgb(accent ?? (light ? theme.blue : [150, 200, 240]), theme.blue);
  const inkRgb = toRgb(ink ?? theme.text, theme.text);
  const inks = light ? lightInks(accentRgb, inkRgb) : darkInks(accentRgb);
  const voidRgb: Rgb = light ? theme.background : [2, 4, 10];
  const hazeRgb: Rgb = light ? mixRgb(theme.background, accentRgb, 0.12) : [12, 18, 36];

  useCanvasLoop(
    canvasRef,
    {
      rootMargin: '160px 0px',
      onResize: ({ width, height }) => {
        const desired = particleCount(width, height, minCount, maxCount);
        const existing = fieldRef.current;
        const ratio = existing ? desired / Math.max(1, existing.particles.length) : 0;
        if (!existing || ratio < 0.82 || ratio > 1.18) {
          fieldRef.current = createGalaxyParticleField(
            VIRTUAL_WIDTH,
            VIRTUAL_HEIGHT,
            desired,
            seedRef.current,
          );
          rotationRef.current = 0;
        }
      },
      draw: ({ ctx, width, height, dt, deltaMs, time, reduced }) => {
        const field = fieldRef.current;
        if (!field) return;
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

        stepGalaxyParticleField(
          field.particles,
          field.numArms,
          pointer,
          dt,
          deltaMs,
          time,
          viewport,
          rotationRef,
          {
            reduceMotion: reduced,
          },
        );

        ctx.clearRect(0, 0, width, height);
        ctx.save();
        ctx.translate(offsetX, offsetY);
        ctx.scale(scale, scale);

        const cx = VIRTUAL_WIDTH * 0.5;
        const cy = VIRTUAL_HEIGHT * 0.5;
        const glowR = Math.min(VIRTUAL_WIDTH, VIRTUAL_HEIGHT) * 0.58;
        const t = reduced ? 0 : time;
        const bgBreath = 0.96 + 0.04 * Math.sin(t * 0.000058);
        const disc = (r0: number, r1: number, stops: [number, Rgb, number][]) => {
          const g = ctx.createRadialGradient(cx, cy, r0, cx, cy, r1);
          for (const [at, c, a] of stops) g.addColorStop(at, rgba(c, a));
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(cx, cy, r1, 0, Math.PI * 2);
          ctx.fill();
        };

        disc(0, glowR * 1.12, [
          [0, hazeRgb, 0.28 * bgBreath],
          [0.22, hazeRgb, 0.14 * bgBreath],
          [0.48, hazeRgb, 0.06 * bgBreath],
          [1, hazeRgb, 0],
        ]);
        const liftRgb = light ? accentRgb : mixRgb([55, 95, 155], accentRgb, 0.2);
        disc(0, glowR * 0.52, [
          [0, liftRgb, (light ? 0.06 : 0.1) * bgBreath],
          [0.28, liftRgb, (light ? 0.035 : 0.055) * bgBreath],
          [0.55, liftRgb, (light ? 0.016 : 0.028) * bgBreath],
          [1, liftRgb, 0],
        ]);
        disc(glowR * 0.08, glowR * 0.88, [
          [0, liftRgb, 0.06 * bgBreath],
          [0.35, liftRgb, 0.035 * bgBreath],
          [0.65, liftRgb, 0.015 * bgBreath],
          [1, liftRgb, 0],
        ]);

        ctx.globalCompositeOperation = light ? 'source-over' : 'lighter';
        const breathGlobal = 0.96 + 0.04 * Math.sin(t * 0.00007);
        const glowBreath = 1 + 0.03 * Math.sin(t * 0.00006 + 0.9);

        for (const layer of LAYERS) {
          for (const p of field.particles) {
            if (p.layer !== layer) continue;
            const twinkleBase = 0.94 + 0.06 * Math.sin(t * 0.00011 + p.phase * 1.2);
            const sparkle =
              layer === 'dust'
                ? 1
                : 1 + 0.04 * Math.sin(t * 0.00016 + p.phase * 2.3) * (layer === 'core' ? 1.06 : 1);
            const toneScale = 0.91 + 0.1 * (0.5 + 0.5 * Math.sin(p.phase * 2.1));
            const depthMul = 0.88 + 0.24 * ((p.sinPhi + 1) * 0.5);
            const alpha = p.alpha * twinkleBase * sparkle * breathGlobal * toneScale * depthMul;
            const c = inks[p.layer][p.hue];
            const glowSize =
              p.size * GLOW_SCALE[layer] * glowBreath * (layer === 'core' ? 1.03 : 1);

            ctx.fillStyle = rgba(c.glow, Math.min(1, alpha * c.glowK));
            ctx.beginPath();
            ctx.arc(p.x, p.y, glowSize, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = rgba(c.core, Math.min(1, alpha * c.coreK));
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();

            if (layer === 'core' && !light) {
              const glint = 0.3 + 0.22 * Math.sin(t * 0.00013 + p.phase);
              ctx.fillStyle = rgba([240, 248, 255], alpha * 0.2 * glint);
              ctx.beginPath();
              ctx.arc(p.x, p.y, p.size * 0.38, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        }

        const shimmer = 0.045 + 0.02 * Math.sin(t * 0.000082) + 0.014 * Math.sin(t * 0.00014 + 0.6);
        const shimmerRgb: Rgb = light ? accentRgb : [220, 235, 255];
        disc(0, 72, [
          [0, shimmerRgb, shimmer * 0.16],
          [0.22, shimmerRgb, shimmer * 0.08],
          [0.5, shimmerRgb, shimmer * 0.035],
          [1, shimmerRgb, 0],
        ]);

        ctx.globalCompositeOperation = 'source-over';
        disc(0, viewport.scale * 0.082, [
          [0, voidRgb, 0.55],
          [0.42, voidRgb, 0.09],
          [1, voidRgb, 0],
        ]);

        ctx.globalCompositeOperation = light ? 'source-over' : 'lighter';
        const rimRgb: Rgb = light ? accentRgb : [170, 200, 245];
        disc(viewport.scale * 0.042, viewport.scale * 0.12, [
          [0, rimRgb, 0],
          [0.52, rimRgb, 0.045],
          [1, rimRgb, 0],
        ]);

        const edgeR = Math.min(VIRTUAL_WIDTH, VIRTUAL_HEIGHT) * 0.64;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.scale(1.04, 0.88);
        ctx.globalCompositeOperation = 'destination-in';
        const edge = ctx.createRadialGradient(0, 0, edgeR * 0.22, 0, 0, edgeR);
        edge.addColorStop(0, 'rgba(0, 0, 0, 1)');
        edge.addColorStop(0.5, 'rgba(0, 0, 0, 0.97)');
        edge.addColorStop(0.72, 'rgba(0, 0, 0, 0.68)');
        edge.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = edge;
        ctx.beginPath();
        ctx.arc(0, 0, edgeR, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        ctx.globalCompositeOperation = 'source-over';
        ctx.restore();
      },
    },
    [theme, accentRgb.join(), inkRgb.join(), minCount, maxCount],
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
