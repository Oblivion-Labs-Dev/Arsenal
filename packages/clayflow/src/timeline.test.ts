import { describe, expect, it } from "vitest";
import { compile, frameAt } from "./timeline.js";
import { aiAgentRequestExample } from "./examples.js";
import { ANIMATION_PRESETS, diagramSchema, type Diagram, type DiagramSpec } from "./schema.js";

describe("ClayFlow animation timeline", () => {
  it("compiles each of the 15 presets successfully within the 24 frame budget", () => {
    for (const preset of ANIMATION_PRESETS) {
      const diag: Diagram = diagramSchema.parse({
        ...aiAgentRequestExample,
        animation: {
          preset,
          speed: 1,
          loop: true,
        },
      } satisfies DiagramSpec);

      const frames = compile(diag);
      expect(frames.length).toBeGreaterThan(0);
      expect(frames.length).toBeLessThanOrEqual(24);

      // Verify strict sequential timestamps
      for (let i = 0; i < frames.length; i++) {
        expect(frames[i]!.index).toBe(i);
        expect(frames[i]!.duration).toBeGreaterThan(0);
        if (i > 0) {
          expect(frames[i]!.at).toBe(frames[i - 1]!.at + frames[i - 1]!.duration);
        }
      }
    }
  });

  it("produces deterministic compile outputs", () => {
    const frames1 = compile(aiAgentRequestExample);
    const frames2 = compile(aiAgentRequestExample);
    expect(JSON.stringify(frames1)).toBe(JSON.stringify(frames2));
  });

  it("dims non-selected branch edges, expands loop packets, and keeps state sticky", () => {
    const spec = diagramSchema.parse({ schemaVersion: "1.0", id: "branch-loop", title: "Branch Loop", nodes: [{ id: "gate", kind: "decision", label: "Gate" }, { id: "yes", kind: "process", label: "Yes" }, { id: "no", kind: "process", label: "No" }], edges: [{ id: "take", from: "gate", to: "yes" }, { id: "skip", from: "gate", to: "no" }], groups: [{ id: "group", label: "Group" }], annotations: [{ id: "note", target: "yes", kind: "info", text: "Note" }], animation: { preset: "data-flow", steps: [{ caption: "Choose", branch: { from: "gate", take: "take" }, transform: [{ node: "yes", label: "Chosen" }], expand: ["group"], annotate: ["note"] }, { caption: "Repeat", loop: { edge: "take", times: 3 } }] } });
    const frames = compile(spec);
    expect(frames[0]?.dimmed).toContain("skip");
    expect(frames.slice(1).filter((frame) => frame.packets.some((packet) => packet.edge === "take"))).toHaveLength(3);
    expect(frames[1]?.transforms?.yes?.label).toBe("Chosen");
    expect(frames[1]?.annotations).toContain("note");
    expect(frames).toHaveLength(4);
    expect(JSON.stringify(frames)).toBe(JSON.stringify(compile(spec)));
  });

  it("allows custom animation.steps to override default preset generation", () => {
    const customDiagram: Diagram = diagramSchema.parse({
      ...aiAgentRequestExample,
      animation: {
        preset: "data-flow",
        steps: [
          { caption: "Custom Step One", highlight: ["user"] },
          { caption: "Custom Step Two", highlight: ["agent"] },
        ],
      },
    } satisfies DiagramSpec);

    const frames = compile(customDiagram);
    expect(frames.length).toBe(2);
    expect(frames[0]?.caption).toBe("Custom Step One");
    expect(frames[1]?.caption).toBe("Custom Step Two");
  });

  describe("frameAt pure lookup function", () => {
    it("returns correct frame at boundaries and loops cleanly", () => {
      const frames = compile(aiAgentRequestExample);
      const totalDuration = frames.reduce((sum, f) => sum + f.duration, 0);

      // Frame at t=0
      const f0 = frameAt(frames, 0);
      expect(f0.index).toBe(0);

      // Frame at mid first frame
      const fMid0 = frameAt(frames, f0.duration / 2);
      expect(fMid0.index).toBe(0);

      // Frame at second frame start
      if (frames.length > 1) {
        const f1 = frameAt(frames, frames[1]!.at);
        expect(f1.index).toBe(1);
      }

      // Loop over: t = totalDuration + 10ms should be frame 0
      const fLoop = frameAt(frames, totalDuration + 10);
      expect(fLoop.index).toBe(0);

      // Handle negative time cleanly
      const fNeg = frameAt(frames, -100);
      expect(fNeg.index).toBeDefined();
    });

    it("handles empty or single-frame arrays safely", () => {
      const emptyResult = frameAt([], 100);
      expect(emptyResult.index).toBe(0);

      const singleFrame = [
        {
          index: 0,
          at: 0,
          duration: 500,
          visible: ["n1"],
          highlight: [],
          packets: [],
          states: {},
          counters: {},
          caption: "Single",
        },
      ];
      expect(frameAt(singleFrame, 999).caption).toBe("Single");
    });
  });
  it("keeps a node lit when the taken branch also reaches it (converging paths)", () => {
    const spec = diagramSchema.parse({ schemaVersion: "1.0", id: "converge", title: "Converge", nodes: [{ id: "gate", kind: "decision", label: "Gate" }, { id: "yes", kind: "process", label: "Yes" }, { id: "no", kind: "process", label: "No" }, { id: "end", kind: "goal", label: "End" }], edges: [{ id: "take", from: "gate", to: "yes" }, { id: "skip", from: "gate", to: "no" }, { id: "y2", from: "yes", to: "end" }, { id: "n2", from: "no", to: "end" }], animation: { preset: "data-flow", steps: [{ caption: "Choose", branch: { from: "gate", take: "take" } }] } });
    const [frame] = compile(spec);
    expect(frame!.dimmed).toEqual(expect.arrayContaining(["skip", "no"]));
    expect(frame!.dimmed).not.toContain("end");
  });
  it("does not dim nodes already walked when the skipped branch loops back upstream", () => {
    const spec = diagramSchema.parse({ schemaVersion: "1.0", id: "loopback", title: "Loop back", nodes: [{ id: "start", kind: "process", label: "Start" }, { id: "work", kind: "process", label: "Work" }, { id: "gate", kind: "decision", label: "Gate" }, { id: "done", kind: "goal", label: "Done" }], edges: [{ id: "s-w", from: "start", to: "work" }, { id: "w-g", from: "work", to: "gate" }, { id: "go", from: "gate", to: "done", kind: "conditional", condition: "Ok" }, { id: "again", from: "gate", to: "work", kind: "feedback" }], animation: { preset: "data-flow", steps: [{ caption: "Pass", branch: { from: "gate", take: "go" } }] } });
    const [frame] = compile(spec);
    expect(frame!.dimmed).toContain("again");
    expect(frame!.dimmed).not.toContain("work");
    expect(frame!.dimmed).not.toContain("gate");
    expect(frame!.dimmed).not.toContain("start");
  });
});
