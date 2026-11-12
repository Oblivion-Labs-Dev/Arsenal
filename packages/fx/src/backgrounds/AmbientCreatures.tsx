'use client';

// Fireflies in dark mode, butterflies in light mode, crossfading when the theme flips. They
// wander, scatter from a moving pointer and land on a still one. Ported from the portfolio site
// (amsborse.github.io `src/components/ambient/AmbientCreatures.tsx`, same owner): the site's
// `useDocumentTheme` and `--color-*` reads became `useArsenalTheme`, its own rAF/visibility/
// reduced-motion code became `useCanvasLoop`, and its one-way "constrained" flag became the
// shared frame governor, so counts step down (and back up) on the same ladder as other effects.

import { useEffect, useRef, type CSSProperties } from 'react';
import { useFrameGovernor } from '../gpu/useFrameGovernor';
import { mixRgb, rgba, toRgb, type ColorInput, type PaletteMode, type Rgb } from './color';
import {
  createCreatureField,
  creaturePulse,
  leaveCreaturePointer,
  moveCreaturePointer,
  resizeCreatureField,
  setCreatureCount,
  stepCreatureField,
  type CreatureField,
  type CreatureFieldOptions,
} from './ambient-creatures';
import { createRng, randomSeed } from './random';
import { useArsenalTheme } from './use-arsenal-theme';
import { useCanvasLoop } from './use-canvas-loop';

export type CreatureSpecies = 'fireflies' | 'butterflies';

/** Butterfly wings in muted, paper-friendly pigments: `[wing, inner patch]`. */
export const DEFAULT_BUTTERFLY_WINGS: readonly (readonly [string, string])[] = [
  ['#c27a28', '#e9b86a'], // amber
  ['#9c4a2e', '#d48a63'], // rust
  ['#6e8758', '#b3c39a'], // sage
  ['#56708c', '#a3b7cc'], // dusty blue
  ['#7a4f6d', '#c29ab4'], // plum
  ['#b8952f', '#e6cf83'], // ochre
];

/** Count multipliers the frame governor walks when frames run long. */
const DENSITY_LADDER = [1, 0.5, 0.25] as const;
const SMALL_SCREEN = 720;
const FADE_SECONDS = 0.6;

export type AmbientCreaturesProps = {
  /** `auto` (default): fireflies on dark themes, butterflies on light ones. */
  species?: 'auto' | CreatureSpecies;
  /** Firefly count as `[wide, narrow ≤720px]`. Default `[34, 16]`. */
  fireflies?: readonly [number, number];
  /** Butterfly count as `[wide, narrow ≤720px]`. Default `[14, 7]`. */
  butterflies?: readonly [number, number];
  /** Butterfly `[wing, patch]` colours; each butterfly keeps one by index. */
  wings?: readonly (readonly [ColorInput, ColorInput])[];
  /** Firefly glow. Defaults to `--arsenal-accent-amber`. */
  glow?: ColorInput;
  /**
   * Horizontal band, as fractions of the width, where wandering creatures dim to stay out of
   * body copy, e.g. `[0.23, 0.72]`. Landing creatures stay bright. Default: none.
   */
  quietZone?: readonly [number, number] | null;
  /** Steering tuning: landing slots, still delay, flee radius, fear time. */
  behavior?: CreatureFieldOptions;
  /** React to the pointer. Default true. */
  interactive?: boolean;
  /** `absolute` (default) fills the positioned parent; `fixed` covers the viewport. */
  placement?: 'absolute' | 'fixed';
  seed?: number;
  palette?: PaletteMode;
  className?: string;
  style?: CSSProperties;
};

type Sprite = { key: string; canvas: HTMLCanvasElement };

function glowSprite(core: Rgb, halo: Rgb): HTMLCanvasElement | null {
  const sprite = document.createElement('canvas');
  sprite.width = sprite.height = 64;
  const g = sprite.getContext('2d');
  if (!g) return null;
  // One feathered sprite reused at every size; never shadowBlur in the hot loop.
  const gradient = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, rgba(core, 1));
  gradient.addColorStop(0.07, rgba(halo, 1));
  gradient.addColorStop(0.28, rgba(halo, 0.28));
  gradient.addColorStop(1, rgba(halo, 0));
  g.fillStyle = gradient;
  g.fillRect(0, 0, 64, 64);
  return sprite;
}

