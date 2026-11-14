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
  paintRibbons,
  paintDetails,
  type Point as EngravingPoint,
  type Scene as EngravingScene,
  type Beam,
  type Ribbon,
  type EngraveOptions,
  type EngravingInk,
} from './engraving';
/** Engraving hero canvas: prints in on load, the beam follows the pointer; pauses offscreen. */
export { EngravingHero, readEngravingInk, type EngravingHeroProps } from './EngravingHero';
