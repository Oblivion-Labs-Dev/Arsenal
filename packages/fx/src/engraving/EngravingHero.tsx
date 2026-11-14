/**
 * EngravingHero: a wood engraving of a lighthouse that prints itself in on arrival, then aims
 * its beam at the pointer and lifts the storm where the light falls.
 *
 * Origin: amsborse.github.io redesign, `src/designs/broadsheet/HeroFrontPage.tsx` (the canvas
 * part; the site's dateline and caption stay in the site). Colours come from props or, by
 * default, from CSS custom properties on the canvas, so it takes any design's tokens.
 * Lift-and-shift: copy this file with `engraving.ts`.
 *
 * Pauses offscreen, ignores touch pointers, draws the finished print at once under reduced
 * motion, and stops scheduling frames once the beam has settled.
 */
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import {
  RESTING_BEAM,
  aimBeam,
  beamCone,
  createScene,
  engrave,
  paintDetails,
  paintRibbons,
  type Beam,
  type EngravingInk,
} from './engraving';

export interface EngravingHeroProps {
  /** Dark mode prints white lines on dark paper and lifts the beam more. */
  theme?: 'light' | 'dark';
  reducedMotion?: boolean;
  /** Fixed colours; when omitted they are read from `inkVars` on the canvas. */
  ink?: Partial<EngravingInk>;
  /** CSS custom properties to read the ink, paper and spot colours from. */
  inkVars?: { ink: string; paper: string; spot: string };
  /** How long the print-in takes, in milliseconds. */
  printMs?: number;
  /** Device pixel ratio cap; the engraving is fine-lined, so 1.5 is plenty. */
  maxDpr?: number;
  /** Follow the pointer with the beam (default true). */
  interactive?: boolean;
  label?: string;
  className?: string;
  style?: CSSProperties;
  /** Called once the first frame is on the canvas. */
  onReady?: () => void;
}

const DEFAULT_VARS = { ink: '--color-ink', paper: '--color-bg', spot: '--color-accent' };
const FALLBACK_INK: EngravingInk = { ink: '#1a1714', paper: '#f4efe6', spot: '#d9442b' };

export function readEngravingInk(
  element: Element,
  vars: EngravingHeroProps['inkVars'] = DEFAULT_VARS,
  override: Partial<EngravingInk> = {},
): EngravingInk {
  const style = getComputedStyle(element);
  const read = (name: string, fallback: string) => style.getPropertyValue(name).trim() || fallback;
  return {
    ink: override.ink ?? read(vars.ink, FALLBACK_INK.ink),
    paper: override.paper ?? read(vars.paper, FALLBACK_INK.paper),
    spot: override.spot ?? read(vars.spot, FALLBACK_INK.spot),
  };
}

