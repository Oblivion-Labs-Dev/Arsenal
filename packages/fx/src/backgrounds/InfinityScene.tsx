'use client';

import { useRef, type CSSProperties } from 'react';
import { mixRgb, rgba, toRgb, type ColorInput, type PaletteMode, type Rgb } from './color';
import { InfinityParticleCanvas } from './InfinityParticleCanvas';
import { noiseDataUrl } from './NoiseTexture';
import { infinitySceneScrollOffsets, pointerParallaxOffset } from './scene-math';
import { useArsenalTheme } from './use-arsenal-theme';
import { useReducedMotionGate } from './use-reduced-motion';
import { useSceneDrift } from './use-scene-drift';

export type InfinitySceneProps = {
  seed?: number;
  /** Left lobe colour. Defaults to `--arsenal-accent-amber`. */
  leftColor?: ColorInput;
  /** Right lobe colour. Defaults to `--arsenal-accent-violet`. */
  rightColor?: ColorInput;
  /** Colour the scene fades into at its edges. Defaults to `--arsenal-background`. */
  background?: ColorInput;
  palette?: PaletteMode;
  /** Particles react to the pointer. */
  interactive?: boolean;
  /** The whole scene drifts a few pixels toward the mouse. */
  pointerParallax?: boolean;
  /** Haze and symbol drift apart slightly while the page scrolls. */
  scrollParallax?: boolean;
  /** Pointer drift per pixel of distance from the scene centre. */
  parallaxStrength?: number;
  grain?: boolean;
  className?: string;
  style?: CSSProperties;
};

const WHITE: Rgb = [255, 255, 255];
const layer: CSSProperties = { position: 'absolute', pointerEvents: 'none' };

/**
 * The full infinity hero scene: the particle symbol wrapped in haze, bloom, an edge fade and film
 * grain, drifting gently with the pointer and with scroll. It has no box of its own: the edges melt
 * into the page background, so place it directly on the page, not inside a card.
 */
