import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { AutoreviewConfig } from "../config/defaults.js";
import { resolveBudget } from "../config/defaults.js";
import {
  buildDependencyGraph,
  findReverseDependents,
  isSourceFile,
  isStoryFile,
  isTestFile,
} from "../dependency-graph/index.js";
import { detectChangedFiles } from "../git/index.js";
import { mapAffectedRoutes } from "../route-mapper/index.js";
import type { ReviewMode, ScopedItem, ScopeManifest } from "../types.js";
import { applyScopeBudget, isRiskExpansionTrigger } from "./budget.js";
import { matchIgnored } from "./ignore.js";

export interface BuildScopeOptions {
  cwd: string;
  config: AutoreviewConfig;
  mode: ReviewMode;
  taskDescription?: string;
  explicitFiles?: string[];
  forcedRoutes?: string[];
  baseBranch?: string;
}

function associateTests(changed: string[], graphFiles: Iterable<string>, cwd: string): ScopedItem[] {
  void cwd;
  const items: ScopedItem[] = [];
  const all = new Set([...changed, ...graphFiles]);
  for (const file of all) {
    if (isTestFile(file)) {
      items.push({ path: file, reason: "Test file in change or dependency graph" });
      continue;
    }
    const base = file.replace(/\.[^.]+$/, "");
    const candidates = [
      `${base}.test.ts`,
      `${base}.test.tsx`,
      `${base}.spec.ts`,
      `${base}.spec.tsx`,
      file.replace(/\/([^/]+)$/, "/__tests__/$1"),
    ];
    for (const candidate of candidates) {
      if (all.has(candidate) || changed.includes(candidate)) {
        items.push({ path: candidate, reason: `Associated test for ${file}` });
      }
    }
  }
  // Also surface test files that reference changed basenames via co-location naming
  for (const file of all) {
    if (!isTestFile(file)) continue;
    if (items.some((i) => i.path === file)) continue;
    items.push({ path: file, reason: "Related test discovered in impact graph" });
  }
  return dedupeItems(items);
}

function associateStories(files: Iterable<string>): ScopedItem[] {
  const items: ScopedItem[] = [];
  for (const file of files) {
    if (isStoryFile(file)) {
      items.push({ path: file, reason: "Story/example associated with changed components" });
    }
  }
  return items;
}

function dedupeItems(items: ScopedItem[]): ScopedItem[] {
  const map = new Map<string, ScopedItem>();
  for (const item of items) {
    if (!map.has(item.path)) map.set(item.path, item);
  }
  return [...map.values()];
}

