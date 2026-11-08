import { describe, expect, it, vi } from "vitest";
import { CLAYFLOW_STYLE } from "../style.js";
import { diagramSchema, NODE_KINDS } from "../schema.js";
import { renderClayFlow } from "../render.js";
import { KIND_MOTION_FAMILY, MOTION_FAMILIES, getKindMotionFamily, setMetricProgress } from "./kind-motion.js";

describe("kind motion families", () => {
  it("maps every node kind to a declared motion family", () => {
    expect(Object.keys(KIND_MOTION_FAMILY).sort()).toEqual([...NODE_KINDS].sort());
    for (const kind of NODE_KINDS) {
      expect(MOTION_FAMILIES).toContain(getKindMotionFamily(kind));
    }
  });

  it("renders the semantic motion family on each node", () => {
    const diagram = diagramSchema.parse({
      schemaVersion: "1.0",
      id: "motion-node",
      title: "Motion node",
      nodes: [{ id: "agent", kind: "agent", label: "Agent" }],
    });
    expect(renderClayFlow(diagram)).toContain('data-kind="agent" data-motion="thinking"');
  });

  it("has a CSS rule for every family and reduced-motion overrides", () => {
    for (const family of MOTION_FAMILIES) {
      expect(CLAYFLOW_STYLE).toContain(`data-motion="${family}"`);
    }
    expect(CLAYFLOW_STYLE).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)/);
    expect(CLAYFLOW_STYLE).toMatch(/prefers-reduced-motion:\s*reduce\)[\s\S]*?animation:\s*none\s*!important/);
  });

  it("uses motion token variables instead of literal millisecond durations", () => {
    const stylesWithoutTokenDefaults = CLAYFLOW_STYLE.replace(/^\s*--cf-dur-[\w-]+:\s*[^;]+;/gm, "");
    expect(stylesWithoutTokenDefaults).not.toMatch(/\b\d+(?:\.\d+)?ms\b/);
    expect(stylesWithoutTokenDefaults).toMatch(/animation:[^;]*var\(--cf-dur-/);
    expect(stylesWithoutTokenDefaults).toMatch(/transition:[^;]*var\(--cf-dur-/);
  });

  it("sets normalized progress only for finite percent values", () => {
    const setProperty = vi.fn();
    const metric = { style: { setProperty } } as unknown as HTMLElement;

    expect(setMetricProgress(metric, 72, "%")).toBe(true);
    expect(setProperty).toHaveBeenCalledWith("--cf-progress", "0.72");
    expect(setMetricProgress(metric, 120, "%")).toBe(true);
    expect(setProperty).toHaveBeenLastCalledWith("--cf-progress", "1");
    expect(setMetricProgress(metric, 50, "items")).toBe(false);
    expect(setMetricProgress(metric, Number.NaN, "%")).toBe(false);
    expect(setProperty).toHaveBeenCalledTimes(2);
  });
});
