/** Lighthouse performance budget targets for generated sites */
export const LIGHTHOUSE_BUDGET = {
  performance: 90,
  accessibility: 95,
  bestPractices: 95,
  seo: 95,
  lcp: 2500,
  cls: 0.1,
  fid: 100,
} as const;

export function assertBudget(score: number, target: number, metric: string) {
  if (score < target) {
    throw new Error(`${metric} score ${score} below budget ${target}`);
  }
}

export {
  DEFAULT_QUALITY_GATES,
  evaluateQualityGates,
  type QualityGateSuite,
  type QualityGateThreshold,
  type QualityCheckResult,
} from "./quality-gates.js";
