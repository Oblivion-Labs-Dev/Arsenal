import { describe, expect, it } from "vitest";
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
});
