import { z } from "zod";
import { scoreText, tokenizeQuery } from "@arsenal/core";

export const GraphNodeTypeSchema = z.enum([
  "Repository", "Module", "File", "Class", "Function", "Component",
  "APIEndpoint", "Route", "Test", "Config", "Decision", "Pitfall",
  "Command", "ExternalDependency",
]);

export const GraphEdgeTypeSchema = z.enum([
  "CONTAINS", "IMPORTS", "CALLS", "EXPORTS", "TESTED_BY", "DEPENDS_ON",
  "CONFIGURES", "IMPLEMENTS", "DOCUMENTED_BY", "AFFECTS", "RELATED_TO",
]);

export const GraphNodeSchema = z.object({
  id: z.string(),
  type: GraphNodeTypeSchema,
  label: z.string(),
  path: z.string().optional(),
});

export const GraphEdgeSchema = z.object({
  id: z.string(),
  type: GraphEdgeTypeSchema,
  source: z.string(),
  target: z.string(),
});

export const KnowledgeGraphSchema = z.object({
  version: z.string(),
  generatedAt: z.string(),
  nodes: z.array(GraphNodeSchema),
  edges: z.array(GraphEdgeSchema),
});

export type KnowledgeGraph = z.infer<typeof KnowledgeGraphSchema>;
export type GraphNode = z.infer<typeof GraphNodeSchema>;
export type GraphEdge = z.infer<typeof GraphEdgeSchema>;

export type GraphQueryType =
  | "who-calls"
  | "where-is"
  | "what-breaks"
  | "tests-for"
  | "depends-on"
  | "co-change"
  | "general";

export function inferQueryType(query: string): GraphQueryType {
  const lower = query.toLowerCase();
  if (/who calls|callers?/.test(lower)) return "who-calls";
  if (/where is|locate|find/.test(lower)) return "where-is";
  if (/what breaks|impact|affected/.test(lower)) return "what-breaks";
  if (/test/.test(lower)) return "tests-for";
  if (/depend/.test(lower)) return "depends-on";
  if (/change together|co-change/.test(lower)) return "co-change";
  return "general";
}

export function queryGraph(graph: KnowledgeGraph, query: string): GraphNode[] {
  const terms = tokenizeQuery(query);
  return graph.nodes
    .map((n) => ({
      node: n,
      score: scoreText(`${n.label} ${n.path ?? ""} ${n.type}`, terms),
    }))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 25)
    .map((s) => s.node);
}

export function expandNeighbors(graph: KnowledgeGraph, nodeId: string, depth = 1): GraphNode[] {
  const visited = new Set<string>([nodeId]);
  let frontier = [nodeId];
  for (let d = 0; d < depth; d++) {
    const next: string[] = [];
    for (const id of frontier) {
      for (const edge of graph.edges) {
        const neighbor = edge.source === id ? edge.target : edge.target === id ? edge.source : null;
        if (neighbor && !visited.has(neighbor)) {
          visited.add(neighbor);
          next.push(neighbor);
        }
      }
    }
    frontier = next;
  }
  return graph.nodes.filter((n) => visited.has(n.id));
}
