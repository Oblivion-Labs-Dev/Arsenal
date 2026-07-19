import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import type { MemoryIndex, MemoryRule, MemoryDecision, VisualBaseline } from "./types.js";

export const MEMORY_DIR = ".agent-memory";

const EMPTY_INDEX: MemoryIndex = {
  version: 1,
  rules: [],
  decisions: [],
  antiPatterns: [],
  preferences: {},
  updatedAt: new Date(0).toISOString(),
};

export function memoryRoot(cwd: string): string {
  return join(cwd, MEMORY_DIR);
}

export function ensureMemoryLayout(cwd: string): string {
  const root = memoryRoot(cwd);
  const dirs = [
    root,
    join(root, "decisions"),
    join(root, "components"),
    join(root, "routes"),
    join(root, "interactions"),
    join(root, "feedback"),
    join(root, "feedback", "processed"),
    join(root, "screenshot-manifests"),
    join(root, "visual-baselines"),
  ];
  for (const dir of dirs) mkdirSync(dir, { recursive: true });

  const files: Array<[string, string]> = [
    [
      "README.md",
      "# Agent memory\n\nRepository-specific design and validation memory. Do not store personal chat logs.\n",
    ],
    ["preferences.json", "{}\n"],
    [
      "design-principles.md",
      "# Design principles\n\nAdd confirmed repository-wide design principles here.\n",
    ],
    ["anti-patterns.md", "# Anti-patterns\n\nAvoid these recurring UI patterns.\n"],
    ["index.json", JSON.stringify(EMPTY_INDEX, null, 2) + "\n"],
  ];
  for (const [name, content] of files) {
    const path = join(root, name);
    if (!existsSync(path)) writeFileSync(path, content, "utf8");
  }
  return root;
}

export function loadIndex(cwd: string): MemoryIndex {
  ensureMemoryLayout(cwd);
  const path = join(memoryRoot(cwd), "index.json");
  try {
    return JSON.parse(readFileSync(path, "utf8")) as MemoryIndex;
  } catch {
    return { ...EMPTY_INDEX, updatedAt: new Date().toISOString() };
  }
}

export function saveIndex(cwd: string, index: MemoryIndex): void {
  ensureMemoryLayout(cwd);
  const next = { ...index, updatedAt: new Date().toISOString() };
  writeFileSync(join(memoryRoot(cwd), "index.json"), JSON.stringify(next, null, 2) + "\n", "utf8");
  syncMarkdownFromIndex(cwd, next);
}

function syncMarkdownFromIndex(cwd: string, index: MemoryIndex): void {
  const root = memoryRoot(cwd);
  const anti = ["# Anti-patterns", "", ...index.antiPatterns.map((p) => `- ${p}`), ""].join("\n");
  writeFileSync(join(root, "anti-patterns.md"), anti, "utf8");
  writeFileSync(join(root, "preferences.json"), JSON.stringify(index.preferences, null, 2) + "\n", "utf8");
}

export function upsertRule(cwd: string, rule: MemoryRule): MemoryIndex {
  const index = loadIndex(cwd);
  const existingIdx = index.rules.findIndex((r) => r.id === rule.id);
  if (existingIdx >= 0) index.rules[existingIdx] = rule;
  else index.rules.push(rule);
  saveIndex(cwd, index);
  return index;
}

export function addDecision(cwd: string, decision: MemoryDecision): MemoryIndex {
  const index = loadIndex(cwd);
  index.decisions.unshift(decision);
  saveIndex(cwd, index);
  writeFileSync(
    join(memoryRoot(cwd), "decisions", `${decision.id}.json`),
    JSON.stringify(decision, null, 2) + "\n",
    "utf8",
  );
  return index;
}

export function listBaselines(cwd: string): VisualBaseline[] {
  const dir = join(memoryRoot(cwd), "visual-baselines");
  ensureMemoryLayout(cwd);
  const manifest = join(dir, "manifest.json");
  if (!existsSync(manifest)) return [];
  try {
    return JSON.parse(readFileSync(manifest, "utf8")) as VisualBaseline[];
  } catch {
    return [];
  }
}

export function saveBaselines(cwd: string, baselines: VisualBaseline[]): void {
  ensureMemoryLayout(cwd);
  writeFileSync(
    join(memoryRoot(cwd), "visual-baselines", "manifest.json"),
    JSON.stringify(baselines, null, 2) + "\n",
    "utf8",
  );
}

export function listProcessedFeedbackIds(cwd: string): string[] {
  const dir = join(memoryRoot(cwd), "feedback", "processed");
  ensureMemoryLayout(cwd);
  return readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.replace(/\.json$/, ""));
}
