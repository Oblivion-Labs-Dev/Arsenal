import { existsSync, readFileSync, statSync } from "fs";
import { join } from "path";
import { arsenalPath } from "../../core/paths.js";
import { readJsonFile } from "../../core/file-io.js";
import type { KnowledgeGraph } from "../../schemas/knowledge-graph.schema.js";
import { estimateTokens, formatTokenCount } from "../../core/token-estimator.js";

export interface DoctorIssue {
  level: "error" | "warn" | "info";
  message: string;
}

export function runDoctor(repoRoot: string) {
  const issues: DoctorIssue[] = [];
  const base = arsenalPath(repoRoot);

  if (!existsSync(base)) {
    issues.push({ level: "error", message: "Missing `.arsenal/` — run `arsenal context init`" });
    return { ok: false, issues };
  }

  const required = [
    "config.json",
    "repo-map.json",
    "file-index.json",
    "symbol-index.json",
    "dependency-graph.json",
    "knowledge-graph.json",
    "memory/active-task.md",
    "rules/AGENTS.md",
    "rules/CLAUDE.md",
    "rules/testing-rules.md",
  ];

  for (const file of required) {
    if (!existsSync(join(base, file))) {
      issues.push({ level: "warn", message: `Missing ${file}` });
    }
  }

  const hashes = readJsonFile<Record<string, string>>(join(base, "cache/hashes.json"));
  const repoMap = readJsonFile<{ files: { path: string; hash: string }[] }>(join(base, "repo-map.json"));
  if (repoMap && hashes) {
    let stale = 0;
    for (const file of repoMap.files) {
      if (hashes[file.path] && hashes[file.path] !== file.hash) stale += 1;
    }
    if (stale > 0) {
      issues.push({ level: "warn", message: `${stale} files may have stale hashes — run index` });
    }
  }

  const graph = readJsonFile<KnowledgeGraph>(join(base, "knowledge-graph.json"));
  if (graph) {
    const nodeIds = new Set(graph.nodes.map((n) => n.id));
    let broken = 0;
    for (const edge of graph.edges) {
      if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) broken += 1;
    }
    if (broken > 0) {
      issues.push({ level: "warn", message: `${broken} graph edges reference missing nodes` });
    }
  }

  const summariesDir = join(base, "summaries/files");
  if (!existsSync(summariesDir) || !readDirCount(summariesDir)) {
    issues.push({ level: "warn", message: "Missing file summaries — run summarize" });
  }

  const repoMapFull = readJsonFile<{ files: { size: number }[] }>(join(base, "repo-map.json"));
  if (repoMapFull) {
    const totalChars = repoMapFull.files.reduce((sum, f) => sum + f.size, 0);
    const tokens = estimateTokens("x".repeat(totalChars));
    if (tokens > 100_000) {
      issues.push({
        level: "info",
        message: `Full repo ~${formatTokenCount(tokens)} tokens — use context build to stay within budget`,
      });
    }
  }

  const pkgPath = join(repoRoot, "package.json");
  if (existsSync(pkgPath)) {
    const pkg = JSON.parse(readFileSync(pkgPath, "utf-8")) as { scripts?: Record<string, string> };
    if (!pkg.scripts?.test) {
      issues.push({ level: "info", message: "No test script in package.json" });
    }
  }

  const ok = !issues.some((i) => i.level === "error");
  return { ok, issues };
}

function readDirCount(dir: string): number {
  try {
    return statSync(dir).isDirectory() ? 1 : 0;
  } catch {
    return 0;
  }
}
