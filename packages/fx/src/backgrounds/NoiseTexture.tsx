import type { CSSProperties } from 'react';

export type NoiseTextureProps = {
  /** 0–1. Grain is subtle by default. */
  opacity?: number;
  /** feTurbulence base frequency; higher is finer grain. */
  frequency?: number;
  /** Tile size in px. */
  tileSize?: number;
  /** `overlay` keeps the grain neutral on both light and dark pages. */
  blendMode?: CSSProperties['mixBlendMode'];
  className?: string;
  style?: CSSProperties;
};

/** Builds the tiled SVG fractal-noise data URL. Exported for tests and reuse. */
export function noiseDataUrl(frequency = 0.78, octaves = 4): string {
  const svg =
    `<svg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'>` +
    `<filter id='n'><feTurbulence type='fractalNoise' baseFrequency='${frequency}' numOctaves='${octaves}' stitchTiles='stitch'/></filter>` +
    `<rect width='100%' height='100%' filter='url(#n)'/></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

/** A film-grain overlay that takes the edge off flat gradients. Static, no JS work. */
export function NoiseTexture({
  opacity = 0.045,
  frequency = 0.78,
  tileSize = 180,
  blendMode = 'overlay',
  className,
  style,
}: NoiseTextureProps) {
  return (
    <div
      aria-hidden
      className={className}
      style={{
        position: 'absolute',
        inset: 0,
        opacity,
        mixBlendMode: blendMode,
        pointerEvents: 'none',
        backgroundImage: noiseDataUrl(frequency),
        backgroundRepeat: 'repeat',
        backgroundSize: `${tileSize}px ${tileSize}px`,
        ...style,
      }}
    />
  );
}
