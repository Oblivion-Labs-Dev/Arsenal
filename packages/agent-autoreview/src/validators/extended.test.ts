import { describe, expect, it } from "vitest";
import {
  detectDecorativeLineCollisions,
  sampleSvgPath,
} from "./decorative-lines.js";
import { resolveBrowserEngines } from "../browser/engines.js";
import { runExtendedVisualChecks } from "./extended-visual.js";

describe("decorative line collisions", () => {
  it("detects SVG path crossing text", () => {
    const points = sampleSvgPath("M 0 10 L 100 10");
    expect(points.length).toBeGreaterThan(5);
    const findings = detectDecorativeLineCollisions({
      lines: [],
      svgPaths: [{ id: "connector", d: "M 0 10 L 100 10" }],
      protectedRects: [
        {
          selector: "h1",
          kind: "text",
          rect: { x: 40, y: 0, width: 40, height: 20, right: 80, bottom: 20 },
        },
      ],
    });
    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0]?.explanation).toMatch(/cross|intersect/i);
  });
});

describe("browser engines", () => {
  it("fast mode uses chromium only", () => {
    expect(resolveBrowserEngines({ mode: "fast" })).toEqual(["chromium"]);
  });

  it("cross-browser check includes firefox and webkit", () => {
    expect(
      resolveBrowserEngines({ mode: "fast", checks: ["cross-browser"] }),
    ).toEqual(["chromium", "firefox", "webkit"]);
  });

  it("thorough includes all engines", () => {
    expect(resolveBrowserEngines({ mode: "thorough" })).toContain("firefox");
    expect(resolveBrowserEngines({ mode: "thorough" })).toContain("webkit");
  });
});

describe("focus ring clipping", () => {
  it("flags clipped focus rings", () => {
    const findings = runExtendedVisualChecks(
      {
        viewportWidth: 390,
        viewportHeight: 844,
        scrollWidth: 390,
        scrollHeight: 844,
        elements: [],
        imageStatuses: [],
      },
      "/components",
      {
        focusRingSamples: [
          {
            selector: "button",
            outlineRect: { x: -4, y: 10, width: 48, height: 40, right: 44, bottom: 50 },
            clippedBy: { x: 0, y: 0, width: 100, height: 100, right: 100, bottom: 100 },
          },
        ],
      },
    );
    expect(findings.some((f) => f.id.includes("focus-ring-clip"))).toBe(true);
  });
});
