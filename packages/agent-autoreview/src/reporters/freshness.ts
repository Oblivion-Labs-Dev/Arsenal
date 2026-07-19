import { existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { parsePorcelainPaths, tryGit, uniquePaths } from "../git/utils.js";

export interface ReportFreshness {
  stale: boolean;
  reason: string;
  reportPath: string;
  reportMtimeMs: number | null;
  newestSourceMtimeMs: number | null;
}

/**
 * A report is stale when any task-scoped source file was modified after the report.
 */
export function detectStaleReport(options: {
  cwd: string;
  reportDirectory?: string;
  scopedFiles: string[];
}): ReportFreshness {
  const reportPath = join(options.cwd, options.reportDirectory ?? ".autoreview/reports", "latest.json");
  if (!existsSync(reportPath)) {
    return {
      stale: true,
      reason: "No report found",
      reportPath,
      reportMtimeMs: null,
      newestSourceMtimeMs: null,
    };
  }
  const reportMtimeMs = statSync(reportPath).mtimeMs;
  let newestSourceMtimeMs: number | null = null;
  for (const file of options.scopedFiles) {
    const abs = join(options.cwd, file);
    if (!existsSync(abs)) continue;
    const m = statSync(abs).mtimeMs;
    if (newestSourceMtimeMs === null || m > newestSourceMtimeMs) newestSourceMtimeMs = m;
  }
  if (newestSourceMtimeMs !== null && newestSourceMtimeMs > reportMtimeMs + 500) {
    return {
      stale: true,
      reason: "Source files were modified after the latest report",
      reportPath,
      reportMtimeMs,
      newestSourceMtimeMs,
    };
  }
  return {
    stale: false,
    reason: "Report is fresh for scoped sources",
    reportPath,
    reportMtimeMs,
    newestSourceMtimeMs,
  };
}

export function currentDirtyFiles(cwd: string): string[] {
  return uniquePaths([
    ...parsePorcelainPaths(tryGit(cwd, ["status", "--porcelain", "-uall"]) ?? ""),
  ]);
}
