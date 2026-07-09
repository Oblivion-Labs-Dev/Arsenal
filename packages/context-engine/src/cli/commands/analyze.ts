import { aggregateDashboardData } from "../../dashboard/dashboard-data.js";
import { AnalyticsStore, analyticsPath } from "../../analytics/analytics-store.js";
import { detectPatterns } from "../../analytics/pattern-detector.js";
import { runReport } from "./report.js";

export function runAnalyze(repoRoot: string) {
  const data = aggregateDashboardData(repoRoot);
  const store = new AnalyticsStore(repoRoot);
  const report = runReport(repoRoot);

  const patterns = detectPatterns(store.readContextBuilds(), store.readAgentEvents());

  return {
    data,
    reportPath: report.mdPath,
    dashboardPath: analyticsPath(repoRoot, "dashboard.json"),
    detailsPath: analyticsPath(repoRoot, "dashboard-details.json"),
    viewerPath: analyticsPath(repoRoot, "dashboard.html"),
    patterns,
    actions: [
      ...data.stale.recommendedCommands,
      "arsenal context report",
      data.suggestions[0]?.command,
    ].filter(Boolean) as string[],
  };
}
