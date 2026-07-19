import type { Finding, RepairPlan, RepairStep } from "../types.js";

const SEVERITY_RANK: Record<string, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
  info: 0,
};

export function rankFindings(findings: Finding[]): Finding[] {
  return [...findings].sort((a, b) => {
    const sev = (SEVERITY_RANK[b.severity] ?? 0) - (SEVERITY_RANK[a.severity] ?? 0);
    if (sev !== 0) return sev;
    return b.confidence - a.confidence;
  });
}

export function buildRepairPlan(findings: Finding[]): RepairPlan {
  const ranked = rankFindings(findings.filter((f) => !f.resolved));
  const steps: RepairStep[] = ranked.map((finding) => ({
    findingId: finding.id,
    file: finding.file,
    action: finding.recommendedFix,
    invalidates: invalidateFor(finding),
  }));
  return { findings: ranked, steps };
}

function invalidateFor(
  finding: Finding,
): Array<"static" | "tests" | "runtime" | "screenshots" | "critics"> {
  switch (finding.category) {
    case "visual":
    case "animation":
      return ["screenshots", "critics"];
    case "static":
      return ["static", "tests"];
    case "runtime":
    case "interaction":
      return ["runtime", "tests", "screenshots"];
    case "accessibility":
      return ["runtime", "screenshots", "critics"];
    default:
      return ["static", "tests"];
  }
}

export type VerificationStage =
  | "static"
  | "tests"
  | "runtime"
  | "screenshots"
  | "critics";

/**
 * After each repair, calculate which verification artifacts are stale.
 */
export function computeStaleStages(steps: RepairStep[]): Set<VerificationStage> {
  const stale = new Set<VerificationStage>();
  for (const step of steps) {
    for (const stage of step.invalidates) stale.add(stage);
  }
  return stale;
}

export function shouldTerminateRepairLoop(options: {
  gatesPassed: boolean;
  iteration: number;
  maxIterations: number;
}): boolean {
  return options.gatesPassed || options.iteration >= options.maxIterations;
}
