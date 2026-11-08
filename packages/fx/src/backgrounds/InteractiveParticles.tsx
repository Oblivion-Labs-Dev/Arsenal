'use client';

import { useEffect, useRef, type CSSProperties } from 'react';
import { mixRgb, rgba, toRgb, type ColorInput, type PaletteMode, type Rgb } from './color';
import {
  createMeshParticles,
  meshLinkAlpha,
  meshLinkReach,
  meshViewportScale,
  stepMeshParticles,
  type MeshHue,
  type MeshIntensity,
  type MeshLayer,
  type MeshParticle,
} from './interactive-particles';
import { createRng, randomSeed } from './random';
import { useArsenalTheme } from './use-arsenal-theme';
import { useCanvasLoop, usePointer } from './use-canvas-loop';

export type InteractiveParticlesProps = {
  intensity?: MeshIntensity;
  seed?: number;
  /** Cool links and back-layer dots. Defaults to `--arsenal-accent-cyan`. */
  cyan?: ColorInput;
  /** Warm links and dots. Defaults to `--arsenal-accent-amber`. */
  amber?: ColorInput;
  violet?: ColorInput;
  /** Bright front-layer dots. Defaults to `--arsenal-accent`. */
  accent?: ColorInput;
  /** Colour of nodes the pointer has touched. Defaults to a pale cyan (dark) or amber (light). */
  highlight?: ColorInput;
  palette?: PaletteMode;
  /** Hover disturbs the mesh, holding pulls it in. */
  interactive?: boolean;
  scrollParallax?: boolean;
  className?: string;
  style?: CSSProperties;
};

const WHITE: Rgb = [248, 250, 255];
const LAYER_ALPHA: Record<'dark' | 'light', Record<MeshLayer, number>> = {
  dark: { back: 0.15, mid: 0.31, front: 0.66 },
  light: { back: 0.26, mid: 0.5, front: 0.82 },
};

