export type { ComponentName, Orbit, Point, Rect, SceneMap } from "./types.js";
export { COMPONENTS, beam, falls, orbits, rings, sphere, water, type ShaderComponent } from "./components/index.js";
export { buildFragment, VERTEX, type FragmentOptions } from "./fragment.js";
export { createSceneRenderer, type SceneFrame, type SceneRenderer } from "./renderer.js";
export { fitCrop, fitPlate, orbitLightAt, orbitPoint, platePercent, type StageFit } from "./fit.js";
export {
  HERO_PLATE,
  HERO_PLATE_PIECES,
  type HeroPlatePieceId,
  type PlatePiece,
} from "./presets/heroPlate.js";
export {
  DEFAULT_CAMERA,
  IDENTITY_POSE,
  cameraTarget,
  poseSettled,
  springStep,
  stageTransform,
  stepPose,
  type CameraInput,
  type CameraPose,
  type CameraTuning,
} from "./camera.js";
