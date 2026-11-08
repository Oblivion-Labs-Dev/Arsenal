import { describe, expect, it } from "vitest";
import { EXAMPLES } from "./examples.js";
import { validate } from "./validate.js";
import { compile } from "./timeline.js";
import { renderClayFlow } from "./render.js";

describe("ClayFlow flagship examples", () => {
  const exampleKeys = Object.keys(EXAMPLES);

  it("includes all five flagship example specifications", () => {
    expect(exampleKeys).toEqual([
      "ai-agent-request",
      "money-transfer",
      "decision-tree",
      "parallel-processing",
      "failure-retry",
    ]);
  });

  for (const key of exampleKeys) {
    describe(`Example: ${key}`, () => {
      const diagram = EXAMPLES[key]!;

      it("passes strict schema validation", () => {
        const res = validate(diagram);
        expect(res.ok, `Validation failed for ${key}: ${res.ok ? "" : res.errors.join(", ")}`).toBe(
          true,
        );
      });

      it("contains both ELI5 and advanced technical explanations", () => {
        expect(diagram.explanations?.eli5).toBeDefined();
        expect(diagram.explanations?.eli5?.length).toBeGreaterThan(10);
        expect(diagram.explanations?.advanced).toBeDefined();
        expect(diagram.explanations?.advanced?.length).toBeGreaterThan(10);
      });

      it("compiles into valid, bounded animation frames", () => {
        const frames = compile(diagram);
        expect(frames.length).toBeGreaterThan(0);
        expect(frames.length).toBeLessThanOrEqual(24);
      });

      it("renders to static-first HTML containing all nodes and edges", () => {
        const html = renderClayFlow(diagram);
        expect(html.includes(`data-cf-id="${diagram.id}"`)).toBe(true);
        expect(html.includes(diagram.title)).toBe(true);

        for (const node of diagram.nodes) {
          expect(html.includes(`data-node="${node.id}"`)).toBe(true);
        }
        for (const edge of diagram.edges) {
          expect(html.includes(`data-edge="${edge.id}"`)).toBe(true);
        }
      });
    });
  }
});
