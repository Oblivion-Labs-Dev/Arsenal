import type { ContextBuildRecord, ImprovementSuggestion } from "./analytics-types.js";
import type { AgentEvent } from "./analytics-types.js";
import type { StaleKnowledgeReport } from "./analytics-types.js";
import type { SavingsReport } from "./analytics-types.js";
import type { FileSummary } from "../schemas/file-summary.schema.js";
import type { ArsenalConfig } from "../schemas/arsenal-config.schema.js";

export function generateImprovements(input: {
  builds: ContextBuildRecord[];
  events: AgentEvent[];
  stale: StaleKnowledgeReport;
  savings: SavingsReport;
  fileSummaries: FileSummary[];
  config: ArsenalConfig;
}): ImprovementSuggestion[] {
  const suggestions: ImprovementSuggestion[] = [];
  let id = 1;

  const fileOpenRate = new Map<string, { count: number; modules: Set<string> }>();
  for (const build of input.builds) {
    for (const file of build.selectedFiles) {
      const entry = fileOpenRate.get(file) ?? { count: 0, modules: new Set<string>() };
      entry.count += 1;
      const mod = file.split("/").slice(0, 2).join("/");
      entry.modules.add(mod);
      fileOpenRate.set(file, entry);
    }
  }

  const totalBuilds = Math.max(1, input.builds.length);
  for (const [file, data] of fileOpenRate.entries()) {
    const rate = data.count / totalBuilds;
    if (rate >= 0.5 && totalBuilds >= 2) {
      suggestions.push({
        id: `s${id++}`,
        priority: Math.round(rate * 100),
        category: "summary",
        message: `${file} appears in ${Math.round(rate * 100)}% of recent tasks. Add a better summary.`,
        command: "arsenal context summarize",
      });
    }
  }

  for (const mod of input.stale.staleModules) {
    const count = input.stale.staleFiles.filter((f) => f.startsWith(mod)).length;
    if (count > 0) {
      suggestions.push({
        id: `s${id++}`,
        priority: 70 + count,
        category: "stale",
        message: `${mod} module has ${count} stale summaries. Run arsenal context summarize.`,
        command: "arsenal context summarize",
      });
    }
  }

  const editedWithoutTests = findEditedWithoutTests(input.events, input.fileSummaries);
  for (const file of editedWithoutTests.slice(0, 5)) {
    suggestions.push({
      id: `s${id++}`,
      priority: 65,
      category: "tests",
      message: `Files edited without related tests: ${file}. Add tests.`,
    });
  }

  const overBudget = input.builds.filter((b) => b.budgetUsedPercent > 80);
  if (overBudget.length > 0) {
    const pct = Math.round((overBudget.length / totalBuilds) * 100);
    suggestions.push({
      id: `s${id++}`,
      priority: 60 + pct,
      category: "budget",
      message: `${pct}% of context builds exceed 80% budget. Split tasks smaller.`,
    });
  }

  if (input.stale.outdatedDecisions) {
    suggestions.push({
      id: `s${id++}`,
      priority: 55,
      category: "memory",
      message: "decisions.md has not been updated in 30 days despite architecture edits.",
    });
  }

  const oversize = input.fileSummaries.filter(
    (s) => JSON.stringify(s).length / 4 > input.config.summaryPolicy.maxFileSummaryTokens,
  );
  if (oversize.length > 0) {
    suggestions.push({
      id: `s${id++}`,
      priority: 50,
      category: "summary",
      message: `${oversize.length} summaries are larger than the configured max token limit.`,
    });
  }

  for (const mod of input.savings.highestRiskModules.slice(0, 3)) {
    suggestions.push({
      id: `s${id++}`,
      priority: mod.score + 40,
      category: "risk",
      message: `${mod.module} module has elevated risk score (${mod.score}). Review and add tests.`,
    });
  }

  if (input.stale.missingSummaries.length > 0) {
    suggestions.push({
      id: `s${id++}`,
      priority: 80,
      category: "coverage",
      message: `${input.stale.missingSummaries.length} source files lack summaries.`,
      command: "arsenal context summarize",
    });
  }

  return suggestions.sort((a, b) => b.priority - a.priority);
}

function findEditedWithoutTests(events: AgentEvent[], summaries: FileSummary[]): string[] {
  const edited = events.filter((e) => e.eventType === "FILE_EDITED" && e.file).map((e) => e.file!);
  const unique = [...new Set(edited)];
  return unique.filter((file) => {
    const summary = summaries.find((s) => s.path === file);
    return !summary || summary.tests.length === 0;
  });
}
