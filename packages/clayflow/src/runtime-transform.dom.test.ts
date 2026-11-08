// @vitest-environment jsdom
import { beforeAll, describe, expect, it, vi } from "vitest";
import { renderClayFlow } from "./render.js";
import { CLAYFLOW_RUNTIME } from "./runtime.js";
import { diagramSchema } from "./schema.js";

beforeAll(() => {
  vi.stubGlobal("requestAnimationFrame", () => 0);
  vi.stubGlobal("cancelAnimationFrame", () => {});
  new Function(CLAYFLOW_RUNTIME)();
});

describe("runtime transform steps", () => {
  it("swaps the node motion family with its kind and restores it when seeking back", () => {
    const spec = diagramSchema.parse({
      schemaVersion: "1.0", id: "remould", title: "Remould",
      nodes: [{ id: "raw", kind: "process", label: "Raw" }, { id: "out", kind: "goal", label: "Out" }],
      edges: [{ id: "e", from: "raw", to: "out" }],
      animation: { preset: "step-reveal", steps: [
        { caption: "Start", highlight: ["raw"] },
        { caption: "Store", transform: [{ node: "raw", kind: "database", label: "Stored" }] },
      ] },
    });
    const host = document.createElement("div");
    host.innerHTML = renderClayFlow(spec);
    document.body.appendChild(host);
    const fig = host.querySelector<HTMLElement>(".cf")!;
    window.ClayFlow!.mount(fig);
    const api = window.ClayFlow!.get(fig)!;
    const node = () => fig.querySelector<HTMLElement>('.cf-node[data-node="raw"]')!;

    api.seek(0);
    expect(node().getAttribute("data-kind")).toBe("process");
    expect(node().getAttribute("data-motion")).toBe("mechanism");

    api.seek(99); // clamps to the last frame
    expect(node().getAttribute("data-kind")).toBe("database");
    expect(node().getAttribute("data-motion")).toBe("reservoir");

    api.seek(0);
    expect(node().getAttribute("data-motion")).toBe("mechanism");
    window.ClayFlow!.unmount(fig);
  });
});
