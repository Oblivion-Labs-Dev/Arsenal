// @vitest-environment jsdom
import { beforeAll, describe, expect, it, vi } from "vitest";
import { aiAgentRequestExample } from "./examples.js";
import { renderClayFlow } from "./render.js";
import { CLAYFLOW_RUNTIME } from "./runtime.js";

/** Frames and visibility change only when the test says so. */
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

let observerCallback: IntersectionObserverCallback = () => {};
const setInView = (target: Element, isIntersecting: boolean) =>
  observerCallback(
    [{ target, isIntersecting } as IntersectionObserverEntry],
    {} as IntersectionObserver,
  );

let fig: HTMLElement;
const scrub = () => fig.querySelector<HTMLInputElement>(".cf-scrub")!;

beforeAll(() => {
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => queued.push(cb));
  vi.stubGlobal("cancelAnimationFrame", () => {
    queued = [];
  });
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(cb: IntersectionObserverCallback) {
        observerCallback = cb;
      }
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  document.body.innerHTML = renderClayFlow(aiAgentRequestExample, { idPrefix: "off" });
  fig = document.querySelector<HTMLElement>(".cf")!;
  new Function(CLAYFLOW_RUNTIME)();
});

describe("ClayFlow runtime offscreen", () => {
  it("does not animate until the diagram scrolls into view", () => {
    advance(1000);
    expect(queued.length).toBe(0);
    expect(scrub().value).toBe(scrub().max);
  });

  it("stops requesting frames when it leaves the view and resumes where it was", () => {
    setInView(fig, true);
    advance(600);
    expect(queued.length).toBe(1);
    const at = scrub().value;

    setInView(fig, false);
    advance(50);
    expect(queued.length).toBe(0);
    advance(2000);
    expect(scrub().value).toBe(at);
    expect(fig.querySelector('[data-action="play"]')!.getAttribute("aria-pressed")).toBe("true");

    setInView(fig, true);
    advance(50);
    expect(queued.length).toBe(1);
  });
});
