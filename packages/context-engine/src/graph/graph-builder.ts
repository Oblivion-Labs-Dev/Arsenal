import type { KnowledgeGraph, GraphNode, GraphEdge } from "../schemas/knowledge-graph.schema.js";
import type { RepoMap } from "../schemas/repo-map.schema.js";
import type { SymbolIndex } from "../indexers/symbol-indexer.js";
import type { DependencyGraph } from "../indexers/dependency-indexer.js";
import type { TestIndex } from "../indexers/test-indexer.js";
import type { RouteIndex } from "../indexers/route-indexer.js";
import type { ApiIndex } from "../indexers/api-indexer.js";
import type { ImportIndex } from "../indexers/import-indexer.js";

let edgeCounter = 0;

function edge(type: GraphEdge["type"], source: string, target: string): GraphEdge {
  edgeCounter += 1;
  return { id: `e${edgeCounter}`, type, source, target };
}

function node(id: string, type: GraphNode["type"], label: string, path?: string): GraphNode {
  return { id, type, label, path };
}

export interface GraphBuildInput {
  repoRoot: string;
  repoMap: RepoMap;
  symbolIndex: SymbolIndex;
  dependencyGraph: DependencyGraph;
  testIndex: TestIndex;
  routeIndex: RouteIndex;
  apiIndex: ApiIndex;
  importIndex: ImportIndex;
}

export function buildKnowledgeGraph(input: GraphBuildInput): KnowledgeGraph {
  edgeCounter = 0;
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  const repoId = "repo:root";
  nodes.push(node(repoId, "Repository", input.repoMap.root));

  const moduleIds = new Map<string, string>();
  for (const mod of input.repoMap.modules) {
    const id = `module:${mod}`;
    moduleIds.set(mod, id);
    nodes.push(node(id, "Module", mod));
    edges.push(edge("CONTAINS", repoId, id));
  }

  for (const file of input.repoMap.files) {
    const fileId = `file:${file.path}`;
    nodes.push(node(fileId, "File", file.path, file.path));
    if (file.module && moduleIds.has(file.module)) {
      edges.push(edge("CONTAINS", moduleIds.get(file.module)!, fileId));
    } else {
      edges.push(edge("CONTAINS", repoId, fileId));
    }
  }

  for (const sym of input.symbolIndex.symbols) {
    const symId = `symbol:${sym.file}:${sym.name}`;
    const nodeType =
      sym.kind === "class"
        ? "Class"
        : sym.kind === "component"
          ? "Component"
          : "Function";
    nodes.push(node(symId, nodeType, sym.name, sym.file));
    edges.push(edge("EXPORTS", `file:${sym.file}`, symId));
  }

  for (const { from, to } of input.dependencyGraph.edges) {
    edges.push(edge("IMPORTS", `file:${from}`, `file:${to}`));
    edges.push(edge("DEPENDS_ON", `file:${from}`, `file:${to}`));
  }

  for (const test of input.testIndex.tests) {
    const testId = `test:${test.testFile}`;
    if (!nodes.find((n) => n.id === testId)) {
      nodes.push(node(testId, "Test", test.testFile, test.testFile));
    }
    edges.push(edge("TESTED_BY", `file:${test.targetFile}`, testId));
  }

  for (const route of input.routeIndex.routes) {
    const routeId = `route:${route.path}`;
    nodes.push(node(routeId, "Route", route.path, route.file));
    edges.push(edge("IMPLEMENTS", `file:${route.file}`, routeId));
  }

  for (const api of input.apiIndex.endpoints) {
    const apiId = `api:${api.method}:${api.path}`;
    nodes.push(node(apiId, "APIEndpoint", `${api.method} ${api.path}`, api.file));
    edges.push(edge("IMPLEMENTS", `file:${api.file}`, apiId));
  }

  for (const [filePath, imports] of Object.entries(input.importIndex.imports)) {
    for (const imp of imports) {
      if (!imp.startsWith(".") && !imp.startsWith("@/")) {
        const extId = `ext:${imp}`;
        if (!nodes.find((n) => n.id === extId)) {
          nodes.push(node(extId, "ExternalDependency", imp));
        }
        edges.push(edge("DEPENDS_ON", `file:${filePath}`, extId));
      }
    }
  }

  for (const file of input.repoMap.files.filter((f) => f.kind === "config")) {
    const configId = `config:${file.path}`;
    nodes.push(node(configId, "Config", file.path, file.path));
    edges.push(edge("CONFIGURES", configId, repoId));
  }

  return {
    version: "1.0",
    generatedAt: new Date().toISOString(),
    nodes,
    edges,
  };
}
