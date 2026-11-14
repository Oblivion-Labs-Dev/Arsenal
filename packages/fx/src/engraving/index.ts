/** Procedural wood engraving (lighthouse over a storm): tone field cut into ribbons, beam aiming. */
export {
  createScene,
  fbm,
  rockTop,
  towerHalfWidth,
  lineDisplacement,
  toneAt,
  RESTING_BEAM,
  aimBeam,
  beamLight,
  beamCone,
  engrave,
  cutRibbons,
  clamp01,
  smooth,
  paintRibbons,
  paintDetails,
  type Point as EngravingPoint,
  type Scene as EngravingScene,
  type Beam,
  type Ribbon,
  type EngraveOptions,
  type EngravingInk,
  type ToneField,
} from './engraving';
/** Chapter scenes: one deterministic picture per site chapter, engraved as ribbons or traced as contours. */
export {
  CHAPTERS,
  chapterScene,
  contours,
  contourLevels,
  type Chapter,
  type Spot,
  type ChapterScene,
  type Segment,
} from './chapterScenes';
/** Engraving hero canvas: prints in on load, the beam follows the pointer; pauses offscreen. */
export { EngravingHero, readEngravingInk, type EngravingHeroProps } from './EngravingHero';