function drawButterfly(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle: number,
  scale: number,
  flap: number,
  wing: string,
  patch: string,
  body: string,
  alpha: number,
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle + Math.PI / 2);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.scale(scale * flap, scale);
  ctx.fillStyle = wing;
  ctx.beginPath();
  // Forewings taper toward the body; two smaller hindwings round out the silhouette.
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(-3, -9, -10, -9, -8, -2);
  ctx.bezierCurveTo(-8, 1, -3, 2, 0, 0);
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(3, -9, 10, -9, 8, -2);
  ctx.bezierCurveTo(8, 1, 3, 2, 0, 0);
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(-9, -1, -6, 9, -2, 5);
  ctx.quadraticCurveTo(0, 3, 0, 0);
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(9, -1, 6, 9, 2, 5);
  ctx.quadraticCurveTo(0, 3, 0, 0);
  ctx.fill();
  // A paler patch on each forewing gives the pigment depth without extra paths.
  ctx.fillStyle = patch;
  ctx.globalAlpha = alpha * 0.7;
  ctx.beginPath();
  ctx.ellipse(-5.2, -4.6, 1.9, 1.3, -0.5, 0, Math.PI * 2);
  ctx.moveTo(7.1, -4.6);
  ctx.ellipse(5.2, -4.6, 1.9, 1.3, 0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.globalAlpha = Math.min(1, alpha * 1.4);
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.ellipse(0, -0.5, 0.65, 3.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/**
 * Ambient fireflies or butterflies that scatter from a moving pointer and perch on a still one.
 * Pauses when hidden or off screen, draws nothing when motion is reduced, and halves its count on
 * the frame governor's ladder when frames run long. Pointer-transparent and `aria-hidden`.
 */
export function AmbientCreatures({
  species = 'auto',
  fireflies = [34, 16],
  butterflies = [14, 7],
  wings = DEFAULT_BUTTERFLY_WINGS,
  glow,
  quietZone = null,
  behavior,
  interactive = true,
  placement = 'absolute',
  seed,
  palette = 'auto',
  className,
  style,
}: AmbientCreaturesProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const theme = useArsenalTheme(palette);
  const { frame: governFrame, reset: resetGovernor } = useFrameGovernor(DENSITY_LADDER);
  const fieldRef = useRef<CreatureField | null>(null);
  const seedRef = useRef(seed ?? randomSeed());
  const spriteRef = useRef<Sprite | null>(null);
  const counters = useRef({ settled: -1, approaching: -1 });
  const target: CreatureSpecies =
    species === 'auto' ? (theme.scheme === 'light' ? 'butterflies' : 'fireflies') : species;
  // 0 = all fireflies, 1 = all butterflies; eased toward `target` in the draw loop.
  const fadeRef = useRef<number | null>(null);
  const population = Math.max(fireflies[0], fireflies[1], butterflies[0], butterflies[1]);

  const halo = toRgb(glow ?? theme.amber, theme.amber);
  const core = mixRgb(halo, [255, 252, 235], 0.7);
  const body = rgba(mixRgb(theme.text, halo, 0.2), 1);
  const wingInks = wings.map(
    ([w, p]) => [rgba(toRgb(w, theme.amber), 1), rgba(toRgb(p, theme.amber), 1)] as const,
  );
  const spriteKey = `${core.join()}|${halo.join()}`;

  // Creatures react anywhere over the canvas box; the canvas itself never takes pointer events.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !interactive) return undefined;
    const finePointer =
      typeof window.matchMedia === 'function'
        ? window.matchMedia('(hover: hover) and (pointer: fine)')
        : null;
    const local = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      return { x: event.clientX - rect.left, y: event.clientY - rect.top, rect };
    };
    const inside = (p: { x: number; y: number; rect: DOMRect }) =>
      p.x >= 0 && p.y >= 0 && p.x <= p.rect.width && p.y <= p.rect.height;
    const onMove = (event: PointerEvent) => {
      const field = fieldRef.current;
      if (!field || event.pointerType !== 'mouse' || finePointer?.matches === false) return;
      const p = local(event);
      if (inside(p)) moveCreaturePointer(field, p.x, p.y);
      else if (field.pointer.active) leaveCreaturePointer(field);
    };
    // Touch scatters the field but never recruits a lander.
    const onDown = (event: PointerEvent) => {
      const field = fieldRef.current;
      if (!field || event.pointerType === 'mouse') return;
      const p = local(event);
      if (inside(p)) moveCreaturePointer(field, p.x, p.y, false);
    };
    const onLeave = () => {
      if (fieldRef.current) leaveCreaturePointer(fieldRef.current);
    };
    const onOut = (event: PointerEvent) => {
      if (event.relatedTarget === null) onLeave();
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerdown', onDown, { passive: true });
    window.addEventListener('pointerout', onOut, { passive: true });
    window.addEventListener('blur', onLeave);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerout', onOut);
      window.removeEventListener('blur', onLeave);
      onLeave();
    };
  }, [interactive]);

  useCanvasLoop(
    canvasRef,
    {
      rootMargin: '0px',
      onResize: ({ width, height }) => {
        const field = fieldRef.current;
        if (field) resizeCreatureField(field, width, height);
        else
          fieldRef.current = createCreatureField(
            width,
            height,
            population,
            createRng(seedRef.current),
            behavior,
          );
      },
      draw: ({ ctx, width, height, deltaMs, time, reduced }) => {
        const canvas = canvasRef.current;
        const field = fieldRef.current;
        ctx.clearRect(0, 0, width, height);
        if (!field || !canvas) return;
        if (reduced) {
          // Ambient life is decoration: with motion reduced the layer stays empty.
          resetGovernor();
          leaveCreaturePointer(field);
          return;
        }
        const density = governFrame(time);
        const small = width <= SMALL_SCREEN;
        const goal = target === 'butterflies' ? 1 : 0;
        const dt = deltaMs / 1000;
        let fade = fadeRef.current ?? goal;
        fade += Math.max(-dt / FADE_SECONDS, Math.min(dt / FADE_SECONDS, goal - fade));
        fadeRef.current = fade;

        const nFireflies = Math.ceil(fireflies[small ? 1 : 0] * density);
        const nButterflies = Math.ceil(butterflies[small ? 1 : 0] * density);
        // Only creatures that are drawn are simulated, so hidden ones never hold a landing slot.
        setCreatureCount(
          field,
          fade === 1 ? nButterflies : fade === 0 ? nFireflies : Math.max(nFireflies, nButterflies),
        );
        stepCreatureField(field, dt);

        let sprite = spriteRef.current;
        if (!sprite || sprite.key !== spriteKey) {
          const built = glowSprite(core, halo);
          sprite = built ? { key: spriteKey, canvas: built } : null;
          spriteRef.current = sprite;
        }

        let settled = 0;
        let approaching = 0;
        for (let i = 0; i < field.count; i++) {
          const c = field.creatures[i]!;
          if (c.settled) settled++;
          else if (c.slot >= 0) approaching++;
          const quiet =
            quietZone && c.slot < 0 && c.x > width * quietZone[0] && c.x < width * quietZone[1]
              ? 0.38
              : 1;
          if (fade < 1 && i < nFireflies && sprite) {
            const size = 12 + c.depth * 15;
            ctx.globalAlpha =
              (1 - fade) * quiet * creaturePulse(c, field.time) * (0.5 + c.depth * 0.4);
            ctx.drawImage(sprite.canvas, c.x - size / 2, c.y - size / 2, size, size);
          }
          if (fade > 0 && i < nButterflies && wingInks.length > 0) {
            const [wing, patch] = wingInks[i % wingInks.length]!;
            const flap = 0.2 + 0.8 * (0.5 + 0.5 * Math.sin(c.wingPhase));
            drawButterfly(
              ctx,
              c.x,
              c.y,
              c.angle,
              0.65 + c.depth * 0.4,
              flap,
              wing,
              patch,
              body,
              fade * quiet * (0.36 + c.depth * 0.3),
            );
          }
        }
        ctx.globalAlpha = 1;
        // Small, inspectable state for browser checks; no React render per frame.
        if (settled !== counters.current.settled) {
          canvas.dataset.settled = String(settled);
          counters.current.settled = settled;
        }
        if (approaching !== counters.current.approaching) {
          canvas.dataset.approaching = String(approaching);
          counters.current.approaching = approaching;
        }
      },
    },
    [spriteKey, body, target, quietZone?.join(), wingInks.flat().join()],
  );

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      data-ambient-creatures=""
      className={className}
      style={{
        position: placement,
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