export function EngravingHero({
  theme = 'light',
  reducedMotion = false,
  ink: inkOverride,
  inkVars = DEFAULT_VARS,
  printMs = 1400,
  maxDpr = 1.5,
  interactive = true,
  label = 'Wood engraving of a lighthouse keeping its beam steady over a storm at sea',
  className,
  style,
  onReady,
}: EngravingHeroProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;
  const inkKey = JSON.stringify([inkOverride ?? null, inkVars]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;
    const [override, vars] = JSON.parse(inkKey) as [
      Partial<EngravingInk> | null,
      NonNullable<EngravingHeroProps['inkVars']>,
    ];
    const dark = theme === 'dark';

    let base: HTMLCanvasElement | null = null;
    let lit: HTMLCanvasElement | null = null;
    let scene = createScene(1.4);
    let ink = readEngravingInk(canvas, vars, override ?? {});
    let cssHeight = 1;
    let dpr = 1;
    let frame = 0;
    let visible = true;
    let printStart = -1;
    let progress = reducedMotion ? 1 : 0;
    let angle = RESTING_BEAM.angle;
    let target = RESTING_BEAM.angle;
    let velocity = 0;
    let announced = false;

    const markReady = () => {
      setReady(true);
      if (!announced) {
        announced = true;
        onReadyRef.current?.();
      }
    };

    const layer = (width: number, height: number, lift: number) => {
      const off = document.createElement('canvas');
      off.width = width;
      off.height = height;
      const g = off.getContext('2d');
      if (!g) return off;
      g.setTransform(dpr * cssHeight, 0, 0, dpr * cssHeight, 0, 0);
      g.fillStyle = ink.paper;
      g.fillRect(0, 0, scene.aspect, 1);
      const spacing = Math.max(0.0065, 3.2 / cssHeight);
      paintRibbons(g, engrave(scene, { spacing, step: spacing / 2, lift, invert: dark }), ink.ink);
      return off;
    };

    const build = () => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width < 2 || rect.height < 2) return false;
      dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
      cssHeight = rect.height;
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      scene = createScene(rect.width / rect.height);
      ink = readEngravingInk(canvas, vars, override ?? {});
      base = layer(canvas.width, canvas.height, 0);
      lit = layer(canvas.width, canvas.height, dark ? 0.7 : 0.3);
      return true;
    };

    const draw = (printed: number) => {
      if (!base || !lit) return;
      const beam: Beam = { ...RESTING_BEAM, angle };
      context.setTransform(1, 0, 0, 1, 0, 0);
      context.fillStyle = ink.paper;
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.save();
      context.beginPath();
      context.rect(0, 0, canvas.width, canvas.height * printed);
      context.clip();
      context.drawImage(base, 0, 0);
      // The beam: the lit print shows through a cone, washed with the spot colour.
      const scale = dpr * cssHeight;
      const cone = beamCone(scene, beam);
      context.beginPath();
      context.moveTo(cone[0].x * scale, cone[0].y * scale);
      context.lineTo(cone[1].x * scale, cone[1].y * scale);
      context.lineTo(cone[2].x * scale, cone[2].y * scale);
      context.closePath();
      context.clip();
      context.drawImage(lit, 0, 0);
      context.globalAlpha = dark ? 0.1 : 0.05;
      context.fillStyle = ink.spot;
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.restore();
      if (printed >= 1) {
        context.setTransform(scale, 0, 0, scale, 0, 0);
        paintDetails(context, scene, ink);
      }
    };

    const tick = (now: number) => {
      frame = 0;
      if (printStart < 0) printStart = now;
      const printed = reducedMotion ? 1 : Math.min(1, (now - printStart) / printMs);
      progress = printed;
      // A damped spring towards the pointer's angle; it stops scheduling once settled.
      const force = (target - angle) * 0.06 - velocity * 0.32;
      velocity += force;
      angle += velocity;
      const settled = Math.abs(target - angle) < 1e-4 && Math.abs(velocity) < 1e-4;
      if (settled) angle = target;
      draw(printed);
      if ((printed < 1 || !settled) && visible && !reducedMotion)
        frame = requestAnimationFrame(tick);
    };
    const schedule = () => {
      if (!frame && visible) frame = requestAnimationFrame(tick);
    };

    if (build()) {
      if (reducedMotion) draw(1);
      else schedule();
      markReady();
    }

    const resize =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(() => {
            if (!build()) return;
            markReady();
            draw(progress);
            if (progress < 1 && !reducedMotion) schedule();
          });
    resize?.observe(canvas);

    const intersection =
      typeof IntersectionObserver === 'undefined'
        ? null
        : new IntersectionObserver(([entry]) => {
            visible = entry.isIntersecting;
            if (visible) schedule();
            else if (frame) {
              cancelAnimationFrame(frame);
              frame = 0;
            }
          });
    intersection?.observe(canvas);

    const onPointer = (event: PointerEvent) => {
      if (reducedMotion || event.pointerType === 'touch') return;
      const rect = canvas.getBoundingClientRect();
      if (rect.height < 1) return;
      target = aimBeam(scene, {
        x: (event.clientX - rect.left) / rect.height,
        y: (event.clientY - rect.top) / rect.height,
      }).angle;
      schedule();
    };
    const onLeave = () => {
      target = RESTING_BEAM.angle;
      schedule();
    };
    if (interactive) {
      window.addEventListener('pointermove', onPointer, { passive: true });
      document.documentElement.addEventListener('pointerleave', onLeave);
    }

    return () => {
      if (frame) cancelAnimationFrame(frame);
      resize?.disconnect();
      intersection?.disconnect();
      window.removeEventListener('pointermove', onPointer);
      document.documentElement.removeEventListener('pointerleave', onLeave);
    };
  }, [theme, reducedMotion, inkKey, printMs, maxDpr, interactive]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={style}
      data-ready={ready ? 'true' : undefined}
      role="img"
      aria-label={label}
    />
  );
}
