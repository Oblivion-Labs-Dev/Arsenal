import { ensureMemoryLayout, formatMemoryForPrompt, retrieveMemory } from "@arsenal/agent-memory";
import { loadConfig } from "../config/index.js";
import {
  finishTaskSession,
  isolateSessionChanges,
  sessionStatus,
  startTaskSession,
  taskContextSummary,
} from "../git/session.js";
import { runAutoreviewPipeline } from "../pipeline/run.js";
import { detectStaleReport } from "../reporters/freshness.js";
import { evaluateQualityGates } from "../quality-gates/index.js";
import { writeReports, renderMarkdown } from "../reporters/report.js";
import type { AutoreviewReport } from "../types.js";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export function renderFinalResponse(report: AutoreviewReport): string {
  const implemented = report.changedFiles.slice(0, 12).map((f) => `- ${f}`);
  const verified = report.checksExecuted
    .filter((c) => c.status === "pass")
    .slice(0, 10)
    .map((c) => `- ${c.name}`);
  const skipped = report.checksSkipped.slice(0, 10).map((s) => `- ${s}`);
  const remaining = report.remainingIssues.slice(0, 10).map((i) => `- [${i.severity}] ${i.explanation}`);

  return [
    "Implemented:",
    ...(implemented.length ? implemented : ["- (see report)"]),
    "",
    "Verified:",
    ...(verified.length ? verified : ["- (none)"]),
    "",
    "Skipped:",
    ...(skipped.length ? skipped : ["- (none)"]),
    "",
    "Remaining:",
    ...(remaining.length ? remaining : ["- (none)"]),
    "",
    "Report:",
    ".autoreview/reports/latest.md",
    "",
    "Final status:",
    report.qualityGatesPassed ? "Passed" : "Failed",
    "",
    report.disclaimer,
  ].join("\n");
}

export async function runAgentTask(cwd: string, task: string): Promise<{ code: number; context: string }> {
  const session = startTaskSession(cwd, task);
  ensureMemoryLayout(cwd);
  const memory = retrieveMemory(cwd, {
    taskText: task,
    maxRules: 10,
    maxAntiPatterns: 5,
    maxDecisions: 3,
    maxTokens: 4000,
  });
  const memoryBlock = formatMemoryForPrompt(memory);
  const context = [
    taskContextSummary(cwd),
    "",
    memoryBlock,
    "",
    `Pre-existing dirty files excluded from scope until re-hashed: ${session.existingModifiedFiles.length}`,
    "Required: implement → arsenal review --mode fast → arsenal agent finish",
    "Do not run thorough or cross-browser unless explicitly requested.",
  ].join("\n");
  return { code: 0, context };
}

export async function runAgentContext(cwd: string): Promise<{ code: number; context: string }> {
  return { code: 0, context: taskContextSummary(cwd) };
}

export async function runAgentFinish(cwd: string): Promise<{ code: number; output: string }> {
  const status = sessionStatus(cwd);
  if (!status.active || !status.session) {
    return { code: 1, output: "No active task session. Run arsenal agent task first." };
  }

  const scoped = isolateSessionChanges(cwd, status.session);
  const freshness = detectStaleReport({ cwd, scopedFiles: scoped });
  if (freshness.stale && scoped.length > 0) {
    // Auto-run fast review when report is missing/stale before finish
    const config = await loadConfig(cwd);
    await runAutoreviewPipeline({
      cwd,
      config,
      task: status.session.taskDescription,
      mode: "fast",
      dryRun: false,
    });
  }

  const reportPath = join(cwd, ".autoreview/reports/latest.json");
  if (!existsSync(reportPath)) {
    return { code: 1, output: "Validation report missing after finish attempt." };
  }

  const report = JSON.parse(readFileSync(reportPath, "utf8")) as AutoreviewReport;
  const postFreshness = detectStaleReport({ cwd, scopedFiles: scoped });
  if (postFreshness.stale) {
    report.qualityGatesPassed = false;
    report.qualityGateResults = {
      ...report.qualityGateResults,
      staleReport: false,
    };
    writeReports(cwd, ".autoreview/reports", report);
    return {
      code: 2,
      output: [
        "Stale report detected — source changed after validation.",
        renderFinalResponse(report),
      ].join("\n\n"),
    };
  }

  // Mark staleReport gate explicitly
  report.qualityGateResults = {
    ...report.qualityGateResults,
    staleReport: true,
  };

  const gates = evaluateQualityGates({
    gates: (await loadConfig(cwd)).qualityGates,
    findings: report.remainingIssues,
    checks: report.checksExecuted,
  });
  if (!gates.passed) report.qualityGatesPassed = false;

  finishTaskSession(cwd);
  const final = renderFinalResponse(report);
  writeReports(cwd, ".autoreview/reports", {
    ...report,
    disclaimer: report.disclaimer,
  });

  // Keep markdown aligned
  void renderMarkdown(report);

  return {
    code: report.qualityGatesPassed ? 0 : 2,
    output: final,
  };
}
