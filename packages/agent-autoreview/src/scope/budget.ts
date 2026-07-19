import type { ScopeBudget, ScopedItem, ScopeManifest } from "../types.js";

export interface RankedScope {
  changedFiles: string[];
  affectedRoutes: ScopedItem[];
  affectedComponents: ScopedItem[];
  excludedFiles: ScopedItem[];
  truncated: boolean;
}

function isHighRiskInteractionFile(path: string): boolean {
  return /(modal|dialog|form|drag|auth|checkout|payment|nav)/i.test(path);
}

function isVisualComponent(path: string): boolean {
  return /\.(tsx|jsx|vue|svelte|css|scss)$/.test(path);
}

/**
 * Rank and truncate scope to respect hard budgets. Never silently expands budget.
 */
export function applyScopeBudget(
  manifest: Pick<
    ScopeManifest,
    "changedFiles" | "affectedComponents" | "affectedRoutes" | "supportingFiles" | "excludedFiles"
  >,
  budget: ScopeBudget,
): RankedScope {
  const excluded = [...manifest.excludedFiles];
  let truncated = false;

  // Prioritize explicitly changed files
  const rankedChanged = [...manifest.changedFiles].sort((a, b) => {
    const score = (p: string) =>
      (isVisualComponent(p) ? 2 : 0) + (isHighRiskInteractionFile(p) ? 3 : 0);
    return score(b) - score(a);
  });

  let changedFiles = rankedChanged;
  if (changedFiles.length > budget.maxChangedSourceFiles) {
    truncated = true;
    const kept = changedFiles.slice(0, budget.maxChangedSourceFiles);
    for (const file of changedFiles.slice(budget.maxChangedSourceFiles)) {
      excluded.push({ path: file, reason: "Exceeded maxChangedSourceFiles budget" });
    }
    changedFiles = kept;
  }

  const rankedRoutes = [...manifest.affectedRoutes].sort((a, b) => {
    const score = (item: ScopedItem) => {
      let s = 0;
      if (item.reason.includes("Changed file is route")) s += 5;
      if (item.reason.includes("imports changed component")) s += 4;
      if (item.reason.includes("Configured route")) s += 3;
      if (item.reason.includes("Explicitly")) s += 6;
      return s;
    };
    return score(b) - score(a);
  });

  let affectedRoutes = rankedRoutes;
  if (affectedRoutes.length > budget.maxAffectedRoutes) {
    truncated = true;
    const kept = affectedRoutes.slice(0, budget.maxAffectedRoutes);
    for (const route of affectedRoutes.slice(budget.maxAffectedRoutes)) {
      excluded.push({
        path: route.path,
        reason: `Exceeded maxAffectedRoutes budget (${budget.maxAffectedRoutes})`,
      });
    }
    affectedRoutes = kept;
  }

  // Components: prefer those that render on kept routes / were directly changed
  const changedSet = new Set(changedFiles);
  const rankedComponents = [...manifest.affectedComponents].sort((a, b) => {
    const score = (item: ScopedItem) =>
      (changedSet.has(item.path) ? 5 : 0) +
      (isVisualComponent(item.path) ? 2 : 0) +
      (isHighRiskInteractionFile(item.path) ? 2 : 0);
    return score(b) - score(a);
  });

  return {
    changedFiles,
    affectedRoutes,
    affectedComponents: rankedComponents,
    excludedFiles: excluded,
    truncated,
  };
}

export function isRiskExpansionTrigger(file: string): boolean {
  const posix = file.replace(/\\/g, "/");
  return (
    /layout\.[jt]sx?$/.test(posix) ||
    /(global|globals)\.(css|scss)$/.test(posix) ||
    /(theme|tokens)\./.test(posix) ||
    /middleware\.[jt]sx?$/.test(posix) ||
    /(router|routes)\.[jt]sx?$/.test(posix) ||
    /auth/i.test(posix) ||
    /packages\/.*\/src\/index\.[jt]sx?$/.test(posix)
  );
}
