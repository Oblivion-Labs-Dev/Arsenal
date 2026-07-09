import { aggregateDashboardData } from "../../dashboard/dashboard-data.js";
import { formatTokenCount } from "../../core/token-estimator.js";
import { arsenalPath } from "../../core/paths.js";
import { writeTextFile } from "../../core/file-io.js";

export function runReport(repoRoot: string) {
  const data = aggregateDashboardData(repoRoot);
  const top = data.suggestions[0];

  const lines = [
    "Arsenal Context Report",
    "",
    `Total estimated tokens saved: ${formatTokenCount(data.overview.totalTokensSaved)}`,
    `Average savings: ${data.overview.averageSavingsPercent}%`,
    `Context builds: ${data.overview.contextBuildsCount}`,
    `Quality score: ${data.quality.score}/100 (${data.quality.grade})`,
    `Stale summaries: ${data.overview.staleFilesCount}`,
    top ? `Top improvement: ${top.message}` : "Top improvement: none — context looks healthy",
    "",
  ];

  const text = lines.join("\n");
  const mdPath = arsenalPath(repoRoot, "analytics/savings-report.md");
  const md = [
    "# Arsenal Context Savings Report",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "## Summary",
    `- Total tokens saved: **${formatTokenCount(data.overview.totalTokensSaved)}**`,
    `- Average savings: **${data.overview.averageSavingsPercent}%**`,
    `- Context builds: **${data.overview.contextBuildsCount}**`,
    `- Quality score: **${data.quality.score}/100** (${data.quality.grade})`,
    `- Stale files: **${data.overview.staleFilesCount}**`,
    "",
    "## Top Suggestions",
    ...data.suggestions.slice(0, 7).map((s, i) => `${i + 1}. ${s.message}`),
    "",
    "## Recent Tasks",
    ...data.recentTasks.slice(0, 5).map(
      (t) => `- **${t.task}** — ${formatTokenCount(t.estimatedContextTokens)} tokens, saved ${formatTokenCount(t.estimatedTokensSaved)}`,
    ),
    "",
  ].join("\n");

  writeTextFile(mdPath, md);

  return { text, mdPath, data };
}
