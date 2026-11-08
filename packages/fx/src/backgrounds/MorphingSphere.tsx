'use client';

import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { mixRgb, rgba, toRgb, type ColorInput, type PaletteMode, type Rgb } from './color';
import {
  createMorphPoints,
  MORPH_DURATION_MS,
  MORPH_SHAPES,
  morphShapeTargets,
  projectPoint,
  stepMorphPoints,
  type MorphPoint,
  type MorphShape,
  type Vec3,
} from './morph-shapes';
import { randomSeed } from './random';
import { useArsenalTheme } from './use-arsenal-theme';
import { useCanvasLoop } from './use-canvas-loop';

export type MorphingSphereProps = {
  /** Controlled shape. Leave unset to let the built-in controls drive it. */
  shape?: MorphShape;
  defaultShape?: MorphShape;
  onShapeChange?: (shape: MorphShape) => void;
  /** Show the row of shape buttons under the canvas. */
  showControls?: boolean;
  /** Shapes offered by the controls. */
  shapes?: readonly MorphShape[];
  /** Point colours, cycled. Defaults to cyan, blue, violet and amber from the theme. */
  colors?: readonly ColorInput[];
  count?: number;
  seed?: number;
  palette?: PaletteMode;
  /** Drag to rotate. */
  interactive?: boolean;
  /** Faint links between nearby points. */
  links?: boolean;
  /** Canvas height in px (or any CSS length). */
  height?: number | string;
  className?: string;
  style?: CSSProperties;
};

/** Geometry is authored for a ~380px tall box; larger canvases scale it up. */
const DESIGN_SIZE = 380;
const TRAIL = 4;

type DrawPoint = {
  sx: number;
  sy: number;
  depth: number;
  radius: number;
  alpha: number;
  colorIndex: number;
  id: number;
};

