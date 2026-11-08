// Canvas & SVG backgrounds: React renderers plus their pure, deterministic sims.
export * from './AuroraBackground';
export * from './CosmicParticleBackground';
export * from './GalaxyParticleCanvas';
export * from './InfinityParticleCanvas';
export * from './InteractiveParticles';
export * from './MorphingSphere';
export * from './NoiseTexture';
export * from './ParticleBurst';
export * from './WeatherCanvas';

export * from './cosmic-field';
export * from './galaxy-field';
export * from './infinity-curve';
export * from './infinity-field';
export * from './interactive-particles';
export * from './morph-shapes';
export * from './particle-burst';
export * from './weather';

export type { Rgb as RgbTuple, ColorScheme, PaletteMode, ColorInput } from './color';
export { parseColor, toRgb, relativeLuminance, schemeForBackground, rgba, mixRgb } from './color';
export * from './random';
export * from './use-arsenal-theme';
export * from './use-canvas-loop';
export * from './use-reduced-motion';
