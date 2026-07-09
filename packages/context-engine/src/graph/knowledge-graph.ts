import type { KnowledgeGraph, GraphNode, GraphEdge } from "../schemas/knowledge-graph.schema.js";

export class KnowledgeGraphStore {
  constructor(private graph: KnowledgeGraph) {}

  getGraph(): KnowledgeGraph {
    return this.graph;
  }

  getNode(id: string): GraphNode | undefined {
    return this.graph.nodes.find((n) => n.id === id);
  }

  getEdgesFrom(nodeId: string): GraphEdge[] {
    return this.graph.edges.filter((e) => e.source === nodeId);
  }

  getEdgesTo(nodeId: string): GraphEdge[] {
    return this.graph.edges.filter((e) => e.target === nodeId);
  }

  getNodesByType(type: GraphNode["type"]): GraphNode[] {
    return this.graph.nodes.filter((n) => n.type === type);
  }
}
