'use client';

import { motion } from 'framer-motion';
import type { CSSProperties } from 'react';
import { mixRgb, rgba, toRgb, type ColorInput, type PaletteMode, type Rgb } from './color';
import { GalaxyParticleCanvas } from './GalaxyParticleCanvas';
import { noiseDataUrl } from './NoiseTexture';
import { useArsenalTheme } from './use-arsenal-theme';
import { useReducedMotionGate } from './use-reduced-motion';

export type GalaxySceneProps = {
  seed?: number;
  /** Cool tint of the haze and the stars. Defaults to `--arsenal-accent-blue`. */
  accent?: ColorInput;
  /** Colour the scene fades into at its edges. Defaults to `--arsenal-background`. */
  background?: ColorInput;
  palette?: PaletteMode;
  interactive?: boolean;
  /** Paint a deep-space backdrop behind the galaxy (a soft paper wash on light pages). */
  backdrop?: boolean;
  grain?: boolean;
  className?: string;
  style?: CSSProperties;
};

const WHITE: Rgb = [255, 255, 255];
const BLACK: Rgb = [0, 0, 0];
const layer: CSSProperties = { position: 'absolute', pointerEvents: 'none' };

/**
 * A spiral galaxy as a full section visual: the particle galaxy with haze, bloom, an edge fade and
 * grain, fading in once. Fills its container's width; give it a height or keep the default.
 */
export function GalaxyScene({
  seed,
  accent,
  background,
  palette = 'auto',
  interactive = true,
  backdrop = true,
  grain = true,
  className,
  style,
}: GalaxySceneProps) {
  const theme = useArsenalTheme(palette);
  const reduced = useReducedMotionGate();
  const light = theme.scheme === 'light';

  const tint = toRgb(accent ?? theme.blue, theme.blue);
  const bg = toRgb(background ?? theme.background, theme.background);
  const pale = light ? mixRgb(tint, bg, 0.5) : mixRgb(tint, WHITE, 0.7);
  const deep = light ? mixRgb(bg, tint, 0.06) : mixRgb(bg, BLACK, 0.45);
  const lifted = light ? mixRgb(bg, WHITE, 0.4) : mixRgb(bg, tint, 0.08);
  const blend: CSSProperties['mixBlendMode'] = light ? 'normal' : 'screen';
  const k = light ? 0.7 : 1;
  const fieldMask =
    'radial-gradient(ellipse 68% 58% at 50% 50%, #000 28%, rgba(0,0,0,0.88) 52%, rgba(0,0,0,0.4) 76%, transparent 100%)';
  const grainMask = 'radial-gradient(ellipse 72% 58% at 50% 50%, black 44%, transparent 100%)';
  // A light page has no deep space to sit in: fade the whole scene out before its edges so it
  // never reads as a tinted box on paper.
  const edgeMask = light
    ? 'radial-gradient(ellipse 50% 50% at 50% 50%, #000 58%, transparent 100%)'
    : undefined;

  return (
    <div
      aria-hidden
      className={className}
      style={{
        position: 'relative',
        width: '100%',
        minHeight: 'clamp(420px, 80vh, 920px)',
        overflow: 'hidden',
        pointerEvents: 'none',
        background: backdrop
          ? `radial-gradient(ellipse 80% 70% at 50% 48%, ${rgba(lifted, 1)} 0%, ${rgba(bg, 1)} 52%, ${rgba(deep, 1)} 100%)`
          : undefined,
        maskImage: edgeMask,
        WebkitMaskImage: edgeMask,
        ...style,
      }}
    >
      <div
        style={{
          ...layer,
          inset: '-25%',
          background: [
            `radial-gradient(ellipse 60% 50% at 50% 48%, ${rgba(tint, 0.09 * k)}, transparent 70%)`,
            `radial-gradient(ellipse 90% 70% at 50% 55%, ${rgba(tint, 0.055 * k)}, transparent 75%)`,
          ].join(', '),
          filter: 'blur(40px)',
          opacity: 0.78,
          mixBlendMode: blend,
        }}
      />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: reduced ? 0 : 1.1, ease: [0.22, 1, 0.36, 1] }}
        style={{ ...layer, inset: 0, maskImage: fieldMask, WebkitMaskImage: fieldMask }}
      >
        <div
          style={{
            ...layer,
            inset: '-12%',
            background: [
              `radial-gradient(ellipse 58% 48% at 50% 50%, ${rgba(tint, 0.065 * k)}, transparent 70%)`,
              `radial-gradient(ellipse 80% 64% at 50% 52%, ${rgba(tint, 0.045 * k)}, transparent 74%)`,
              `radial-gradient(ellipse 24% 20% at 50% 50%, ${rgba(pale, 0.05 * k)}, transparent 72%)`,
            ].join(', '),
            filter: 'blur(32px)',
            opacity: 0.78,
            mixBlendMode: blend,
          }}
        />
        <GalaxyParticleCanvas
          seed={seed}
          accent={accent}
          palette={palette}
          interactive={interactive}
          style={{
            opacity: 0.94,
            mixBlendMode: blend,
            filter: light ? undefined : 'saturate(1.08)',
            touchAction: 'none',
          }}
        />
        <div
          style={{
            ...layer,
            inset: '-6%',
            background: `radial-gradient(ellipse 70% 60% at 50% 50%, transparent 44%, ${rgba(deep, 0.15)} 72%, ${rgba(deep, 0.55)} 100%)`,
          }}
        />
        {grain ? (
          <div
            style={{
              ...layer,
              inset: '10%',
              borderRadius: '32%',
              opacity: light ? 0.045 : 0.028,
              backgroundImage: noiseDataUrl(0.85, 3),
              backgroundSize: '180px 180px',
              mixBlendMode: light ? 'multiply' : 'overlay',
              maskImage: grainMask,
              WebkitMaskImage: grainMask,
            }}
          />
        ) : null}
      </motion.div>
    </div>
  );
}
