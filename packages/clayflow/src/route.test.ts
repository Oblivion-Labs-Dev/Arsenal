import { describe, expect, it } from "vitest";
import { computeLayout } from "./layout.js";
import { routeEdges } from "./route.js";
import { aiAgentRequestExample } from "./examples.js";
import { diagramSchema, type Diagram, type DiagramSpec } from "./schema.js";

describe("ClayFlow connector routing", () => {
  it("routes edges with straight, curved, and orthogonal styles", () => {
    const testDiagram: Diagram = diagramSchema.parse({
      schemaVersion: "1.0",
      id: "test-styles",
      title: "Edge Styles",
      layout: "horizontal",
      nodes: [
        { id: "n1", kind: "process", label: "N1" },
        { id: "n2", kind: "process", label: "N2" },
        { id: "n3", kind: "process", label: "N3" },
      ],
      edges: [
        { id: "e-curved", from: "n1", to: "n2", style: "curved" },
        { id: "e-straight", from: "n2", to: "n3", style: "straight" },
        { id: "e-ortho", from: "n1", to: "n3", style: "orthogonal" },
      ],
    } satisfies DiagramSpec);

    const layout = computeLayout(testDiagram);
    const routed = routeEdges(testDiagram, layout);

    expect(routed.length).toBe(3);

    const curved = routed.find((e) => e.id === "e-curved");
    const straight = routed.find((e) => e.id === "e-straight");
    const ortho = routed.find((e) => e.id === "e-ortho");

    expect(curved?.path.includes("C")).toBe(true);
    expect(straight?.path.includes("L")).toBe(true);
    expect(ortho?.path.startsWith("M")).toBe(true);
  });

  it("applies symmetric offsets to parallel edges connecting the same pair", () => {
    const parallelDiagram: Diagram = diagramSchema.parse({
      schemaVersion: "1.0",
      id: "parallel-edges",
      title: "Parallel Edges",
      layout: "horizontal",
      nodes: [
        { id: "a", kind: "process", label: "Node A" },
        { id: "b", kind: "process", label: "Node B" },
      ],
      edges: [
        { id: "e1", from: "a", to: "b", style: "straight" },
        { id: "e2", from: "a", to: "b", style: "straight" },
      ],
    } satisfies DiagramSpec);

    const layout = computeLayout(parallelDiagram);
    const routed = routeEdges(parallelDiagram, layout);

    expect(routed.length).toBe(2);
    const [edge1, edge2] = routed;
    expect(edge1?.path).not.toBe(edge2?.path);
    // Both edges should have finite length
    expect(edge1?.length).toBeGreaterThan(0);
    expect(edge2?.length).toBeGreaterThan(0);
  });

  it("anchors routes purely to layout coordinates (re-routes on node movement)", () => {
    const layout1 = computeLayout(aiAgentRequestExample);
    const routes1 = routeEdges(aiAgentRequestExample, layout1);

    // Create a modified layout with moved node
    const layout2 = {
      ...layout1,
      nodes: layout1.nodes.map((n) =>
        n.id === "agent"
          ? {
              ...n,
              x: n.x + 100,
              ports: { ...n.ports, w: { x: n.ports.w.x + 100, y: n.ports.w.y } },
            }
          : n,
      ),
    };
    const routes2 = routeEdges(aiAgentRequestExample, layout2);

    const e1 = routes1.find((e) => e.to === "agent");
    const e2 = routes2.find((e) => e.to === "agent");

    expect(e1?.path).not.toBe(e2?.path);
  });

  it("properly flags bidirectional edges", () => {
    const bidiDiagram: Diagram = diagramSchema.parse({
      schemaVersion: "1.0",
      id: "bidi-test",
      title: "Bidirectional Test",
      layout: "horizontal",
      nodes: [
        { id: "a", kind: "process", label: "A" },
        { id: "b", kind: "process", label: "B" },
      ],
      edges: [{ id: "e-bidi", from: "a", to: "b", bidirectional: true }],
    } satisfies DiagramSpec);

    const layout = computeLayout(bidiDiagram);
    const [routed] = routeEdges(bidiDiagram, layout);
    expect(routed?.bidirectional).toBe(true);
  });
});