/** A cloud of points that pours between sixteen 3D shapes and slowly spins; drag to turn it. */
export function MorphingSphere({
  shape: controlledShape,
  defaultShape = 'sphere',
  onShapeChange,
  showControls = true,
  shapes = MORPH_SHAPES,
  colors,
  count = 450,
  seed,
  palette = 'auto',
  interactive = true,
  links = true,
  height = 360,
  className,
  style,
}: MorphingSphereProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const theme = useArsenalTheme(palette);
  const [innerShape, setInnerShape] = useState<MorphShape>(defaultShape);
  const shape = controlledShape ?? innerShape;
  const seedRef = useRef(seed ?? randomSeed());

  const light = theme.scheme === 'light';
  const fallbackColors: readonly Rgb[] = [theme.cyan, theme.blue, theme.violet, theme.amber];
  const base = (colors && colors.length > 0 ? colors : fallbackColors).map((c, i) =>
    toRgb(c, fallbackColors[i % fallbackColors.length] ?? theme.accent),
  );
  // On light paper, deepen the inks toward the text colour so small dots keep contrast.
  const inks = base.map((c) => (light ? mixRgb(c, theme.text, 0.2) : c));
  const inkKey = inks.map((c) => c.join()).join('|');

  const pointsRef = useRef<MorphPoint[]>([]);
  const trailsRef = useRef<{ x: number; y: number; alpha: number }[][]>([]);
  const targetsRef = useRef<Vec3[]>([]);
  const morphStartRef = useRef(-Infinity);
  const rotationRef = useRef({ x: 0, y: 0 });
  const dragRef = useRef<{
    active: boolean;
    startX: number;
    startY: number;
    tx: number;
    ty: number;
  }>({ active: false, startX: 0, startY: 0, tx: 0, ty: 0 });

  // (Re)build the cloud when the point count or palette size changes.
  useMemo(() => {
    pointsRef.current = createMorphPoints(count, inks.length, seedRef.current);
    trailsRef.current = pointsRef.current.map(() => []);
    morphStartRef.current = -Infinity;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count, inks.length]);

  useEffect(() => {
    targetsRef.current = morphShapeTargets(shape, pointsRef.current.length, seedRef.current);
    morphStartRef.current = typeof performance === 'undefined' ? 0 : performance.now();
  }, [shape, count]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !interactive) return;
    const drag = dragRef.current;
    const onDown = (e: PointerEvent) => {
      drag.active = true;
      drag.startX = e.clientX;
      drag.startY = e.clientY;
      drag.tx = rotationRef.current.x;
      drag.ty = rotationRef.current.y;
    };
    const onMove = (e: PointerEvent) => {
      if (!drag.active) return;
      drag.tx = rotationRef.current.x + (e.clientY - drag.startY) * 0.01;
      drag.ty = rotationRef.current.y + (e.clientX - drag.startX) * 0.01;
    };
    const onUp = () => {
      drag.active = false;
    };
    canvas.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      canvas.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      drag.active = false;
    };
  }, [interactive]);

  useCanvasLoop(
    canvasRef,
    {
      rootMargin: '120px 0px',
      draw: ({ ctx, width, height: h, dt, time, reduced }) => {
        const points = pointsRef.current;
        const targets = targetsRef.current;
        const rot = rotationRef.current;
        const drag = dragRef.current;

        if (reduced) {
          // Calm, complete frame: points sit on the shape at a flattering three-quarter angle.
          for (const p of points) {
            const t = targets[p.id];
            if (t) {
              p.x = t.x;
              p.y = t.y;
              p.z = t.z;
            }
          }
          if (!drag.active && rot.x === 0 && rot.y === 0) {
            rot.x = 0.35;
            rot.y = 0.6;
          }
        } else {
          const progress = (time - morphStartRef.current) / MORPH_DURATION_MS;
          stepMorphPoints(points, targets, progress, dt);
          if (drag.active) {
            const k = 1 - Math.pow(1 - 0.08, dt);
            rot.x += (drag.tx - rot.x) * k;
            rot.y += (drag.ty - rot.y) * k;
          } else {
            rot.x += 0.003 * dt;
            rot.y += 0.005 * dt;
          }
        }

        const fit = Math.min(width, h) / DESIGN_SIZE;
        const cx = width / 2;
        const cy = h / 2;
        const pulseT = reduced ? 0 : time;
        const projected: DrawPoint[] = [];
        for (const p of points) {
          const pr = projectPoint(p, rot.x, rot.y, 0, 0);
          const pulse = Math.sin(pulseT * 0.0025 + p.id * 0.15) * 0.2 + 0.95;
          const d: DrawPoint = {
            sx: cx + pr.sx * fit,
            sy: cy + pr.sy * fit,
            depth: pr.depth,
            radius: Math.max(0.5, (pr.depth + 200) / 80) * pr.scale * pulse * Math.max(0.75, fit),
            alpha: Math.max(light ? 0.16 : 0.08, Math.min(0.85, (pr.depth + 180) / 360)),
            colorIndex: p.colorIndex,
            id: p.id,
          };
          projected.push(d);
          const trail = trailsRef.current[p.id];
          if (trail) {
            if (reduced) trail.length = 0;
            else {
              trail.push({ x: d.sx, y: d.sy, alpha: d.alpha });
              if (trail.length > TRAIL) trail.shift();
            }
          }
        }
        projected.sort((a, b) => b.depth - a.depth);

        ctx.clearRect(0, 0, width, h);
        for (const d of projected) {
          const ink = inks[d.colorIndex % inks.length] ?? theme.accent;
          const trail = trailsRef.current[d.id];
          if (trail && d.id % 2 === 0) {
            trail.forEach((t, idx) => {
              const f = (idx + 1) / trail.length;
              ctx.fillStyle = rgba(ink, t.alpha * 0.12 * f);
              ctx.beginPath();
              ctx.arc(t.x, t.y, d.radius * 0.82 * f, 0, Math.PI * 2);
              ctx.fill();
            });
          }
          // Near points glow on dark pages; glow muddies light paper, so it stays crisp there.
          const glow = !light && d.depth < -20;
          ctx.shadowBlur = glow ? 8 : 0;
          ctx.shadowColor = glow ? rgba(ink, 1) : 'transparent';
          ctx.fillStyle = rgba(ink, d.alpha);
          ctx.beginPath();
          ctx.arc(d.sx, d.sy, d.radius, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.shadowBlur = 0;

        if (links && shape !== 'wave') {
          const reach = 40 * Math.max(0.75, fit);
          ctx.lineWidth = 0.35;
          ctx.strokeStyle = rgba(
            light ? theme.text : mixRgb(theme.blue, theme.background, 0.3),
            0.09,
          );
          ctx.beginPath();
          for (let i = 0; i < projected.length; i += 8) {
            const a = projected[i];
            if (!a) continue;
            for (let j = i + 1; j < projected.length; j += 8) {
              const b = projected[j];
              if (!b) continue;
              const dx = a.sx - b.sx;
              const dy = a.sy - b.sy;
              if (dx * dx + dy * dy < reach * reach && Math.abs(a.depth - b.depth) < 30) {
                ctx.moveTo(a.sx, a.sy);
                ctx.lineTo(b.sx, b.sy);
              }
            }
          }
          ctx.stroke();
        }
      },
    },
    [theme, inkKey, shape, links, count],
  );

  const select = (next: MorphShape) => {
    if (controlledShape === undefined) setInnerShape(next);
    onShapeChange?.(next);
  };

  const accent = rgba(theme.accent, 1);
  const textColor = rgba(theme.text, 1);
  const muted = rgba(theme.text, 0.62);

  return (
    <div
      className={className}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 20,
        width: '100%',
        ...style,
      }}
    >
      <div style={{ position: 'relative', width: '100%', height }}>
        <canvas
          ref={canvasRef}
          aria-label={`Particle ${shape}`}
          role="img"
          style={{
            display: 'block',
            width: '100%',
            height: '100%',
            cursor: interactive ? 'grab' : undefined,
            touchAction: interactive ? 'none' : undefined,
          }}
        />
      </div>
      {showControls ? (
        <div
          role="group"
          aria-label="Shape"
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: 6,
            maxWidth: '95%',
            padding: '10px 16px',
            borderRadius: 16,
            border: `1px solid ${rgba(theme.text, 0.12)}`,
            background: rgba(theme.background, 0.88),
            boxShadow: light
              ? '0 6px 20px rgba(40, 30, 10, 0.08)'
              : `0 8px 28px ${rgba([0, 0, 0], 0.35)}`,
          }}
        >
          {shapes.map((s) => {
            const active = s === shape;
            return (
              <button
                key={s}
                type="button"
                aria-pressed={active}
                onClick={() => select(s)}
                style={{
                  padding: '4px 10px',
                  borderRadius: 6,
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                  fontSize: '0.65rem',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  fontWeight: active ? 600 : 400,
                  color: active ? rgba(theme.background, 1) : muted,
                  background: active ? accent : 'transparent',
                  transition: 'background-color 240ms ease, color 240ms ease',
                }}
                onMouseEnter={(e) => {
                  if (!active) e.currentTarget.style.color = textColor;
                }}
                onMouseLeave={(e) => {
                  if (!active) e.currentTarget.style.color = muted;
                }}
              >
                {s}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
