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

  it("offsets parallel-kind wires symmetrically by six pixels", () => {
    const diagram = diagramSchema.parse({
      schemaVersion: "1.0", id: "parallel-offset", title: "Parallel",
      layout: "horizontal",
      nodes: [{ id: "a", kind: "process", label: "A" }, { id: "b", kind: "process", label: "B" }],
      edges: [
        { id: "p1", from: "a", to: "b", kind: "parallel", style: "straight" },
        { id: "p2", from: "a", to: "b", kind: "parallel", style: "straight" },
        { id: "p3", from: "a", to: "b", kind: "parallel", style: "straight" },
      ],
    } satisfies DiagramSpec);
    const routes = routeEdges(diagram, computeLayout(diagram));
    const start = (path: string) => path.match(/^M ([\d-]+) ([\d-]+)/)?.slice(1).map(Number);
    const offsets = routes.map((edge) => start(edge.path)![1]!).sort((a, b) => a - b);
    expect(new Set(routes.map((edge) => edge.path)).size).toBe(3);
    expect(offsets[2]! - offsets[0]!).toBe(12);
    expect(offsets[1]! - offsets[0]!).toBe(6);
  });

  it("routes feedback arcs outside the node boxes", () => {
    const diagram = diagramSchema.parse({
      schemaVersion: "1.0", id: "feedback-arc", title: "Feedback",
      layout: "horizontal",
      nodes: [{ id: "a", kind: "process", label: "A" }, { id: "b", kind: "process", label: "B" }],
      edges: [{ id: "back", from: "b", to: "a", kind: "feedback" }],
    } satisfies DiagramSpec);
    const layout = computeLayout(diagram);
    const [edge] = routeEdges(diagram, layout);
    const controls = edge?.path.match(/C [-\d.]+ ([-\d.]+), [-\d.]+ ([-\d.]+)/);
    const lowerBound = Math.max(...layout.nodes.map((node) => node.y + node.h));
    expect(edge?.path).toContain("C");
    expect(Number(controls?.[1])).toBeGreaterThan(lowerBound);
    expect(Number(controls?.[2])).toBeGreaterThan(lowerBound);
  });

  it("fans branch edges out from the same source port", () => {
    const diagram = diagramSchema.parse({
      schemaVersion: "1.0", id: "branch-fan", title: "Branch",
      layout: "horizontal",
      nodes: [
        { id: "decision", kind: "decision", label: "Decision" },
        { id: "yes", kind: "process", label: "Yes" },
        { id: "no", kind: "process", label: "No" },
      ],
      edges: [
        { id: "yes-edge", from: "decision", to: "yes", kind: "branch", style: "curved" },
        { id: "no-edge", from: "decision", to: "no", kind: "branch", style: "curved" },
      ],
    } satisfies DiagramSpec);
    const routes = routeEdges(diagram, computeLayout(diagram));
    const starts = routes.map((edge) => edge.path.match(/^M ([\d-]+ [\d-]+)/)?.[1]);
    expect(new Set(starts).size).toBe(1);
    expect(routes[0]?.path).not.toBe(routes[1]?.path);
  });
});
