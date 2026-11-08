// @vitest-environment jsdom
import { createElement } from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { aiAgentRequestExample } from "../examples.js";
import { CLAYFLOW_RUNTIME } from "../runtime.js";
import { ClayFlowDiagram } from "./ClayFlowDiagram.js";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

beforeAll(() => {
  vi.stubGlobal("requestAnimationFrame", () => 0);
  vi.stubGlobal("cancelAnimationFrame", () => {});
  new Function(CLAYFLOW_RUNTIME)();
});

describe("ClayFlowDiagram (DOM)", () => {
  it("does not remount the runtime when a parent re-renders with a new inline onReady", () => {
    const mount = vi.spyOn(window.ClayFlow!, "mount");
    const ready = vi.fn();
    const host = document.createElement("div");
    document.body.appendChild(host);
    const root = createRoot(host);
    const render = (n: number) =>
      createElement(ClayFlowDiagram, { spec: aiAgentRequestExample, className: `r${n}`, onReady: (api) => ready(api) });

    act(() => root.render(render(1)));
    act(() => root.render(render(2)));
    act(() => root.render(render(3)));

    expect(mount).toHaveBeenCalledTimes(1);
    expect(ready).toHaveBeenCalledTimes(1);
    act(() => root.unmount());
    mount.mockRestore();
  });
});
