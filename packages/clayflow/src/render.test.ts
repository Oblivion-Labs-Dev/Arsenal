import { describe, expect, it } from "vitest";
import { renderClayFlow, renderFallback } from "./render.js";
import { aiAgentRequestExample } from "./examples.js";
import { CLAYFLOW_STYLE } from "./style.js";
import { diagramSchema, type Diagram, type DiagramSpec, type FallbackModel } from "./schema.js";

describe("ClayFlow renderer", () => {
  it("escapes malicious <script> tags in titles, labels, and text values", () => {
    const maliciousDiagram: Diagram = diagramSchema.parse({
      ...aiAgentRequestExample,
      title: 'Diagram <script>alert("xss")</script>',
      summary: "Summary with <img src=x onerror=alert(1)>",
      nodes: [
        {
          id: "n-malicious",
          kind: "process",
          label: "Node <script>bad()</script>",
          meta: "Meta <script>bad()</script>",
        },
      ],
      edges: [],
    } satisfies DiagramSpec);

    const html = renderClayFlow(maliciousDiagram);

    expect(html.includes("<script>alert")).toBe(false);
    expect(html.includes("<script>bad()")).toBe(false);
    expect(html.includes("<img src=x onerror")).toBe(false);

    expect(html.includes("&lt;script&gt;")).toBe(true);
  });

  it("embeds parseable frames JSON in application/json script block", () => {
    const html = renderClayFlow(aiAgentRequestExample);

    const scriptMatch = html.match(
      /<script type="application\/json" class="cf-frames">([\s\S]*?)<\/script>/,
    );
    expect(scriptMatch?.[1]).toBeDefined();

    const jsonStr = scriptMatch![1]!;
    expect(() => JSON.parse(jsonStr)).not.toThrow();
    const frames = JSON.parse(jsonStr);
    expect(Array.isArray(frames)).toBe(true);
    expect(frames.length).toBeGreaterThan(0);
  });

  it("applies an opt-in topic accent and renders the new badge", () => {
    const diagram = diagramSchema.parse({ schemaVersion: "1.0", id: "topic-render", title: "Topic Render", topic: "finance", nodes: [{ id: "node", kind: "money", label: "Money", group: "band" }], edges: [], groups: [{ id: "band", label: "Section band", kind: "section" }], annotations: [{ id: "badge", target: "node", kind: "new", text: "New" }] });
    const html = renderClayFlow(diagram);
    expect(html).toContain('data-topic="finance"');
    expect(html).toContain("--cf-topic-accent:");
    expect(html).toContain("cf-chip-new");
    expect(html).toContain("cf-group-section");
    expect(renderClayFlow(diagramSchema.parse({ ...diagram, topic: undefined }))).not.toContain("data-topic=");
  });

  it("keeps step captions from closing the frames script or opening a comment", () => {
    const hostile = diagramSchema.parse({
      ...aiAgentRequestExample,
      animation: {
        preset: "step-reveal",
        steps: [{ caption: "a </script><img src=x onerror=alert(1)> <!-- b" }],
      },
    } satisfies DiagramSpec);
    const html = renderClayFlow(hostile);
    const block = html.match(/class="cf-frames">([\s\S]*?)<\/script>/)![1]!;
    expect(block).not.toContain("<");
    expect(JSON.parse(block)[0].caption).toBe("a </script><img src=x onerror=alert(1)> <!-- b");
  });

  it("renders ordered-list text alternative for accessibility", () => {
    const html = renderClayFlow(aiAgentRequestExample);
    expect(html.includes('<ol class="cf-steps"')).toBe(true);
    expect(html.includes("<li data-step=")).toBe(true);
  });

  it("emits both horizontal and precomputed vertical layout variants", () => {
    const html = renderClayFlow(aiAgentRequestExample);
    expect(html.includes('data-cf-layout="horizontal"')).toBe(true);
    expect(html.includes('data-cf-layout="vertical"')).toBe(true);
  });

  it("gives each stage its natural width so node text scales with the drawing, never past 1:1", () => {
    const html = renderClayFlow(aiAgentRequestExample);
    const stages = [
      ...html.matchAll(
        /data-cf-w="(\d+)" style="aspect-ratio:(\d+) \/ \d+;max-width:(\d+)px;--cf-w:(\d+);"/g,
      ),
    ];
    expect(stages).toHaveLength(2);
    for (const [, attr, aspect, max, unit] of stages) {
      expect(new Set([attr, aspect, max, unit]).size).toBe(1);
    }
  });

  it("stops shrinking a stage at 72% so text stays readable, scrolling the canvas instead", () => {
    expect(CLAYFLOW_STYLE).toMatch(
      /\.cf-stage\s*\{[^}]*min-width:\s*calc\(var\(--cf-w\) \* 0\.72px\)/,
    );
    expect(CLAYFLOW_STYLE).toMatch(/\.cf-canvas\s*\{[^}]*overflow-x:\s*auto/);
  });

  it("disables new decorative preset motion for reduced-motion users", () => {
    expect(CLAYFLOW_STYLE).toContain(".force-reduced .cf[data-cf-preset]");
    expect(CLAYFLOW_STYLE).toMatch(/@media \(prefers-reduced-motion:\s*reduce\)[\s\S]*?animation:\s*none/);
  });

  it("keeps the figure's own role instead of an ARIA role a figure may not carry", () => {
    expect(renderClayFlow(aiAgentRequestExample)).not.toMatch(/<figure class="cf[" ][^>]*role=/);
    expect(renderFallback({ title: "T", nodes: [] })).not.toMatch(/<figure class="cf[" ][^>]*role=/);
  });

  it("uses a light-theme accent that meets WCAG AA (4.5:1) for small text on a node", () => {
    const hex = CLAYFLOW_STYLE.match(/--cf-accent:\s*(#[0-9a-f]{6})/i)![1]!;
    const lum = (h: string) => {
      const [r, g, b] = [1, 3, 5].map((i) => {
        const v = parseInt(h.slice(i, i + 2), 16) / 255;
        return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
    };
    const ratio = (lum("#fffdf9") + 0.05) / (lum(hex) + 0.05);
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });

  it("prefixes asset base URL when provided in options", () => {
    const html = renderClayFlow(aiAgentRequestExample, {
      assetBase: "https://cdn.example.com",
    });
    expect(html.includes('src="https://cdn.example.com/assets/clayflow/')).toBe(true);
  });

  it("renders accessible fallback view for invalid specifications", () => {
    const fallback: FallbackModel = {
      title: "Broken Pipeline",
      summary: "Could not assemble diagram",
      nodes: [
        { id: "node-1", kind: "process", label: "Recovered Node 1" },
        { id: "node-2", kind: "database", label: "Recovered Database" },
      ],
    };

    const html = renderFallback(fallback);
    expect(html.includes("cf-fallback")).toBe(true);
    expect(html.includes("Broken Pipeline")).toBe(true);
    expect(html.includes("Recovered Node 1")).toBe(true);
    expect(html.includes("Recovered Database")).toBe(true);
  });

  it("toggles ELI5 vs advanced technical explanations based on mode option", () => {
    const htmlEli5 = renderClayFlow(aiAgentRequestExample, { mode: "eli5" });
    expect(htmlEli5.includes("cf-explanation-eli5")).toBe(true);

    const htmlAdvanced = renderClayFlow(aiAgentRequestExample, { mode: "advanced" });
    expect(htmlAdvanced.includes("cf-explanation-advanced")).toBe(true);
  });
});
