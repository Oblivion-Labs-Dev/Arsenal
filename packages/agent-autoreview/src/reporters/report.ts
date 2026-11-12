import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { redactText, redactValue } from "@oblivion-labs-dev/arsenal-shared/redact";
import type { AutoreviewReport } from "../types.js";

/**
 * Redacts credentials from report text.
 * @deprecated Use `redactText` from `@oblivion-labs-dev/arsenal-shared/redact`; kept as an alias.
 */
export function redactSecrets(text: string): string {
  return redactText(text);
}

export function writeReports(cwd: string, reportDir: string, report: AutoreviewReport): {
  markdownPath: string;
  jsonPath: string;
} {
  const dir = join(cwd, reportDir);
  mkdirSync(dir, { recursive: true });
  const jsonPath = join(dir, "latest.json");
  const markdownPath = join(dir, "latest.md");
  // Redact the structure first (sensitive keys, nested strings), then the rendered text, so a
  // secret split across fields or introduced by rendering is still caught.
  const safe = redactValue(report);
  writeFileSync(jsonPath, redactText(JSON.stringify(safe, null, 2)), "utf8");
  writeFileSync(markdownPath, redactText(renderMarkdown(safe)), "utf8");
  return { markdownPath, jsonPath };
}

export function renderMarkdown(report: AutoreviewReport): string {
  const lines: string[] = [];
  lines.push("# Autoreview Report");
  lines.push("");
  lines.push(report.disclaimer);
  lines.push("");
  lines.push(`- **Generated:** ${report.generatedAt}`);
  lines.push(`- **Mode:** ${report.mode}`);
  lines.push(`- **Task:** ${report.taskDescription || "(none)"}`);
  lines.push(
    `- **Quality gates:** ${report.qualityGatesPassed ? "PASSED" : "FAILED"}`,
  );
  lines.push("");

  lines.push("## Changed files");
  for (const file of report.changedFiles) lines.push(`- \`${file}\``);
  if (report.changedFiles.length === 0) lines.push("- (none)");
  lines.push("");

  lines.push("## Affected components");
  for (const item of report.affectedComponents) {
    lines.push(`- \`${item.path}\` — ${item.reason}`);
  }
  if (report.affectedComponents.length === 0) lines.push("- (none)");
  lines.push("");

  lines.push("## Affected routes");
  for (const item of report.affectedRoutes) {
    lines.push(`- \`${item.path}\` — ${item.reason}`);
  }
  if (report.affectedRoutes.length === 0) lines.push("- (none)");
  lines.push("");

  lines.push("## Scope exclusions");
  for (const item of report.scopeExclusions) {
    lines.push(`- \`${item.path}\` — ${item.reason}`);
  }
  if (report.scopeExclusions.length === 0) lines.push("- (none)");
  lines.push("");

  lines.push("## Checks executed");
  for (const check of report.checksExecuted) {
    lines.push(
      `- **${check.name}**: ${check.status} (${check.durationMs}ms)${check.details ? ` — ${check.details.slice(0, 200)}` : ""}`,
    );
  }
  lines.push("");

  lines.push("## Checks skipped");
  for (const skip of report.checksSkipped) lines.push(`- ${skip}`);
  if (report.checksSkipped.length === 0) lines.push("- (none)");
  lines.push("");

  lines.push("## Screenshots");
  for (const shot of report.screenshotsCaptured) lines.push(`- \`${shot}\``);
  if (report.screenshotsCaptured.length === 0) lines.push("- (none)");
  lines.push("");

  lines.push("## Interactions tested");
  for (const interaction of report.interactionsTested) {
    lines.push(
      `- ${interaction.interaction} on \`${interaction.route}\` via \`${interaction.trigger}\``,
    );
  }
  if (report.interactionsTested.length === 0) lines.push("- (none)");
  lines.push("");

  lines.push("## Issues found");
  for (const issue of report.issuesFound) {
    lines.push(
      `- [${issue.severity}/${issue.confidence}] ${issue.explanation} → ${issue.recommendedFix}`,
    );
  }
  if (report.issuesFound.length === 0) lines.push("- (none)");
  lines.push("");

  lines.push("## Fixes applied");
  for (const fix of report.fixesApplied) lines.push(`- ${fix}`);
  if (report.fixesApplied.length === 0) lines.push("- (none — report/repair agent applies fixes)");
  lines.push("");

  lines.push("## Remaining issues");
  for (const issue of report.remainingIssues) {
    lines.push(`- [${issue.severity}] ${issue.explanation}`);
  }
  if (report.remainingIssues.length === 0) lines.push("- (none)");
  lines.push("");

  lines.push("## Budget usage");
  lines.push("```json");
  lines.push(JSON.stringify(report.budgetUsage, null, 2));
  lines.push("```");
  lines.push("");
  lines.push(`- Model calls: ${report.modelCallsUsed}`);
  lines.push(`- Estimated tokens: ${report.estimatedTokensConsumed}`);
  lines.push(`- Cache hits: ${report.cacheHits}`);
  lines.push("");
  lines.push("## Quality gate results");
  for (const [gate, ok] of Object.entries(report.qualityGateResults)) {
    lines.push(`- ${ok ? "✓" : "✗"} ${gate}`);
  }
  lines.push("");
  return lines.join("\n");
}
