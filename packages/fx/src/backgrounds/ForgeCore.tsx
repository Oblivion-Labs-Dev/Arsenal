'use client';

import { useRef, type CSSProperties } from 'react';
import { mixRgb, rgba, toRgb, type ColorInput, type PaletteMode, type Rgb } from './color';
import {
  FORGE_RINGS,
  createForgeCore,
  emberHeat,
  hexPerimeterPoint,
  ringRotation,
  sparkPosition,
  stepForgeCore,
  type ForgeCoreState,
} from './forge-core';
import { randomSeed } from './random';
import { useArsenalTheme } from './use-arsenal-theme';
import { useCanvasLoop, usePointer } from './use-canvas-loop';

export type ForgeCoreProps = {
  seed?: number;
  /** Core colour. Defaults to the theme's `--arsenal-accent`. */
  color?: ColorInput;
  palette?: PaletteMode;
  /** Rings lean toward the pointer. */
  interactive?: boolean;
  /** Horizontal centre as a fraction of the width (0.5 = middle). Below 720px it is always centred. */
  focusX?: number;
  /** Vertical centre as a fraction of the height. */
  focusY?: number;
  /** Outer ring radius as a fraction of the shorter side. */
  scale?: number;
  className?: string;
  style?: CSSProperties;
};

const WHITE: Rgb = [255, 255, 255];
const TAU = Math.PI * 2;

