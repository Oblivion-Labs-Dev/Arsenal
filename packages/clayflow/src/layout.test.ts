import { describe, expect, it } from "vitest";
import { computeLayout, type LayoutNode } from "./layout.js";
import { diagramSchema, type DiagramSpec } from "./schema.js";
import {
  aiAgentRequestExample,
  decisionTreeExample,
  failureRetryExample,
  moneyTransferExample,
  parallelProcessingExample,
} from "./examples.js";

function doBoxesOverlap(a: LayoutNode, b: LayoutNode): boolean {
  return !(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y);
}

describe("ClayFlow layout engine", () => {
  const examples = [
    aiAgentRequestExample,
    moneyTransferExample,
    decisionTreeExample,
    parallelProcessingExample,
    failureRetryExample,
  ];

  it("produces byte-identical deterministic results for repeated executions", () => {
    for (const ex of examples) {
      const layout1 = computeLayout(ex);
      const layout2 = computeLayout(ex);
      expect(JSON.stringify(layout1)).toBe(JSON.stringify(layout2));

      const vLayout1 = computeLayout(ex, "vertical");
      const vLayout2 = computeLayout(ex, "vertical");
      expect(JSON.stringify(vLayout1)).toBe(JSON.stringify(vLayout2));
    }
  });

  it("ensures no node overlaps in horizontal layout for all five flagship examples", () => {
    for (const ex of examples) {
      const layout = computeLayout(ex, "horizontal");
      const nodes = layout.nodes;

      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i]!;
          const b = nodes[j]!;
          const overlap = doBoxesOverlap(a, b);
          expect(
            overlap,
            `Nodes "${a.id}" and "${b.id}" in example "${ex.id}" (horizontal) overlap!`,
          ).toBe(false);
        }
      }
    }
  });

  it("ensures no node overlaps in vertical layout for all five flagship examples", () => {
    for (const ex of examples) {
      const layout = computeLayout(ex, "vertical");
      const nodes = layout.nodes;

      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i]!;
          const b = nodes[j]!;
          const overlap = doBoxesOverlap(a, b);
          expect(
            overlap,
            `Nodes "${a.id}" and "${b.id}" in example "${ex.id}" (vertical) overlap!`,
          ).toBe(false);
        }
      }
    }
  });

  it("calculates group bounding boxes that encompass their member nodes", () => {
    const layout = computeLayout(aiAgentRequestExample);
    for (const g of layout.groups) {
      expect(g.w).toBeGreaterThan(0);
      expect(g.h).toBeGreaterThan(0);
      expect(g.depth).toBeGreaterThanOrEqual(1);
    }
  });

  it("computes accurate port anchors for every placed node", () => {
    const layout = computeLayout(aiAgentRequestExample);
    for (const n of layout.nodes) {
      expect(n.ports.n.x).toBe(Math.round(n.x + n.w / 2));
      expect(n.ports.n.y).toBe(n.y);

      expect(n.ports.s.x).toBe(Math.round(n.x + n.w / 2));
      expect(n.ports.s.y).toBe(n.y + n.h);

      expect(n.ports.w.x).toBe(n.x);
      expect(n.ports.w.y).toBe(Math.round(n.y + n.h / 2));

      expect(n.ports.e.x).toBe(n.x + n.w);
      expect(n.ports.e.y).toBe(Math.round(n.y + n.h / 2));
    }
  });
  it("keeps the same margin on the left and right of the drawing", () => {
    for (const ex of examples) {
      for (const dir of ["horizontal", "vertical"] as const) {
        const l = computeLayout(ex, dir);
        const left = Math.min(...l.nodes.map((n) => n.x), ...l.groups.map((g) => g.x));
        const right = Math.max(...l.nodes.map((n) => n.x + n.w), ...l.groups.map((g) => g.x + g.w));
        if (l.width > 320) expect(l.width - right, `${ex.id} ${dir}`).toBe(left);
      }
    }
  });

  it("widens a node to fit a long label, capped so one node cannot dominate the drawing", () => {
    const spec = (label: string) =>
      diagramSchema.parse({
        ...aiAgentRequestExample,
        nodes: [{ id: "a", kind: "process", label }],
        edges: [],
        groups: [],
        animation: { preset: "step-reveal" },
      } satisfies DiagramSpec);
    const short = computeLayout(spec("Go")).nodes[0]!;
    const long = computeLayout(spec("Reconcile ledger")).nodes[0]!;
    const huge = computeLayout(spec("x".repeat(40))).nodes[0]!;
    expect(long.w).toBeGreaterThan(short.w);
    expect(long.w).toBeGreaterThanOrEqual(84 + 16 * 7.6);
    expect(huge.w).toBe(260);
  });

  it("wraps a wide rank into rows of at most two in the vertical layout", () => {
    const d = diagramSchema.parse({
      ...aiAgentRequestExample,
      nodes: Array.from({ length: 7 }, (_, i) => ({
        id: `n${i}`,
        kind: "process",
        label: `Step ${i}`,
      })),
      edges: [],
      groups: [],
      animation: { preset: "step-reveal" },
    } satisfies DiagramSpec);
    const v = computeLayout(d, "vertical");
    const rows = new Set(v.nodes.map((n) => n.y));
    expect(rows.size).toBe(4);
    for (const y of rows) expect(v.nodes.filter((n) => n.y === y).length).toBeLessThanOrEqual(2);
    const widest = Math.max(...v.nodes.map((n) => n.w));
    expect(v.width).toBeLessThanOrEqual(2 * 24 + 2 * widest + 16);
  });
  it("puts the node that feeds the next rank in the last row of a wrapped rank", () => {
    const d = diagramSchema.parse({
      ...aiAgentRequestExample,
      nodes: [
        ...Array.from({ length: 4 }, (_, i) => ({
          id: `n${i}`,
          kind: "process" as const,
          label: `Step ${i}`,
        })),
        { id: "out", kind: "process", label: "Out" },
      ],
      edges: [{ id: "e", from: "n0", to: "out" }],
      groups: [],
      animation: { preset: "step-reveal" },
    } satisfies DiagramSpec);
    const v = computeLayout(d, "vertical");
    const y = (id: string) => v.nodes.find((n) => n.id === id)!.y;
    for (const id of ["n1", "n2", "n3"]) expect(y("n0")).toBeGreaterThanOrEqual(y(id));
    expect(y("out")).toBeGreaterThan(y("n0"));
  });
});
