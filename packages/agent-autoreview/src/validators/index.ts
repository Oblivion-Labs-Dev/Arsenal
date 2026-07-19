export {
  runStaticValidation,
  selectRelatedTests,
  requiresFullRepositoryChecks,
} from "./static.js";
export {
  runDeterministicVisualChecks,
  DETERMINISTIC_SNAPSHOT_SCRIPT,
  type DeterministicVisualSnapshot,
} from "./visual-deterministic.js";
export {
  hasAnimationChanges,
  reviewAnimationSample,
  type AnimationSample,
} from "./animation.js";
export {
  detectDecorativeLineCollisions,
  sampleSvgPath,
  type DecorativeScene,
  type DecorativeLineFinding,
} from "./decorative-lines.js";
export {
  runExtendedVisualChecks,
  type ExtendedVisualOptions,
} from "./extended-visual.js";
