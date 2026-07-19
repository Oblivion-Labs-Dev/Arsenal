import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Lightweight autoreview snapshot for dashboard consumption.
 * Reads local `.autoreview` artifacts without coupling context-engine to agent-autoreview.
 */
export interface AutoreviewDashboardPanel {
  activeSession: unknown | null;
  latestReport: unknown | null;
  scope: unknown | null;
  installation: unknown | null;
  memoryRuleCount: number;
  qualityGatesPassed: boolean | null;
  budgetUsage: unknown | null;
  staleWarning: string | null;
}

function readJson(path: string): unknown | null {
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}

export function loadAutoreviewDashboardPanel(repoRoot: string): AutoreviewDashboardPanel {
  const session =
    readJson(join(repoRoot, ".autoreview/sessions/current.json")) ??
    readJson(join(repoRoot, ".autoreview/current-task.json"));
  const latestReport = readJson(join(repoRoot, ".autoreview/reports/latest.json")) as {
    qualityGatesPassed?: boolean;
    budgetUsage?: unknown;
    generatedAt?: string;
  } | null;
  const scope = readJson(join(repoRoot, ".autoreview/current-scope.json"));
  const installation = readJson(join(repoRoot, ".autoreview/installation.json"));
  const memory = readJson(join(repoRoot, ".agent-memory/index.json")) as {
    rules?: unknown[];
  } | null;

  let staleWarning: string | null = null;
  if (session && latestReport?.generatedAt && typeof session === "object") {
    const finished = (session as { finishedAt?: string }).finishedAt;
    if (!finished && latestReport.generatedAt) {
      // Placeholder — detailed stale detection lives in agent-autoreview detectStaleReport
      staleWarning = null;
    }
  }

  return {
    activeSession: session,
    latestReport,
    scope,
    installation,
    memoryRuleCount: memory?.rules?.length ?? 0,
    qualityGatesPassed: latestReport?.qualityGatesPassed ?? null,
    budgetUsage: latestReport?.budgetUsage ?? null,
    staleWarning,
  };
}
