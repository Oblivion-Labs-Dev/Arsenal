import { describe, expect, it } from "vitest";
import { computeLayout } from "../layout.js";
import { routeEdges } from "../route.js";
import { compile } from "../timeline.js";
import { validate } from "../validate.js";
import {
  ALL_SHOWCASE_SPECS,
  COMPONENT_STATE_SPECS,
  CONNECTOR_SPECS,
  EXAMPLE_DIAGRAMS,
  TRANSFORMATION_RECIPES,
} from "./showcase-specs.js";

describe("ClayFlow animation showcase specs", () => {
  it("validates and compiles every exported spec within the frame budget", () => {
    for (const spec of ALL_SHOWCASE_SPECS) {
      const result = validate(spec);
      expect(result.ok, `${spec.id}: ${result.ok ? "" : result.errors.join(", ")}`).toBe(true);
      if (!result.ok) continue;
      expect(compile(result.diagram).length, spec.id).toBeLessThanOrEqual(24);
    }
  });

  it("covers every requested node family", () => {
    const kinds = new Set(COMPONENT_STATE_SPECS.flatMap((spec) => spec.nodes.map((item) => item.kind)));
    for (const kind of ["process", "data", "agent", "person", "decision", "money", "growth", "goal", "timeline", "launch", "science", "technology", "success", "progress-ring"]) {
      expect(kinds.has(kind), `missing ${kind}`).toBe(true);
    }
    expect(COMPONENT_STATE_SPECS.find((spec) => spec.id === "state-group")?.groups?.length).toBeGreaterThan(0);
  });

  it("uses branch, loop and transform steps in their dedicated examples", () => {
    expect(EXAMPLE_DIAGRAMS.decisionTree.animation?.steps?.some((step) => step.branch)).toBe(true);
    expect(EXAMPLE_DIAGRAMS.conditionalLoop.animation?.steps?.some((step) => step.loop)).toBe(true);
    for (const spec of TRANSFORMATION_RECIPES) {
      expect(spec.animation?.steps?.some((step) => step.transform?.length), spec.id).toBe(true);
    }
  });

  it("provides the eight requested connector forms", () => {
    expect(CONNECTOR_SPECS).toHaveLength(8);
  });

  it("draws connector demos so each shape is visible", () => {
    const byId = (id: string) => {
      const result = validate(CONNECTOR_SPECS.find((spec) => spec.id === `connector-${id}`)!);
      if (!result.ok) throw new Error(result.errors.join(", "));
      return result.diagram;
    };
    // A feedback wire returns to where the work came from.
    const feedback = byId("feedback");
    expect(feedback.edges[0]).toMatchObject({ from: "to", to: "from", kind: "feedback" });
    // A curve between two aligned nodes renders as a straight line, so the curved and dashed
    // demos must reach a node that is offset on the cross axis, in both layouts.
    for (const id of ["curved", "dashed"]) {
      const diagram = byId(id);
      for (const forced of ["horizontal", "vertical"] as const) {
        const layout = computeLayout({ ...diagram, layout: forced });
        const pos = new Map(layout.nodes.map((n) => [n.id, n]));
        const bends = diagram.edges.some((edge) => {
          const a = pos.get(edge.from)!;
          const b = pos.get(edge.to)!;
          return forced === "vertical" ? a.x + a.w / 2 !== b.x + b.w / 2 : a.y + a.h / 2 !== b.y + b.h / 2;
        });
        expect(bends, `${id} ${forced}`).toBe(true);
        expect(routeEdges({ ...diagram, layout: forced }, layout).length).toBe(diagram.edges.length);
      }
    }
  });
});
