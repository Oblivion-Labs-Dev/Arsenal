import { aggregateDashboardData } from "../../dashboard/dashboard-data.js";
import { analyticsPath } from "../../analytics/analytics-store.js";
import { startDashboardServer, DEFAULT_DASHBOARD_PORT } from "../../dashboard/dashboard-server.js";
import type { DashboardData } from "../../analytics/analytics-types.js";

export interface DashboardFileResult {
  jsonPath: string;
  detailsPath: string;
  viewerPath: string;
  data: DashboardData;
}

export function saveDashboardFiles(repoRoot: string): DashboardFileResult {
  const data = aggregateDashboardData(repoRoot);
  return {
    jsonPath: analyticsPath(repoRoot, "dashboard.json"),
    detailsPath: analyticsPath(repoRoot, "dashboard-details.json"),
    viewerPath: analyticsPath(repoRoot, "dashboard.html"),
    data,
  };
}

export async function startDashboardWithServer(
  repoRoot: string,
  port?: number,
): Promise<DashboardFileResult & { port: number; url: string }> {
  const files = saveDashboardFiles(repoRoot);
  const server = await startDashboardServer({ repoRoot, port: port ?? DEFAULT_DASHBOARD_PORT });
  return { ...files, ...server };
}
