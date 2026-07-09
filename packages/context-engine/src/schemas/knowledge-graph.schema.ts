import { z } from "zod";

export const GraphNodeTypeSchema = z.enum([
  "Repository",
  "Module",
  "File",
  "Class",
  "Function",
  "Component",
  "APIEndpoint",
  "Route",
  "Test",
  "Config",
  "Decision",
  "Pitfall",
  "Command",
  "ExternalDependency",
]);

export const GraphEdgeTypeSchema = z.enum([
  "CONTAINS",
  "IMPORTS",
  "CALLS",
  "EXPORTS",
  "TESTED_BY",
  "DEPENDS_ON",
  "CONFIGURES",
  "IMPLEMENTS",
  "DOCUMENTED_BY",
  "AFFECTS",
  "RELATED_TO",
]);

export const GraphNodeSchema = z.object({
  id: z.string(),
  type: GraphNodeTypeSchema,
  label: z.string(),
  path: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const GraphEdgeSchema = z.object({
  id: z.string(),
  type: GraphEdgeTypeSchema,
  source: z.string(),
  target: z.string(),
  metadata: z.record(z.unknown()).optional(),
});

export const KnowledgeGraphSchema = z.object({
  version: z.string().default("1.0"),
  generatedAt: z.string(),
  nodes: z.array(GraphNodeSchema),
  edges: z.array(GraphEdgeSchema),
});

export type GraphNodeType = z.infer<typeof GraphNodeTypeSchema>;
export type GraphEdgeType = z.infer<typeof GraphEdgeTypeSchema>;
export type GraphNode = z.infer<typeof GraphNodeSchema>;
export type GraphEdge = z.infer<typeof GraphEdgeSchema>;
export type KnowledgeGraph = z.infer<typeof KnowledgeGraphSchema>;
