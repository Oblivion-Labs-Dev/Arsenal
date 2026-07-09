import type { KnowledgeGraph } from "../schemas/knowledge-graph.schema.js";
import { tokenizeQuery, scoreText } from "../core/paths.js";

export interface GraphQueryResult {
  nodeIds: string[];
  filePaths: string[];
  symbolNames: string[];
  score: number;
}

export function queryKnowledgeGraph(graph: KnowledgeGraph, query: string): GraphQueryResult {
  const terms = tokenizeQuery(query);
  const scored: { id: string; score: number; path?: string; label: string; type: string }[] = [];

  for (const n of graph.nodes) {
    const text = [n.label, n.path ?? "", n.type].join(" ");
    const score = scoreText(text, terms);
    if (score > 0) {
      scored.push({ id: n.id, score, path: n.path, label: n.label, type: n.type });
    }
  }

  scored.sort((a, b) => b.score - a.score);

  const nodeIds = scored.slice(0, 30).map((s) => s.id);
  const filePaths = [
    ...new Set(scored.filter((s) => s.type === "File" && s.path).map((s) => s.path!)),
  ].slice(0, 20);
  const symbolNames = [
    ...new Set(
      scored
        .filter((s) => ["Class", "Function", "Component"].includes(s.type))
        .map((s) => s.label),
    ),
  ].slice(0, 20);

  return {
    nodeIds,
    filePaths,
    symbolNames,
    score: scored[0]?.score ?? 0,
  };
}

export function expandGraphNeighbors(
  graph: KnowledgeGraph,
  startNodeIds: string[],
  depth = 1,
): string[] {
  const visited = new Set<string>(startNodeIds);
  let frontier = [...startNodeIds];

  for (let d = 0; d < depth; d++) {
    const next: string[] = [];
    for (const id of frontier) {
      for (const edge of graph.edges) {
        if (edge.source === id && !visited.has(edge.target)) {
          visited.add(edge.target);
          next.push(edge.target);
        }
        if (edge.target === id && !visited.has(edge.source)) {
          visited.add(edge.source);
          next.push(edge.source);
        }
      }
    }
    frontier = next;
  }

  return [...visited];
}
