export type AnimationPresetId =
  | "aurora"
  | "liquid"
  | "elastic"
  | "glass"
  | "orbit"
  | "magnetic"
  | "morph"
  | "cascade"
  | "wave"
  | "forge";

export interface AnimationPreset {
  id: AnimationPresetId;
  label: string;
  initial: Record<string, number | string>;
  animate: Record<string, number | string>;
  transition: {
    duration?: number;
    ease?: number[] | string;
    delay?: number;
    staggerChildren?: number;
  };
}

export const ANIMATION_PRESETS: Record<AnimationPresetId, AnimationPreset> = {
  aurora: {
    id: "aurora",
    label: "Aurora",
    initial: { opacity: 0, y: 24, filter: "blur(8px)" },
    animate: { opacity: 1, y: 0, filter: "blur(0px)" },
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] },
  },
  liquid: {
    id: "liquid",
    label: "Liquid",
    initial: { opacity: 0, scale: 0.92 },
    animate: { opacity: 1, scale: 1 },
    transition: { duration: 0.55, ease: [0.34, 1.56, 0.64, 1] },
  },
  elastic: {
    id: "elastic",
    label: "Elastic",
    initial: { opacity: 0, y: 40 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.65, ease: [0.68, -0.55, 0.27, 1.55] },
  },
  glass: {
    id: "glass",
    label: "Glass",
    initial: { opacity: 0, backdropFilter: "blur(0px)" },
    animate: { opacity: 1, backdropFilter: "blur(12px)" },
    transition: { duration: 0.5, ease: "easeOut" },
  },
  orbit: {
    id: "orbit",
    label: "Orbit",
    initial: { opacity: 0, rotate: -8, scale: 0.95 },
    animate: { opacity: 1, rotate: 0, scale: 1 },
    transition: { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] },
  },
  magnetic: {
    id: "magnetic",
    label: "Magnetic",
    initial: { opacity: 0, x: -12 },
    animate: { opacity: 1, x: 0 },
    transition: { duration: 0.35, ease: "easeOut" },
  },
  morph: {
    id: "morph",
    label: "Morph",
    initial: { opacity: 0, borderRadius: "50%" },
    animate: { opacity: 1, borderRadius: "1rem" },
    transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] },
  },
  cascade: {
    id: "cascade",
    label: "Cascade",
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.45, ease: "easeOut", staggerChildren: 0.08 },
  },
  wave: {
    id: "wave",
    label: "Wave",
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5, ease: [0.37, 0, 0.63, 1] },
  },
  forge: {
    id: "forge",
    label: "Forge",
    initial: { opacity: 0, scale: 0.88, filter: "brightness(1.4)" },
    animate: { opacity: 1, scale: 1, filter: "brightness(1)" },
    transition: { duration: 0.75, ease: [0.19, 1, 0.22, 1] },
  },
};

export function getAnimationPreset(id: AnimationPresetId): AnimationPreset {
  return ANIMATION_PRESETS[id];
}

export function listAnimationPresets(): AnimationPreset[] {
  return Object.values(ANIMATION_PRESETS);
}
