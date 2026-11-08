import type { ArsenalThemeTokens, RgbTuple } from '@arsenal/fx';

/** `theme` follows the page's Arsenal tokens; the presets keep the portfolio's original looks. */
export type SceneColorTheme = 'theme' | 'indigo' | 'amber' | 'emerald';

export type ScenePalette = {
  /** Inner colour: the hot edge of the disk, the sphere's resting colour. */
  core: RgbTuple;
  /** Outer colour: the cool rim of the disk, the sphere's charged colour. */
  outer: RgbTuple;
  /** The singularity's ink. */
  void: RgbTuple;
  /** Additive glow on dark pages; normal blending on light pages so colours stay legible on paper. */
  additive: boolean;
};

const PRESETS: Record<Exclude<SceneColorTheme, 'theme'>, { dark: [RgbTuple, RgbTuple]; light: [RgbTuple, RgbTuple] }> = {
  indigo: { dark: [[6, 182, 212], [79, 70, 229]], light: [[8, 145, 178], [67, 56, 202]] },
  amber: { dark: [[245, 158, 11], [234, 88, 12]], light: [[180, 83, 9], [194, 65, 12]] },
  emerald: { dark: [[16, 185, 129], [5, 150, 105]], light: [[4, 120, 87], [6, 95, 70]] },
};

/** Resolves the scene colours for the current page tokens. Pure, so it is unit-tested. */
export function scenePalette(tokens: ArsenalThemeTokens, theme: SceneColorTheme = 'theme'): ScenePalette {
  const light = tokens.scheme === 'light';
  const [core, outer] =
    theme === 'theme' ? [tokens.cyan, tokens.violet] : PRESETS[theme][light ? 'light' : 'dark'];
  return {
    core,
    outer,
    void: light ? tokens.text : [0, 0, 0],
    additive: !light,
  };
}

/** 0–255 RGB to the 0–1 floats three.js colours use. */
export function rgbToUnit([r, g, b]: RgbTuple): [number, number, number] {
  return [r / 255, g / 255, b / 255];
}