/** A living constellation mesh in three depth layers: drifts up, parts on hover, gathers on hold. */
export function InteractiveParticles({
  intensity = 'normal',
  seed,
  cyan,
  amber,
  violet,
  accent,
  highlight,
  palette = 'auto',
  interactive = true,
  scrollParallax = true,
  className,
  style,
}: InteractiveParticlesProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const theme = useArsenalTheme(palette);
  const pointerRef = usePointer(canvasRef, interactive);
  const seedRef = useRef(seed ?? randomSeed());
  const particlesRef = useRef<MeshParticle[] | null>(null);
  const wrapRngRef = useRef(createRng(seedRef.current ^ 0x9e3779b9));
  const scrollRef = useRef({ y: 0, last: 0, velocity: 0 });
  const frameRef = useRef(0);

  useEffect(() => {
    const s = scrollRef.current;
    if (!scrollParallax) {
      s.y = 0;
      s.last = 0;
      s.velocity = 0;
      return;
    }
    const onScroll = () => {
      s.y = window.scrollY || 0;
    };
    onScroll();
    s.last = s.y;
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [scrollParallax]);

  const light = theme.scheme === 'light';
  const deepen = (c: Rgb) => (light ? mixRgb(c, theme.text, 0.25) : c);
  const hues: Record<MeshHue, Rgb> = {
    cyan: deepen(toRgb(cyan ?? theme.cyan, theme.cyan)),
    amber: deepen(toRgb(amber ?? theme.amber, theme.amber)),
    violet: deepen(toRgb(violet ?? theme.violet, theme.violet)),
    accent: deepen(toRgb(accent ?? theme.accent, theme.accent)),
  };
  const glowInk = toRgb(
    highlight ?? (light ? hues.amber : mixRgb(hues.cyan, WHITE, 0.6)),
    light ? hues.amber : WHITE,
  );
  const layerAlpha = LAYER_ALPHA[light ? 'light' : 'dark'];
  const colorKey = [...Object.values(hues), glowInk].map((c) => c.join()).join('|');

  useCanvasLoop(
    canvasRef,
    {
      rootMargin: '0px',
      onResize: ({ width, height }) => {
        particlesRef.current = createMeshParticles(width, height, intensity, seedRef.current);
      },
      draw: ({ ctx, width: w, height: h, dt, time, reduced }) => {
        const list = particlesRef.current;
        if (!list) return;
        const scroll = scrollRef.current;
        if (dt > 0) {
          scroll.velocity = scroll.velocity * 0.92 + (scroll.y - scroll.last) * 0.08;
          frameRef.current += dt;
        }
        scroll.last = scroll.y;
        const frame = frameRef.current;
        const ptr = reduced ? null : pointerRef.current;
        stepMeshParticles(list, {
          width: w,
          height: h,
          dt,
          frame,
          pointer: ptr
            ? { x: ptr.x, y: ptr.y, holdMs: ptr.pressed ? time - ptr.pressedAt : null }
            : null,
          scrollY: scroll.y,
          scrollVelocity: scroll.velocity,
          rng: wrapRngRef.current,
        });

        const scale = meshViewportScale(w, h);
        ctx.clearRect(0, 0, w, h);
        ctx.globalCompositeOperation = light ? 'source-over' : 'lighter';

        for (const p of list) {
          const pulse = reduced ? 0 : (Math.sin(p.lifePhase + frame * p.pulseSpeed) + 1) * 0.5;
          const glow = Math.min(1, p.influence);
          const touched = glow > 0.08;
          const ink = touched ? glowInk : hues[p.hue];
          const alpha = touched
            ? (light ? 0.45 : 0.3) + glow * (light ? 0.45 : 0.55)
            : layerAlpha[p.layer];
          if (p.depth > 0.6) {
            ctx.shadowBlur = (light ? 4 : 8) + glow * 12;
            ctx.shadowColor = rgba(ink, light ? 0.5 : 0.75);
          } else ctx.shadowBlur = 0;
          ctx.fillStyle = rgba(ink, alpha);
          ctx.beginPath();
          ctx.arc(p.drawX, p.drawY, p.radius + pulse * 0.45 + glow * 1.3 * p.depth, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.shadowBlur = 0;

        const linkTone = light ? 0.85 : 1;
        const mouseReach = (intensity === 'intense' ? 200 : 140) * scale;
        for (let i = 0; i < list.length; i++) {
          const a = list[i];
          if (!a) continue;
          const reach = meshLinkReach(a.depth, scale, intensity);
          for (let j = i + 1; j < list.length; j++) {
            const b = list[j];
            if (!b || Math.abs(a.depth - b.depth) > 0.4) continue;
            const dx = a.drawX - b.drawX;
            if (dx > reach || dx < -reach) continue;
            const dy = a.drawY - b.drawY;
            if (dy > reach || dy < -reach) continue;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const influence = Math.max(a.influence, b.influence);
            const alpha = meshLinkAlpha(dist, reach, a.depth, intensity, influence);
            if (alpha <= 0) continue;
            ctx.strokeStyle =
              influence > 0.08
                ? rgba(glowInk, Math.min(0.9, alpha + influence * 0.35))
                : rgba(a.depth > 0.8 ? hues.cyan : hues.amber, alpha * linkTone);
            ctx.lineWidth = 0.8 + influence * 1.15;
            ctx.beginPath();
            ctx.moveTo(a.drawX, a.drawY);
            ctx.lineTo(b.drawX, b.drawY);
            ctx.stroke();
          }
          if (ptr && a.depth > 0.6) {
            const mdx = ptr.x - a.drawX;
            const mdy = ptr.y - a.drawY;
            const md = Math.sqrt(mdx * mdx + mdy * mdy);
            if (md < mouseReach) {
              const alpha =
                ((mouseReach - md) / mouseReach) * (intensity === 'intense' ? 0.8 : 0.58) * a.depth;
              ctx.strokeStyle = rgba(hues.cyan, Math.min(1, alpha * linkTone));
              ctx.lineWidth = intensity === 'intense' ? 1.25 : 0.85;
              ctx.beginPath();
              ctx.moveTo(a.drawX, a.drawY);
              ctx.lineTo(ptr.x, ptr.y);
              ctx.stroke();
            }
          }
        }

        if (ptr) {
          const r = (36 + Math.sin(frame * 0.06) * 9) * scale;
          const g = ctx.createRadialGradient(ptr.x, ptr.y, 0, ptr.x, ptr.y, Math.max(1, r));
          g.addColorStop(0, rgba(glowInk, light ? 0.22 : 0.2));
          g.addColorStop(0.45, rgba(hues.cyan, light ? 0.14 : 0.1));
          g.addColorStop(1, rgba(hues.cyan, 0));
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(ptr.x, ptr.y, Math.max(1, r), 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalCompositeOperation = 'source-over';
      },
    },
    [theme, colorKey, intensity],
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
        opacity: intensity === 'intense' ? 0.95 : 0.85,
        ...style,
      }}
    />
  );
}
