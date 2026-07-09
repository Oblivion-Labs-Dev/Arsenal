import type { ImportIndex } from "./import-indexer.js";

export interface DependencyEdge {
  from: string;
  to: string;
}

export interface DependencyGraph {
  version: string;
  generatedAt: string;
  edges: DependencyEdge[];
  dependents: Record<string, string[]>;
}

export function buildDependencyGraph(importIndex: ImportIndex): DependencyGraph {
  const edges: DependencyEdge[] = [];
  const dependents: Record<string, string[]> = {};

  for (const [from, targets] of Object.entries(importIndex.resolved)) {
    for (const to of targets) {
      edges.push({ from, to });
      if (!dependents[to]) dependents[to] = [];
      dependents[to].push(from);
    }
  }

  return {
    version: "1.0",
    generatedAt: new Date().toISOString(),
    edges,
    dependents,
  };
}
