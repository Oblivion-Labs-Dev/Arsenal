import { describe, expect, it } from "vitest";
import { CLAYFLOW_STYLE } from "./style.js";
import { CLAYFLOW_RUNTIME } from "./runtime.js";

// Budgets were 16KB style / 12KB runtime for the Manthan port. The animation-engine
// brief added inspect, step/seek/speed, new step kinds and per-family motion CSS, so
// they were raised once, deliberately (see docs/design/clayflow-animation-engine/
// PERFORMANCE-RESULTS.md). Raise again only with a recorded reason.
const STYLE_BUDGET = 28 * 1024;
const RUNTIME_BUDGET = 20 * 1024;

describe("ClayFlow size budgets", () => {
  it(`keeps CLAYFLOW_STYLE under ${STYLE_BUDGET} bytes`, () => {
    expect(Buffer.byteLength(CLAYFLOW_STYLE, "utf8")).toBeLessThanOrEqual(STYLE_BUDGET);
  });

  it(`keeps CLAYFLOW_RUNTIME under ${RUNTIME_BUDGET} bytes`, () => {
    expect(Buffer.byteLength(CLAYFLOW_RUNTIME, "utf8")).toBeLessThanOrEqual(RUNTIME_BUDGET);
  });
});
