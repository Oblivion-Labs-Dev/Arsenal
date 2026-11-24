'use client';

import { useRef, type CSSProperties } from 'react';
import { AuroraBackground } from './AuroraBackground';
import { mixRgb, rgba, type PaletteMode, type Rgb } from './color';
import { CosmicParticleBackground } from './CosmicParticleBackground';
import { NoiseTexture } from './NoiseTexture';
import { immersiveLayerOffsets } from './scene-math';
import { useArsenalTheme } from './use-arsenal-theme';
import { useReducedMotionGate } from './use-reduced-motion';
import { useSceneDrift } from './use-scene-drift';

export type ImmersiveBackgroundProps = {
  palette?: PaletteMode;
  /** Pin to the viewport (`position: fixed`). Set false to fill a positioned parent instead. */
  fixed?: boolean;
  /** The three layers drift at different speeds while the page scrolls. */
  scrollParallax?: boolean;
  particles?: boolean;
  aurora?: boolean;
  noise?: boolean;
  /** Particles react to the pointer. */
  interactive?: boolean;
  seed?: number;
  zIndex?: number;
  className?: string;
  style?: CSSProperties;
};

const BLACK: Rgb = [0, 0, 0];
const layerBase: CSSProperties = {
  position: 'absolute',
  inset: '-8%',
  pointerEvents: 'none',
  willChange: 'transform',
};

/**
 * A whole-page atmosphere in three depth layers: colour pools at the back, a drifting particle
 * field in the middle, aurora and film grain in front. The layers slide at different speeds on
 * scroll. Render it once near the root, behind the content.
 */
export function ImmersiveBackground({
  palette = 'auto',
  fixed = true,
  scrollParallax = true,
  particles = true,
  aurora = true,
  noise = true,
  interactive = true,
  seed,
  zIndex = 0,
  className,
  style,
}: ImmersiveBackgroundProps) {
  const theme = useArsenalTheme(palette);
  const reduced = useReducedMotionGate();
  const light = theme.scheme === 'light';
  const backRef = useRef<HTMLDivElement>(null);
  const midRef = useRef<HTMLDivElement>(null);
  const frontRef = useRef<HTMLDivElement>(null);

  useSceneDrift({ reduced, scroll: scrollParallax, pointer: false }, (state) => {
    const o = immersiveLayerOffsets(state.scrollY, state.reduced);
    if (backRef.current) backRef.current.style.transform = `translate3d(0, ${o.back}px, 0)`;
    if (midRef.current) midRef.current.style.transform = `translate3d(0, ${o.mid}px, 0)`;
    if (frontRef.current) frontRef.current.style.transform = `translate3d(0, ${o.front}px, 0)`;
  });

  const bg = theme.background;
  const k = light ? 0.6 : 1;
  const blend: CSSProperties['mixBlendMode'] = light ? 'normal' : 'screen';
  const top = light ? bg : mixRgb(bg, BLACK, 0.25);
  const bottom = light ? mixRgb(bg, theme.text, 0.03) : mixRgb(bg, BLACK, 0.5);

  return (
    <div
      aria-hidden
      className={className}
      style={{
        position: fixed ? 'fixed' : 'absolute',
        inset: 0,
        zIndex,
        overflow: 'hidden',
        pointerEvents: 'none',
        ...style,
      }}
    >
      <div ref={backRef} style={layerBase}>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: [
              `radial-gradient(ellipse 60% 50% at 12% 48%, ${rgba(theme.amber, 0.08 * k)}, transparent 62%)`,
              `radial-gradient(ellipse 60% 50% at 88% 44%, ${rgba(theme.violet, 0.09 * k)}, transparent 62%)`,
              `radial-gradient(ellipse 70% 50% at 15% -10%, ${rgba(theme.blue, 0.12 * k)}, transparent 60%)`,
              `radial-gradient(ellipse 50% 40% at 100% 0%, ${rgba(theme.cyan, 0.06 * k)}, transparent 60%)`,
              `linear-gradient(180deg, ${rgba(top, 1)}, ${rgba(bg, 1)} 36%, ${rgba(bottom, 1)})`,
            ].join(', '),
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: '-18%',
            background: [
              `radial-gradient(ellipse 42% 36% at 22% 58%, ${rgba(theme.amber, 0.09 * k)}, transparent 70%)`,
              `radial-gradient(ellipse 44% 38% at 78% 40%, ${rgba(theme.violet, 0.1 * k)}, transparent 70%)`,
              `radial-gradient(ellipse 36% 30% at 60% 82%, ${rgba(theme.cyan, 0.05 * k)}, transparent 72%)`,
            ].join(', '),
            filter: 'blur(56px)',
            opacity: 0.72,
            mixBlendMode: blend,
          }}
        />
      </div>

      <div ref={midRef} style={layerBase}>
        <div
          style={{
            position: 'absolute',
            inset: '-4% -8%',
            background: [
              `radial-gradient(ellipse 30% 26% at 30% 30%, ${rgba(theme.blue, 0.06 * k)}, transparent 72%)`,
              `radial-gradient(ellipse 34% 28% at 72% 68%, ${rgba(theme.violet, 0.055 * k)}, transparent 72%)`,
            ].join(', '),
            filter: 'blur(32px)',
            opacity: 0.58,
            mixBlendMode: blend,
          }}
        />
        {particles ? (
          <CosmicParticleBackground
            seed={seed}
            palette={palette}
            interactive={interactive}
            scrollParallax={false}
            style={{ opacity: light ? 0.8 : 0.62, mixBlendMode: blend }}
          />
        ) : null}
      </div>

      <div ref={frontRef} style={layerBase}>
        {aurora ? (
          <AuroraBackground palette={palette} scrollParallax={false} vignette={false} />
        ) : null}
        {noise ? <NoiseTexture blendMode={light ? 'multiply' : 'overlay'} /> : null}
      </div>
    </div>
  );
}