export function buildScopeManifest(options: BuildScopeOptions): ScopeManifest {
  const {
    cwd,
    config,
    mode,
    taskDescription,
    explicitFiles,
    forcedRoutes = [],
    baseBranch,
  } = options;
  const budget = resolveBudget(config, mode);

  const detected = detectChangedFiles({
    cwd,
    baseBranch: baseBranch ?? config.baseBranch,
    explicitFiles,
  });

  const excludedFiles: ScopedItem[] = [];
  const changedFiles = detected.files.filter((file) => {
    if (matchIgnored(file, config.scope.ignoredFiles)) {
      excludedFiles.push({ path: file, reason: "Matched ignoredFiles pattern" });
      return false;
    }
    return true;
  });

  const sourceChanged = changedFiles.filter(isSourceFile);
  const forward = buildDependencyGraph(
    sourceChanged,
    cwd,
    config,
    budget.maxDependencyDepth,
  );
  const reverse = findReverseDependents(
    sourceChanged,
    cwd,
    config,
    budget.maxReverseDependencyDepth,
  );

  const affectedComponents: ScopedItem[] = [];
  for (const file of sourceChanged) {
    if (/\.(tsx|jsx|vue|svelte)$/.test(file) || /components?\//.test(file)) {
      affectedComponents.push({ path: file, reason: "Directly changed by current task" });
    }
  }
  for (const [from, imports] of forward.forward) {
    for (const imported of imports) {
      if (/\.(tsx|jsx|vue|svelte)$/.test(imported)) {
        affectedComponents.push({
          path: imported,
          reason: `Directly imported by changed file ${from}`,
        });
      }
    }
  }
  for (const [seed, dependents] of reverse) {
    for (const dep of dependents) {
      affectedComponents.push({
        path: dep,
        reason: `Directly imports changed component ${seed}`,
      });
    }
  }

  const supportingFiles: ScopedItem[] = [];
  for (const file of changedFiles) {
    if (/\.(css|scss|sass|less)$/.test(file) || /tokens|theme|assets|hooks/.test(file)) {
      supportingFiles.push({ path: file, reason: "Styles, tokens, assets, or hooks changed by task" });
    }
    if (/api\/|handlers?\/|route\.[jt]s$/.test(file)) {
      supportingFiles.push({
        path: file,
        reason: "API handler likely called by changed interactions",
      });
    }
  }

  let affectedRoutes = mapAffectedRoutes(
    affectedComponents.map((c) => c.path),
    cwd,
    config,
    forcedRoutes,
  );

  const expandedItems: ScopedItem[] = [];
  if (config.scope.riskExpansionEnabled) {
    const triggers = changedFiles.filter(isRiskExpansionTrigger);
    for (const trigger of triggers) {
      // Representative expansion only — add configured mappings, never full crawl
      const extras = Object.keys(config.routeMappings).slice(0, 2);
      for (const route of extras) {
        if (affectedRoutes.some((r) => r.path === route)) continue;
        if (config.scope.ignoredRoutes.includes(route)) continue;
        const item = {
          path: route,
          reason: `Risk-based expansion: ${trigger} indicates broader impact`,
        };
        affectedRoutes.push(item);
        expandedItems.push(item);
      }
      if (extras.length === 0 && affectedRoutes.length === 0) {
        const item = {
          path: "/",
          reason: `Risk-based expansion: ${trigger} may affect root layout; representative route only`,
        };
        affectedRoutes.push(item);
        expandedItems.push(item);
      }
    }
  }

  const affectedTests = associateTests(changedFiles, forward.files, cwd);
  const stories = associateStories(forward.files);
  for (const story of stories) supportingFiles.push(story);

  const affectedInteractions: ScopedItem[] = changedFiles
    .filter((f) => /(onClick|onSubmit|dialog|modal|drag|animation|transition)/i.test(f) || /\.(tsx|jsx)$/.test(f))
    .slice(0, 10)
    .map((path) => ({
      path,
      reason: "Potential interaction surface from changed UI file",
    }));

  const ranked = applyScopeBudget(
    {
      changedFiles,
      affectedComponents: dedupeItems(affectedComponents),
      affectedRoutes,
      supportingFiles: dedupeItems(supportingFiles),
      excludedFiles,
    },
    budget,
  );

  const scopeReasoning: Record<string, string> = {
    changeSource: detected.reasoning,
    task: taskDescription ?? "(no task description)",
    truncated: ranked.truncated ? "Scope truncated to respect budget" : "Within budget",
  };
  for (const item of ranked.affectedComponents) scopeReasoning[`component:${item.path}`] = item.reason;
  for (const item of ranked.affectedRoutes) scopeReasoning[`route:${item.path}`] = item.reason;

  return {
    changedFiles: ranked.changedFiles,
    affectedComponents: ranked.affectedComponents,
    affectedRoutes: ranked.affectedRoutes,
    affectedTests,
    affectedInteractions,
    supportingFiles: dedupeItems(supportingFiles),
    excludedFiles: ranked.excludedFiles,
    expandedItems,
    scopeReasoning,
    generatedAt: new Date().toISOString(),
    mode,
    source: detected.source,
  };
}

export function writeScopeManifest(cwd: string, manifest: ScopeManifest): string {
  const dir = join(cwd, ".autoreview");
  mkdirSync(dir, { recursive: true });
  const path = join(dir, "current-scope.json");
  writeFileSync(path, JSON.stringify(manifest, null, 2), "utf8");
  return path;
}