export function InfinityScene({
  seed,
  leftColor,
  rightColor,
  background,
  palette = 'auto',
  interactive = true,
  pointerParallax = true,
  scrollParallax = true,
  parallaxStrength = 0.034,
  grain = true,
  className,
  style,
}: InfinitySceneProps) {
  const theme = useArsenalTheme(palette);
  const reduced = useReducedMotionGate();
  const light = theme.scheme === 'light';

  const rootRef = useRef<HTMLDivElement>(null);
  const driftRef = useRef<HTMLDivElement>(null);
  const ambientRef = useRef<HTMLDivElement>(null);
  const fieldRef = useRef<HTMLDivElement>(null);

  useSceneDrift({ reduced, scroll: scrollParallax, pointer: pointerParallax }, (state) => {
    const root = rootRef.current;
    const scrollOffsets = infinitySceneScrollOffsets(state.scrollY, state.reduced);
    if (ambientRef.current) {
      ambientRef.current.style.transform = `translate3d(0, ${scrollOffsets.ambient}px, 0)`;
    }
    if (fieldRef.current) {
      fieldRef.current.style.transform = `translate3d(0, ${scrollOffsets.symbol}px, 0)`;
    }
    if (driftRef.current) {
      const o =
        state.pointer && root
          ? pointerParallaxOffset(
              state.pointer.x,
              state.pointer.y,
              root.getBoundingClientRect(),
              parallaxStrength,
            )
          : { x: 0, y: 0 };
      driftRef.current.style.transform = `translate3d(${o.x}px, ${o.y}px, 0)`;
    }
  });

  const left = toRgb(leftColor ?? theme.amber, theme.amber);
  const right = toRgb(rightColor ?? theme.violet, theme.violet);
  const bg = toRgb(background ?? theme.background, theme.background);
  const center = light
    ? mixRgb(mixRgb(left, right, 0.5), bg, 0.4)
    : mixRgb(mixRgb(left, right, 0.5), WHITE, 0.8);
  // Glow is additive on dark pages; on light pages it becomes a quiet tint so paper stays paper.
  const blend: CSSProperties['mixBlendMode'] = light ? 'normal' : 'screen';
  const k = light ? 0.7 : 1;
  const fieldMask =
    'radial-gradient(ellipse 64% 52% at 50% 50%, #000 33%, rgba(0,0,0,0.82) 54%, rgba(0,0,0,0.36) 72%, transparent 100%)';
  const grainMask = 'radial-gradient(ellipse 72% 56% at 50% 50%, black 44%, transparent 100%)';

  return (
    <div
      ref={rootRef}
      aria-hidden
      className={className}
      style={{
        position: 'relative',
        width: '100%',
        aspectRatio: '1000 / 620',
        maxHeight: 'min(62vh, 720px)',
        pointerEvents: 'none',
        ...style,
      }}
    >
      <div
        ref={driftRef}
        style={{
          ...layer,
          inset: 0,
          transition: 'transform 0.16s cubic-bezier(0.22, 1, 0.36, 1)',
          willChange: 'transform',
        }}
      >
        <div
          ref={ambientRef}
          style={{
            ...layer,
            inset: '-20%',
            background: [
              `radial-gradient(ellipse 78% 64% at 32% 50%, ${rgba(left, 0.09 * k)}, transparent 70%)`,
              `radial-gradient(ellipse 78% 64% at 68% 50%, ${rgba(right, 0.095 * k)}, transparent 70%)`,
              `radial-gradient(ellipse 44% 38% at 50% 50%, ${rgba(center, 0.06 * k)}, transparent 70%)`,
            ].join(', '),
            filter: 'blur(34px)',
            opacity: 0.72,
            mixBlendMode: blend,
          }}
        />
        <div
          ref={fieldRef}
          style={{ ...layer, inset: '-10%', maskImage: fieldMask, WebkitMaskImage: fieldMask }}
        >
          <div
            style={{
              ...layer,
              inset: '-10%',
              background: [
                `radial-gradient(ellipse 72% 58% at 34% 52%, ${rgba(left, 0.065 * k)}, transparent 68%)`,
                `radial-gradient(ellipse 72% 58% at 66% 52%, ${rgba(right, 0.07 * k)}, transparent 68%)`,
                `radial-gradient(ellipse 40% 36% at 50% 50%, ${rgba(center, 0.06 * k)}, transparent 70%)`,
              ].join(', '),
              filter: 'blur(32px)',
              opacity: 0.64,
              mixBlendMode: blend,
            }}
          />
          <InfinityParticleCanvas
            seed={seed}
            leftColor={left}
            rightColor={right}
            palette={palette}
            interactive={interactive}
            style={{
              opacity: 0.98,
              mixBlendMode: blend,
              filter: light ? undefined : 'saturate(1.14) contrast(1.03)',
              touchAction: 'none',
            }}
          />
          {light ? null : (
            <div
              style={{
                ...layer,
                inset: '-10%',
                background: `radial-gradient(ellipse 26% 22% at 50% 50%, ${rgba(bg, 0.22)} 0%, ${rgba(bg, 0.06)} 45%, transparent 72%)`,
              }}
            />
          )}
          <div
            style={{
              ...layer,
              inset: '-8%',
              background: `radial-gradient(ellipse 68% 56% at 50% 50%, transparent 48%, ${rgba(bg, 0.1)} 64%, ${rgba(bg, 0.38)} 82%, ${rgba(bg, 0.68)} 100%)`,
            }}
          />
          {grain ? (
            <div
              style={{
                ...layer,
                inset: '9%',
                borderRadius: '32%',
                opacity: light ? 0.05 : 0.03,
                backgroundImage: noiseDataUrl(0.9, 3),
                backgroundSize: '180px 180px',
                mixBlendMode: light ? 'multiply' : 'overlay',
                maskImage: grainMask,
                WebkitMaskImage: grainMask,
              }}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
