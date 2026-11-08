// @vitest-environment jsdom
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { aiAgentRequestExample } from "./examples.js";
import { renderClayFlow } from "./render.js";
import { CLAYFLOW_RUNTIME } from "./runtime.js";

declare global {
  interface Window {
    ClayFlow?: { mount(fig: HTMLElement): void; unmount(fig: HTMLElement): void };
  }
}

/** Animation frames run only when the test says so, so time is deterministic. */
let queued: FrameRequestCallback[] = [];
let now = 0;
const advance = (ms: number, step = 50) => {
  for (let t = 0; t < ms; t += step) {
    now += step;
    const due = queued;
    queued = [];
    due.forEach((cb) => cb(now));
  }
};
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

let fig: HTMLElement;
const scrub = () => fig.querySelector<HTMLInputElement>(".cf-scrub")!;
const lastFrame = () => scrub().max;

beforeAll(() => {
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => queued.push(cb));
  vi.stubGlobal("cancelAnimationFrame", () => {
    queued = [];
  });
  document.body.innerHTML = renderClayFlow(aiAgentRequestExample, { idPrefix: "rt" });
  fig = document.querySelector<HTMLElement>(".cf")!;
  // The runtime as a page receives it: one inline script that mounts what is already there.
  new Function(CLAYFLOW_RUNTIME)();
});

beforeEach(() => document.documentElement.classList.remove("force-reduced"));

describe("ClayFlow runtime", () => {
  it("autoplays a diagram that is in view, starting from the first step", () => {
    expect(window.ClayFlow).toBeDefined();
    expect(scrub().value).toBe("0");
    advance(3000);
    expect(Number(scrub().value)).toBeGreaterThan(0);
    expect(queued.length).toBe(1);
  });

  it("settles on the finished diagram and stops animating when reduced motion turns on mid-play", async () => {
    window.ClayFlow!.unmount(fig);
    window.ClayFlow!.mount(fig);
    fig.querySelector<HTMLButtonElement>('[data-action="replay"]')!.click();
    advance(600);
    expect(scrub().value).not.toBe(lastFrame());

    document.documentElement.classList.add("force-reduced");
    await flush();

    expect(scrub().value).toBe(lastFrame());
    expect(fig.querySelectorAll(".cf-off").length).toBe(0);
    expect(fig.querySelector('[data-action="play"]')!.getAttribute("aria-pressed")).toBe("false");
    advance(200);
    expect(queued.length).toBe(0);
  });

  it("steps forward one frame when Play is pressed under reduced motion", async () => {
    document.documentElement.classList.add("force-reduced");
    await flush();
    fig.querySelector<HTMLButtonElement>('[data-action="play"]')!.click();
    expect(scrub().value).toBe("0");
    fig.querySelector<HTMLButtonElement>('[data-action="play"]')!.click();
    expect(scrub().value).toBe("1");
    expect(queued.length).toBe(0);
  });
});
