import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  ANIMATION_PRESETS,
  ANNOTATION_KINDS,
  EDGE_STYLES,
  GROUP_KINDS,
  NODE_KINDS,
  NODE_STATES,
  validate,
} from "../index.js";
import { ALL_GALLERY_SPECS, connectorsOverviewSpec, groupsOverviewSpec } from "./gallery-specs.js";

describe("ClayFlow Gallery Specs", () => {
  describe("individual spec validation", () => {
    for (const [id, spec] of Object.entries(ALL_GALLERY_SPECS)) {
      it(`validates "${id}" without errors`, () => {
        const result = validate(spec);
        if (!result.ok) {
          throw new Error(`Validation failed for "${id}":\n${result.errors.join("\n")}`);
        }
        expect(result.ok).toBe(true);
      });
    }
  });

  describe("schema enum coverage", () => {
    it("covers every value of NODE_KINDS at least once", () => {
      const covered = new Set<string>();
      for (const spec of Object.values(ALL_GALLERY_SPECS)) {
        for (const node of spec.nodes) {
          covered.add(node.kind);
        }
      }
      for (const kind of NODE_KINDS) {
        expect(covered.has(kind), `Missing NODE_KINDS coverage for: "${kind}"`).toBe(true);
      }
    });

    it("covers every value of NODE_STATES at least once", () => {
      const covered = new Set<string>();
      for (const spec of Object.values(ALL_GALLERY_SPECS)) {
        for (const node of spec.nodes) {
          if (node.state) {
            covered.add(node.state);
          }
        }
      }
      for (const state of NODE_STATES) {
        expect(covered.has(state), `Missing NODE_STATES coverage for: "${state}"`).toBe(true);
      }
    });

    it("covers every value of EDGE_STYLES at least once", () => {
      const covered = new Set<string>();
      for (const spec of Object.values(ALL_GALLERY_SPECS)) {
        if (spec.edges) {
          for (const edge of spec.edges) {
            if (edge.style) {
              covered.add(edge.style);
            }
          }
        }
      }
      for (const style of EDGE_STYLES) {
        expect(covered.has(style), `Missing EDGE_STYLES coverage for: "${style}"`).toBe(true);
      }
    });

    it("covers every value of ANNOTATION_KINDS at least once", () => {
      const covered = new Set<string>();
      for (const spec of Object.values(ALL_GALLERY_SPECS)) {
        if (spec.annotations) {
          for (const ann of spec.annotations) {
            covered.add(ann.kind);
          }
        }
      }
      for (const kind of ANNOTATION_KINDS) {
        expect(covered.has(kind), `Missing ANNOTATION_KINDS coverage for: "${kind}"`).toBe(true);
      }
    });

    it("covers every value of GROUP_KINDS at least once", () => {
      const covered = new Set<string>();
      for (const spec of Object.values(ALL_GALLERY_SPECS)) {
        if (spec.groups) {
          for (const group of spec.groups) {
            if (group.kind) {
              covered.add(group.kind);
            }
          }
        }
      }
      for (const kind of GROUP_KINDS) {
        expect(covered.has(kind), `Missing GROUP_KINDS coverage for: "${kind}"`).toBe(true);
      }
    });

    it("covers every value of ANIMATION_PRESETS at least once", () => {
      const covered = new Set<string>();
      for (const spec of Object.values(ALL_GALLERY_SPECS)) {
        if (spec.animation?.preset) {
          covered.add(spec.animation.preset);
        }
      }
      for (const preset of ANIMATION_PRESETS) {
        expect(covered.has(preset), `Missing ANIMATION_PRESETS coverage for: "${preset}"`).toBe(
          true,
        );
      }
    });
  });

  describe("structural requirements", () => {
    it("connectors overview contains parallel edges between the same pair", () => {
      const edges = connectorsOverviewSpec.edges ?? [];
      const parallelPair = edges.filter(
        (e) =>
          (e.from === "conn-beta" && e.to === "conn-gamma") ||
          (e.from === "conn-gamma" && e.to === "conn-beta"),
      );
      expect(parallelPair.length).toBeGreaterThanOrEqual(2);
    });

    it("groups overview contains a nested group with parent hierarchy (depth 2)", () => {
      const groups = groupsOverviewSpec.groups ?? [];
      const nested = groups.find((g) => g.parent !== undefined);
      expect(nested).toBeDefined();
      expect(nested?.parent).toBe("grp-outer");
    });
  });
});

describe("gallery mode switcher", () => {
  it("never wraps the ELI5 / Advanced labels letter by letter on a phone", () => {
    const css = readFileSync(new URL("./clayflow-gallery.css", import.meta.url), "utf8");
    expect(css).toMatch(/\.cfg-segmented\s*\{[^}]*flex-shrink:\s*0/);
    expect(css).toMatch(/\.cfg-segmented-btn\s*\{[^}]*white-space:\s*nowrap/);
  });
});
