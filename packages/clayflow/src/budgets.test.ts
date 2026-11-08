import { describe, expect, it } from "vitest";
import { CLAYFLOW_STYLE } from "./style.js";
import { CLAYFLOW_RUNTIME } from "./runtime.js";

describe("ClayFlow size budgets (ARCHITECTURE.md)", () => {
  it("keeps CLAYFLOW_STYLE under the 16KB (16,384 bytes) limit", () => {
    const byteSize = Buffer.byteLength(CLAYFLOW_STYLE, "utf8");
    expect(byteSize).toBeLessThanOrEqual(16384);
  });

  it("keeps CLAYFLOW_RUNTIME under the 12KB (12,288 bytes) limit", () => {
    const byteSize = Buffer.byteLength(CLAYFLOW_RUNTIME, "utf8");
    expect(byteSize).toBeLessThanOrEqual(12288);
  });
});
