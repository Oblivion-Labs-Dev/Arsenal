import type { QualityGatesConfig } from "../config/defaults.js";
import type { CheckResult, Finding } from "../types.js";

export interface GateEvaluation {
  passed: boolean;
  results: Record<string, boolean>;
  blocking: string[];
}

export function evaluateQualityGates(options: {
  gates: QualityGatesConfig;
  findings: Finding[];
  checks: CheckResult[];
}): GateEvaluation {
  const { gates, findings, checks } = options;
  const unresolved = findings.filter((f) => !f.resolved);
  const results: Record<string, boolean> = {};
  const blocking: string[] = [];

  const count = (pred: (f: Finding) => boolean) => unresolved.filter(pred).length;

  const relatedTests = checks.filter((c) => c.name.includes("related-tests"));
  results.relatedTestsPass =
    !gates.relatedTestsPass ||
    relatedTests.length === 0 ||
    relatedTests.every((c) => c.status === "pass" || c.status === "skip");
  if (!results.relatedTestsPass) blocking.push("relatedTestsPass");

  const typeErrors = count(
    (f) => f.category === "static" && /type/i.test(f.explanation) && f.severity !== "info",
  );
  results.typeErrorsInScope = typeErrors <= gates.typeErrorsInScope;
  if (!results.typeErrorsInScope) blocking.push("typeErrorsInScope");

  const lintErrors = count((f) => f.id.includes("lint") || /lint/i.test(f.explanation));
  results.lintErrorsInScope = lintErrors <= gates.lintErrorsInScope;
  if (!results.lintErrorsInScope) blocking.push("lintErrorsInScope");

  const runtimeErrors = count((f) => f.category === "runtime" && f.severity !== "info");
  results.runtimeErrorsInScope = runtimeErrors <= gates.runtimeErrorsInScope;
  if (!results.runtimeErrorsInScope) blocking.push("runtimeErrorsInScope");

  const failedRequests = count((f) => /failed request|requestfailed/i.test(f.explanation));
  results.relevantFailedRequests = failedRequests <= gates.relevantFailedRequests;
  if (!results.relevantFailedRequests) blocking.push("relevantFailedRequests");

  const overlaps = count((f) => f.id.includes("overlap") || /overlap/i.test(f.explanation));
  results.detectedCriticalOverlaps = overlaps <= gates.detectedCriticalOverlaps;
  if (!results.detectedCriticalOverlaps) blocking.push("detectedCriticalOverlaps");

  const overflow = count((f) => f.id.includes("overflow") || /horizontal.*overflow/i.test(f.explanation));
  results.horizontalOverflowInChangedSurface =
    overflow <= gates.horizontalOverflowInChangedSurface;
  if (!results.horizontalOverflowInChangedSurface) {
    blocking.push("horizontalOverflowInChangedSurface");
  }

  const a11y = count(
    (f) => f.category === "accessibility" && (f.severity === "critical" || f.severity === "high"),
  );
  results.accessibilityCriticalIssues = a11y <= gates.accessibilityCriticalIssues;
  if (!results.accessibilityCriticalIssues) blocking.push("accessibilityCriticalIssues");

  const unresolvedCritical = count((f) => f.severity === "critical");
  results.unresolvedCriticalFindings =
    unresolvedCritical <= gates.unresolvedCriticalFindings;
  if (!results.unresolvedCriticalFindings) blocking.push("unresolvedCriticalFindings");

  const highConfHighSev = count(
    (f) =>
      (f.severity === "critical" || f.severity === "high") &&
      f.confidence > 0.8 &&
      (f.category === "visual" || f.category === "interaction"),
  );
  results.unresolvedHighConfidenceHighSeverityFindings =
    highConfHighSev <= gates.unresolvedHighConfidenceHighSeverityFindings;
  if (!results.unresolvedHighConfidenceHighSeverityFindings) {
    blocking.push("unresolvedHighConfidenceHighSeverityFindings");
  }

  const brokenPrimary = count(
    (f) => f.category === "interaction" && f.severity === "critical",
  );
  results.primaryInteractionsPass = !gates.primaryInteractionsPass || brokenPrimary === 0;
  if (!results.primaryInteractionsPass) blocking.push("primaryInteractionsPass");

  return {
    passed: blocking.length === 0,
    results,
    blocking,
  };
}
