import { describe, expect, it } from "vitest";
import { computeLayout } from "../layout.js";
import { compile } from "../timeline.js";
import { validate } from "../validate.js";
import { REPORT_DIAGRAM_SPECS } from "./report-specs.js";

describe("Manthan report diagram examples", () => {
  const specs = Object.entries(REPORT_DIAGRAM_SPECS).flatMap(([period, report]) =>
    Object.entries(report).map(([section, spec]) => ({ period, section, spec })),
  );

  it("validates every illustrative report diagram and compiles bounded frames", () => {
    for (const { period, section, spec } of specs) {
      const result = validate(spec);
      expect(result.ok, `${period}/${section}: ${result.ok ? "" : result.errors.join(", ")}`).toBe(true);
      if (!result.ok) continue;

      const frames = compile(result.diagram);
      expect(frames.length, `${period}/${section} should have frames`).toBeGreaterThan(0);
      expect(frames.length, `${period}/${section} should stay within the frame budget`).toBeLessThanOrEqual(24);
      expect(result.diagram.illustrative, `${period}/${section} must be marked illustrative`).toBe(true);
      expect(
        result.diagram.animation?.steps?.some((step) =>
          Boolean(step.annotate?.length || step.branch || step.expand?.length),
        ),
        `${period}/${section} should demonstrate annotation, branching or groups`,
      ).toBe(true);
    }
  });

  it("keeps the wide layout in the report reading column (about 1100 px)", () => {
    // The runtime switches to the tall phone layout when the container is under 75% of the
    // horizontal stage width; a long chain made the story fall back to it on desktop.
    for (const { period, section, spec } of specs) {
      const result = validate(spec);
      if (!result.ok) continue;
      const width = computeLayout(result.diagram, "horizontal").width;
      expect(width * 0.75, `${period}/${section} horizontal width ${width}`).toBeLessThanOrEqual(1100);
    }
  });

  it("ends every report diagram with the whole story visible", () => {
    // Step visibility is not cumulative: a step that lists only its new nodes hides earlier ones.
    for (const { period, section, spec } of specs) {
      const result = validate(spec);
      if (!result.ok) continue;
      const last = compile(result.diagram).at(-1)!;
      for (const node of result.diagram.nodes) expect(last.visible, `${period}/${section} hides ${node.id}`).toContain(node.id);
    }
  });
});
