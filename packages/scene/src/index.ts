export type { ComponentName, Orbit, Point, Rect, SceneMap } from "./types.js";
export { COMPONENTS, beam, falls, orbits, rings, sphere, water, type ShaderComponent } from "./components/index.js";
export { buildFragment, VERTEX, type FragmentOptions } from "./fragment.js";
export { createSceneRenderer, type SceneFrame, type SceneRenderer } from "./renderer.js";
export { fitPlate, orbitLightAt, orbitPoint, platePercent, type StageFit } from "./fit.js";
export { HERO_PLATE } from "./presets/heroPlate.js";