function hexPath(ctx: CanvasRenderingContext2D, radius: number, rotation: number) {
  ctx.beginPath();
  for (let k = 0; k <= 6; k += 1) {
    const p = hexPerimeterPoint(k / 6, radius, rotation);
    if (k === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  }
  ctx.closePath();
}

/**
 * The Arsenal signature: the hex mark as a living forge. Three counter-rotating hex rings carry
 * sparks along their edges while embers spiral in and heat a breathing core.
 */
export function ForgeCore({
  seed,
  color,
  palette = 'auto',
  interactive = true,
  focusX = 0.5,
  focusY = 0.5,
  scale = 0.42,
  className,
  style,
}: ForgeCoreProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const theme = useArsenalTheme(palette);
  const pointerRef = usePointer(canvasRef, interactive);
  const seedRef = useRef(seed ?? randomSeed());
  const stateRef = useRef<ForgeCoreState | null>(null);
  const leanRef = useRef({ x: 0, y: 0 });

  const light = theme.scheme === 'light';
  const accent = toRgb(color ?? theme.accent, theme.accent);
  const ink = light ? mixRgb(accent, theme.text, 0.25) : accent;
  const hot = light ? mixRgb(accent, theme.text, 0.1) : mixRgb(accent, WHITE, 0.75);
  const line = light ? mixRgb(theme.text, accent, 0.35) : mixRgb(theme.text, accent, 0.45);

  useCanvasLoop(
    canvasRef,
    {
      rootMargin: '120px 0px',
      onResize: ({ width, height }) => {
        if (stateRef.current) return;
        const area = Math.max(1, width * height);
        const orbit = Math.round(Math.min(90, Math.max(36, area / 9000)));
        const embers = Math.round(Math.min(110, Math.max(40, area / 7000)));
        stateRef.current = createForgeCore(orbit, embers, seedRef.current);
      },
      draw: ({ ctx, width, height, dt, time, reduced }) => {
        const state = stateRef.current;
        if (!state) return;
        const t = reduced ? 0 : time;
        if (!reduced) stepForgeCore(state, dt);

        const narrow = width < 720;
        const cx = width * (narrow ? 0.5 : focusX);
        const cy = height * focusY;
        const radius = Math.min(width, height) * scale;

        // Ease the lean toward the pointer so the rings drift instead of snapping.
        const pointer = reduced ? null : pointerRef.current;
        const target = pointer
          ? {
              x: Math.max(-1, Math.min(1, (pointer.x - cx) / (radius * 2))),
              y: Math.max(-1, Math.min(1, (pointer.y - cy) / (radius * 2))),
            }
          : { x: 0, y: 0 };
        const ease = reduced ? 1 : 1 - Math.pow(0.94, dt);
        leanRef.current.x += (target.x - leanRef.current.x) * ease;
        leanRef.current.y += (target.y - leanRef.current.y) * ease;
        const lean = leanRef.current;
        const shift = (ring: number) => ({
          x: lean.x * radius * 0.05 * (ring + 1),
          y: lean.y * radius * 0.05 * (ring + 1),
        });

        ctx.clearRect(0, 0, width, height);
        ctx.save();
        ctx.translate(cx, cy);
        ctx.globalCompositeOperation = light ? 'source-over' : 'lighter';

        const breath = 0.5 + 0.5 * Math.sin(t * 0.0011);

        // Atmosphere: a wide, soft pool of the accent behind everything.
        const pool = ctx.createRadialGradient(0, 0, 0, 0, 0, radius * 1.5);
        pool.addColorStop(0, rgba(ink, light ? 0.1 : 0.16 + breath * 0.04));
        pool.addColorStop(0.45, rgba(ink, light ? 0.04 : 0.06));
        pool.addColorStop(1, rgba(ink, 0));
        ctx.fillStyle = pool;
        ctx.beginPath();
        ctx.arc(0, 0, radius * 1.5, 0, TAU);
        ctx.fill();

        // Rings with one travelling highlight each.
        FORGE_RINGS.forEach((fraction, ring) => {
          const r = radius * fraction;
          const rot = ringRotation(ring, t);
          const { x, y } = shift(ring);
          ctx.save();
          ctx.translate(x, y);
          hexPath(ctx, r, rot);
          ctx.strokeStyle = rgba(line, light ? 0.2 + ring * 0.03 : 0.14 + ring * 0.02);
          ctx.lineWidth = ring === 0 ? 1.4 : 1;
          ctx.stroke();

          const head = (t * 0.00006 * (ring + 1) + ring * 0.31) % 1;
          const steps = 18;
          for (let i = 0; i < steps; i += 1) {
            const a = hexPerimeterPoint(head - (i / steps) * 0.12, r, rot);
            const b = hexPerimeterPoint(head - ((i + 1) / steps) * 0.12, r, rot);
            ctx.strokeStyle = rgba(hot, (1 - i / steps) * (light ? 0.55 : 0.7));
            ctx.lineWidth = ring === 0 ? 2 : 1.6;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
          ctx.restore();
        });

        // Sparks and embers.
        for (const s of state.sparks) {
          const p = sparkPosition(s, radius, t);
          const ring = s.kind === 'orbit' ? s.ring : 2 - Math.round(s.life * 2);
          const { x, y } = shift(ring);
          const twinkle = 0.75 + 0.25 * Math.sin(t * 0.003 + s.phase);
          const heat = s.kind === 'ember' ? emberHeat(s.life) : 1;
          const alpha = s.alpha * twinkle * heat * (light ? 0.75 : 1);
          if (alpha <= 0.01) continue;
          const size = s.size * (s.kind === 'ember' ? 0.8 + s.life * 0.9 : 1);
          const tone = s.kind === 'ember' ? mixRgb(ink, hot, s.life) : ink;
          ctx.fillStyle = rgba(tone, alpha * (light ? 0.18 : 0.28));
          ctx.beginPath();
          ctx.arc(p.x + x, p.y + y, size * 3.2, 0, TAU);
          ctx.fill();
          ctx.fillStyle = rgba(light ? tone : mixRgb(tone, WHITE, 0.55), Math.min(1, alpha));
          ctx.beginPath();
          ctx.arc(p.x + x, p.y + y, size, 0, TAU);
          ctx.fill();
        }

        // The core: a small hex of light that breathes.
        const coreR = radius * (0.11 + breath * 0.012);
        const core = ctx.createRadialGradient(0, 0, 0, 0, 0, coreR * 3.2);
        core.addColorStop(0, rgba(hot, light ? 0.65 : 0.95));
        core.addColorStop(0.25, rgba(ink, light ? 0.35 : 0.5));
        core.addColorStop(1, rgba(ink, 0));
        ctx.fillStyle = core;
        ctx.beginPath();
        ctx.arc(0, 0, coreR * 3.2, 0, TAU);
        ctx.fill();
        hexPath(ctx, coreR, ringRotation(1, t) * 1.6);
        ctx.strokeStyle = rgba(hot, light ? 0.7 : 0.85);
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Fade the whole thing into the page: no visible canvas edge.
        ctx.globalCompositeOperation = 'destination-in';
        const edgeR = radius * 1.55;
        const edge = ctx.createRadialGradient(0, 0, radius * 0.6, 0, 0, edgeR);
        edge.addColorStop(0, 'rgba(0,0,0,1)');
        edge.addColorStop(0.7, 'rgba(0,0,0,0.6)');
        edge.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = edge;
        ctx.fillRect(-cx, -cy, width, height);

        ctx.globalCompositeOperation = 'source-over';
        ctx.restore();
      },
    },
    [theme, accent.join(), focusX, focusY, scale],
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
