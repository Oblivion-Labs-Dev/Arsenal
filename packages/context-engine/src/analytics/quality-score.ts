import type { ContextBuildRecord } from "./analytics-types.js";
import type { AgentEvent } from "./analytics-types.js";
import type { StaleKnowledgeReport } from "./analytics-types.js";
import type { ArsenalConfig } from "../schemas/arsenal-config.schema.js";
import { gradeFromScore, type QualityScoreResult } from "./analytics-types.js";
import type { FileSummary } from "../schemas/file-summary.schema.js";

export function calculateQualityScore(input: {
  builds: ContextBuildRecord[];
  events: AgentEvent[];
  stale: StaleKnowledgeReport;
  fileSummaries: FileSummary[];
  config: ArsenalConfig;
  compactUpdatedRecently?: boolean;
}): QualityScoreResult {
  const reasons: string[] = [];
  const improvements: string[] = [];
  let score = 0;

  const latest = input.builds[input.builds.length - 1];
  const staleCount = input.stale.staleFiles.length + input.stale.missingSummaries.length;
  const freshRatio =
    input.fileSummaries.length > 0
      ? (input.fileSummaries.length - staleCount) / input.fileSummaries.length
      : 0;

  if (freshRatio >= 0.9) {
    score += 25;
    reasons.push("Summaries are mostly fresh");
  } else if (freshRatio >= 0.7) {
    score += 15;
    reasons.push("Most summaries are current");
    improvements.push("Run arsenal context summarize for stale files");
  } else {
    improvements.push("Many summaries are stale — run index + summarize");
  }

  if (latest && latest.selectedFiles.length >= 3) {
    score += 20;
    reasons.push("Relevant files selected for recent build");
  } else {
    improvements.push("Improve file relevance in context builds");
  }

  if (latest && latest.testsSuggested.length > 0) {
    score += 15;
    reasons.push("Tests mapped to context");
  } else {
    improvements.push("Add or map tests for changed modules");
  }

  if (latest && (latest.decisionsUsed.length > 0 || latest.pitfallsUsed.length > 0)) {
    score += 15;
    reasons.push("Decisions/pitfalls included in context");
  } else {
    improvements.push("Record decisions and pitfalls in .arsenal/memory/");
  }

  if (latest && latest.budgetUsedPercent <= 80) {
    score += 10;
    reasons.push("Context build under token budget");
  } else if (latest && latest.budgetUsedPercent > 80) {
    improvements.push("Context builds exceed 80% budget — split tasks smaller");
  }

  if (input.stale.brokenGraphEdges === 0) {
    score += 10;
    reasons.push("Knowledge graph has no broken edges");
  } else {
    improvements.push(`Fix ${input.stale.brokenGraphEdges} broken graph edges`);
  }

  if (input.compactUpdatedRecently) {
    score += 5;
    reasons.push("Compact handoff recently updated");
  } else {
    improvements.push("Update compact handoff after tasks");
  }

  const oversizeSummaries = input.fileSummaries.filter(
    (s) => JSON.stringify(s).length / 4 > input.config.summaryPolicy.maxFileSummaryTokens,
  );
  if (oversizeSummaries.length > 0) {
    improvements.push(`${oversizeSummaries.length} summaries exceed max token limit`);
  }

  return {
    score: Math.min(100, score),
    grade: gradeFromScore(Math.min(100, score)),
    reasons,
    improvements,
  };
}
