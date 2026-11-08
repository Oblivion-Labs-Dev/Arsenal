import type { Diagram, NodeState } from "./schema.js";

export interface AnimationPacket {
  edge: string;
  reverse?: boolean;
}

export interface Frame {
  index: number;
  at: number; // ms at 1x
  duration: number; // ms
  visible: string[]; // ids of visible nodes and edges
  highlight: string[]; // ids of highlighted nodes or edges
  packets: AnimationPacket[];
  states: Record<string, NodeState>;
  counters: Record<string, number>;
  caption: string;
}

const DEFAULT_FRAME_DURATION = 800; // ms within 700-900ms

/**
 * Pure function: retrieves the frame active at time tMs.
 * If tMs exceeds the total duration, wraps around (loop).
 */
export function frameAt(frames: Frame[], tMs: number): Frame {
  if (frames.length === 0) {
    return {
      index: 0,
      at: 0,
      duration: DEFAULT_FRAME_DURATION,
      visible: [],
      highlight: [],
      packets: [],
      states: {},
      counters: {},
      caption: "",
    };
  }

  if (frames.length === 1) {
    return frames[0]!;
  }

  const totalDuration = frames.reduce((acc, f) => acc + f.duration, 0);
  if (totalDuration <= 0) return frames[0]!;

  // Modulo for looping time
  const normTime = ((tMs % totalDuration) + totalDuration) % totalDuration;

  for (const f of frames) {
    if (normTime >= f.at && normTime < f.at + f.duration) {
      return f;
    }
  }

  return frames[frames.length - 1]!;
}

/**
 * Compiles a validated diagram into a deterministic sequence of animation frames.
 * Returns at most 24 frames.
 */
export function compile(diagram: Diagram): Frame[] {
  const allNodeIds = diagram.nodes.map((n) => n.id);
  const allEdgeIds = diagram.edges.map((e) => e.id);
  const allIds = [...allNodeIds, ...allEdgeIds];

  const initialStates: Record<string, NodeState> = {};
  const initialCounters: Record<string, number> = {};
  for (const n of diagram.nodes) {
    initialStates[n.id] = n.state ?? "idle";
    if (n.metric) {
      initialCounters[n.id] = n.metric.value;
    }
  }

  // If explicit steps are provided in the spec, compile them directly
  if (diagram.animation?.steps && diagram.animation.steps.length > 0) {
    const rawSteps = diagram.animation.steps.slice(0, 24);
    let accumAt = 0;
    const frames: Frame[] = [];

    for (const [idx, step] of rawSteps.entries()) {
      const dur = step.duration ?? DEFAULT_FRAME_DURATION;
      const visible =
        step.nodes || step.edges
          ? [...(step.nodes ?? allNodeIds), ...(step.edges ?? allEdgeIds)]
          : allIds;
      const highlight = step.highlight ?? [];
      const packets: AnimationPacket[] = step.packets ?? [];
      const states = { ...initialStates, ...(step.states ?? {}) };
      const counters = { ...initialCounters, ...(step.counters ?? {}) };

      frames.push({
        index: idx,
        at: accumAt,
        duration: dur,
        visible,
        highlight,
        packets,
        states,
        counters,
        caption: step.caption,
      });

      accumAt += dur;
    }

    return frames;
  }

  // Preset generators
  const preset = diagram.animation?.preset ?? "data-flow";
  const frames: Frame[] = [];

  switch (preset) {
    case "request-response": {
      const firstNode = diagram.nodes[0]?.id;
      const lastNode = diagram.nodes[diagram.nodes.length - 1]?.id;
      const middleNodes = diagram.nodes.slice(1, -1).map((n) => n.id);
      const forwardEdges = diagram.edges.filter((_, i) => i % 2 === 0);
      const returnEdges = diagram.edges.filter((_, i) => i % 2 !== 0);

      frames.push({
        index: 0,
        at: 0,
        duration: 800,
        visible: allIds,
        highlight: firstNode ? [firstNode] : [],
        packets: [],
        states: { ...initialStates, ...(firstNode ? { [firstNode]: "active" } : {}) },
        counters: { ...initialCounters },
        caption: "Client prepares and issues the request.",
      });

      frames.push({
        index: 1,
        at: 800,
        duration: 850,
        visible: allIds,
        highlight: forwardEdges.map((e) => e.id),
        packets: forwardEdges.map((e) => ({ edge: e.id })),
        states: { ...initialStates, ...(firstNode ? { [firstNode]: "pending" } : {}) },
        counters: { ...initialCounters },
        caption: "Request transmits across the network.",
      });

      frames.push({
        index: 2,
        at: 1650,
        duration: 900,
        visible: allIds,
        highlight: middleNodes.length > 0 ? middleNodes : lastNode ? [lastNode] : [],
        packets: [],
        states: {
          ...initialStates,
          ...Object.fromEntries(middleNodes.map((id) => [id, "active" as NodeState])),
          ...(lastNode ? { [lastNode]: "active" as NodeState } : {}),
        },
        counters: { ...initialCounters },
        caption: "Services process the request and prepare response payload.",
      });

      frames.push({
        index: 3,
        at: 2550,
        duration: 850,
        visible: allIds,
        highlight:
          returnEdges.length > 0 ? returnEdges.map((e) => e.id) : forwardEdges.map((e) => e.id),
        packets:
          returnEdges.length > 0
            ? returnEdges.map((e) => ({ edge: e.id }))
            : forwardEdges.map((e) => ({ edge: e.id, reverse: true })),
        states: { ...initialStates, ...(firstNode ? { [firstNode]: "pending" } : {}) },
        counters: { ...initialCounters },
        caption: "Response payload returns to caller.",
      });

      frames.push({
        index: 4,
        at: 3400,
        duration: 800,
        visible: allIds,
        highlight: firstNode ? [firstNode] : [],
        packets: [],
        states: {
          ...initialStates,
          ...(firstNode ? { [firstNode]: "success" as NodeState } : {}),
          ...(lastNode ? { [lastNode]: "success" as NodeState } : {}),
        },
        counters: { ...initialCounters },
        caption: "Request completed successfully with response rendered.",
      });
      break;
    }

    case "step-reveal": {
      let accumAt = 0;
      const count = Math.min(diagram.nodes.length, 20);
      for (let i = 0; i < count; i++) {
        const revealedNodes = diagram.nodes.slice(0, i + 1).map((n) => n.id);
        const revealedEdges = diagram.edges
          .filter((e) => revealedNodes.includes(e.from) && revealedNodes.includes(e.to))
          .map((e) => e.id);
        const activeNode = diagram.nodes[i]!;

        frames.push({
          index: i,
          at: accumAt,
          duration: 750,
          visible: [...revealedNodes, ...revealedEdges],
          highlight: [activeNode.id],
          packets: [],
          states: { ...initialStates, [activeNode.id]: "active" },
          counters: { ...initialCounters },
          caption: `Step ${i + 1}: ${activeNode.label}`,
        });
        accumAt += 750;
      }
      break;
    }

    case "parallel":
    case "fan-out-in": {
      const coordinator = diagram.nodes[0]?.id;
      const endNode = diagram.nodes[diagram.nodes.length - 1]?.id;
      const workers = diagram.nodes.slice(1, -1).map((n) => n.id);
      const fanOutEdges = diagram.edges.filter((e) => coordinator && e.from === coordinator);
      const fanInEdges = diagram.edges.filter((e) => endNode && e.to === endNode);

      frames.push({
        index: 0,
        at: 0,
        duration: 800,
        visible: allIds,
        highlight: coordinator ? [coordinator] : [],
        packets: [],
        states: { ...initialStates, ...(coordinator ? { [coordinator]: "active" } : {}) },
        counters: { ...initialCounters },
        caption: "Coordinator initiates parallel tasks.",
      });

      frames.push({
        index: 1,
        at: 800,
        duration: 850,
        visible: allIds,
        highlight: fanOutEdges.map((e) => e.id),
        packets: fanOutEdges.map((e) => ({ edge: e.id })),
        states: { ...initialStates, ...(coordinator ? { [coordinator]: "pending" } : {}) },
        counters: { ...initialCounters },
        caption: "Fan-out: tasks dispatched concurrently to workers.",
      });

      frames.push({
        index: 2,
        at: 1650,
        duration: 900,
        visible: allIds,
        highlight: workers,
        packets: [],
        states: {
          ...initialStates,
          ...Object.fromEntries(workers.map((w) => [w, "active" as NodeState])),
        },
        counters: { ...initialCounters },
        caption: "Worker nodes execute tasks in parallel.",
      });

      frames.push({
        index: 3,
        at: 2550,
        duration: 850,
        visible: allIds,
        highlight: fanInEdges.map((e) => e.id),
        packets: fanInEdges.map((e) => ({ edge: e.id })),
        states: {
          ...initialStates,
          ...Object.fromEntries(workers.map((w) => [w, "success" as NodeState])),
          ...(endNode ? { [endNode]: "pending" as NodeState } : {}),
        },
        counters: { ...initialCounters },
        caption: "Fan-in: worker outputs stream to merge junction.",
      });

      frames.push({
        index: 4,
        at: 3400,
        duration: 800,
        visible: allIds,
        highlight: endNode ? [endNode] : [],
        packets: [],
        states: { ...initialStates, ...(endNode ? { [endNode]: "success" as NodeState } : {}) },
        counters: { ...initialCounters },
        caption: "Parallel execution joined and completed.",
      });
      break;
    }

    case "decision-branch": {
      const decisionNode =
        diagram.nodes.find(
          (n) => n.kind === "decision" || n.kind === "branch" || n.kind === "condition",
        ) ?? diagram.nodes[0];
      const incomingEdges = diagram.edges.filter((e) => decisionNode && e.to === decisionNode.id);
      const outgoingEdges = diagram.edges.filter((e) => decisionNode && e.from === decisionNode.id);
      const primaryBranch = outgoingEdges[0] ?? diagram.edges[0];

      frames.push({
        index: 0,
        at: 0,
        duration: 800,
        visible: allIds,
        highlight: incomingEdges.map((e) => e.id),
        packets: incomingEdges.map((e) => ({ edge: e.id })),
        states: { ...initialStates },
        counters: { ...initialCounters },
        caption: "Incoming evaluation payload arrives.",
      });

      frames.push({
        index: 1,
        at: 800,
        duration: 850,
        visible: allIds,
        highlight: decisionNode ? [decisionNode.id] : [],
        packets: [],
        states: {
          ...initialStates,
          ...(decisionNode ? { [decisionNode.id]: "active" as NodeState } : {}),
        },
        counters: { ...initialCounters },
        caption: `Evaluating decision criteria at ${decisionNode?.label ?? "gateway"}.`,
      });

      frames.push({
        index: 2,
        at: 1650,
        duration: 850,
        visible: allIds,
        highlight: primaryBranch ? [primaryBranch.id] : [],
        packets: primaryBranch ? [{ edge: primaryBranch.id }] : [],
        states: {
          ...initialStates,
          ...(decisionNode ? { [decisionNode.id]: "success" as NodeState } : {}),
        },
        counters: { ...initialCounters },
        caption: `Criteria satisfied: taking ${primaryBranch?.label ?? "approved branch"}.`,
      });

      frames.push({
        index: 3,
        at: 2500,
        duration: 800,
        visible: allIds,
        highlight: primaryBranch ? [primaryBranch.to] : [],
        packets: [],
        states: {
          ...initialStates,
          ...(primaryBranch ? { [primaryBranch.to]: "success" as NodeState } : {}),
        },
        counters: { ...initialCounters },
        caption: "Target branch executed outcome successfully.",
      });
      break;
    }

    case "retry-failure": {
      const sourceNode = diagram.nodes[0]?.id;
      const targetNode = diagram.nodes[1]?.id ?? sourceNode;
      const mainEdge = diagram.edges[0]?.id;
      const retryEdge =
        diagram.edges.find((e) => targetNode && e.from === targetNode)?.id ?? mainEdge;

      frames.push({
        index: 0,
        at: 0,
        duration: 800,
        visible: allIds,
        highlight: mainEdge ? [mainEdge] : [],
        packets: mainEdge ? [{ edge: mainEdge }] : [],
        states: {
          ...initialStates,
          ...(sourceNode ? { [sourceNode]: "active" as NodeState } : {}),
        },
        counters: { ...initialCounters },
        caption: "Dispatching initial operation.",
      });

      frames.push({
        index: 1,
        at: 800,
        duration: 850,
        visible: allIds,
        highlight: targetNode ? [targetNode] : [],
        packets: [],
        states: {
          ...initialStates,
          ...(targetNode ? { [targetNode]: "error" as NodeState } : {}),
        },
        counters: { ...initialCounters, ...(targetNode ? { [targetNode]: 1 } : {}) },
        caption: "Service encountered transient failure (attempt 1).",
      });

      frames.push({
        index: 2,
        at: 1650,
        duration: 850,
        visible: allIds,
        highlight: retryEdge ? [retryEdge] : [],
        packets: retryEdge ? [{ edge: retryEdge }] : [],
        states: {
          ...initialStates,
          ...(targetNode ? { [targetNode]: "warning" as NodeState } : {}),
        },
        counters: { ...initialCounters, ...(targetNode ? { [targetNode]: 2 } : {}) },
        caption: "Retry policy triggered: re-issuing request with backoff.",
      });

      frames.push({
        index: 3,
        at: 2500,
        duration: 850,
        visible: allIds,
        highlight: targetNode ? [targetNode] : [],
        packets: [],
        states: {
          ...initialStates,
          ...(targetNode ? { [targetNode]: "success" as NodeState } : {}),
        },
        counters: { ...initialCounters, ...(targetNode ? { [targetNode]: 2 } : {}) },
        caption: "Retry recovered and succeeded on second attempt.",
      });
      break;
    }

    case "loop": {
      const loopNode = diagram.nodes.find((n) => n.kind === "loop") ?? diagram.nodes[0];
      const otherNodes = diagram.nodes.filter((n) => n.id !== loopNode?.id).map((n) => n.id);

      frames.push({
        index: 0,
        at: 0,
        duration: 750,
        visible: allIds,
        highlight: loopNode ? [loopNode.id] : [],
        packets: [],
        states: { ...initialStates, ...(loopNode ? { [loopNode.id]: "active" as NodeState } : {}) },
        counters: { ...initialCounters, ...(loopNode ? { [loopNode.id]: 1 } : {}) },
        caption: "Loop initialized: iteration 1.",
      });

      frames.push({
        index: 1,
        at: 750,
        duration: 750,
        visible: allIds,
        highlight: otherNodes,
        packets: diagram.edges.slice(0, 1).map((e) => ({ edge: e.id })),
        states: {
          ...initialStates,
          ...Object.fromEntries(otherNodes.map((id) => [id, "active" as NodeState])),
        },
        counters: { ...initialCounters, ...(loopNode ? { [loopNode.id]: 1 } : {}) },
        caption: "Processing iteration 1 payload.",
      });

      frames.push({
        index: 2,
        at: 1500,
        duration: 750,
        visible: allIds,
        highlight: loopNode ? [loopNode.id] : [],
        packets: diagram.edges.slice(-1).map((e) => ({ edge: e.id })),
        states: { ...initialStates, ...(loopNode ? { [loopNode.id]: "active" as NodeState } : {}) },
        counters: { ...initialCounters, ...(loopNode ? { [loopNode.id]: 2 } : {}) },
        caption: "Condition re-evaluated: starting iteration 2.",
      });

      frames.push({
        index: 3,
        at: 2250,
        duration: 800,
        visible: allIds,
        highlight: allNodeIds,
        packets: [],
        states: {
          ...initialStates,
          ...Object.fromEntries(allNodeIds.map((id) => [id, "success" as NodeState])),
        },
        counters: { ...initialCounters, ...(loopNode ? { [loopNode.id]: 2 } : {}) },
        caption: "Terminal condition reached: loop exited cleanly.",
      });
      break;
    }

    case "progress": {
      const metricNodes = diagram.nodes.filter((n) => n.metric !== undefined);
      const steps = [0, 25, 50, 75, 100];
      let accumAt = 0;

      for (const [idx, pct] of steps.entries()) {
        const counters: Record<string, number> = { ...initialCounters };
        for (const mn of metricNodes) {
          const baseVal = mn.metric?.value ?? 100;
          counters[mn.id] = Math.round((baseVal * pct) / 100);
        }

        frames.push({
          index: idx,
          at: accumAt,
          duration: 700,
          visible: allIds,
          highlight: metricNodes.map((n) => n.id),
          packets: [],
          states: {
            ...initialStates,
            ...Object.fromEntries(
              metricNodes.map((n) => [n.id, pct === 100 ? "success" : "active"]),
            ),
          },
          counters,
          caption: `Progress status: ${pct}% complete.`,
        });
        accumAt += 700;
      }
      break;
    }

    case "timeline": {
      let accumAt = 0;
      const count = Math.min(diagram.nodes.length, 12);
      for (let i = 0; i < count; i++) {
        const node = diagram.nodes[i]!;
        frames.push({
          index: i,
          at: accumAt,
          duration: 800,
          visible: allIds,
          highlight: [node.id],
          packets: [],
          states: {
            ...initialStates,
            ...Object.fromEntries(
              diagram.nodes.slice(0, i).map((n) => [n.id, "success" as NodeState]),
            ),
            [node.id]: "active",
          },
          counters: { ...initialCounters },
          caption: `Milestone ${i + 1}: ${node.label}`,
        });
        accumAt += 800;
      }
      break;
    }

    case "state-transition": {
      const targetNodes = diagram.nodes.map((n) => n.id);
      const sequence: { state: NodeState; caption: string }[] = [
        { state: "idle", caption: "Initial idle state." },
        { state: "pending", caption: "Transitioning to pending approval." },
        { state: "active", caption: "System processing in active state." },
        { state: "success", caption: "Transition confirmed with success state." },
      ];

      let accumAt = 0;
      for (const [idx, item] of sequence.entries()) {
        frames.push({
          index: idx,
          at: accumAt,
          duration: 800,
          visible: allIds,
          highlight: targetNodes,
          packets: [],
          states: Object.fromEntries(targetNodes.map((id) => [id, item.state])),
          counters: { ...initialCounters },
          caption: item.caption,
        });
        accumAt += 800;
      }
      break;
    }

    case "highlight": {
      let accumAt = 0;
      const count = Math.min(diagram.nodes.length, 12);
      for (let i = 0; i < count; i++) {
        const node = diagram.nodes[i]!;
        frames.push({
          index: i,
          at: accumAt,
          duration: 750,
          visible: allIds,
          highlight: [node.id],
          packets: [],
          states: { ...initialStates, [node.id]: "selected" },
          counters: { ...initialCounters },
          caption: `Inspecting ${node.label} (${node.kind}).`,
        });
        accumAt += 750;
      }
      break;
    }

    case "pulse":
    case "expand":
    case "cycle": {
      const focused = diagram.nodes[0];
      frames.push({ index: 0, at: 0, duration: 900, visible: allIds, highlight: focused ? [focused.id] : [], packets: [], states: initialStates, counters: initialCounters, caption: focused ? `${diagram.animation?.preset} emphasis on ${focused.label}.` : `${diagram.animation?.preset} emphasis.` });
      frames.push({ index: 1, at: 900, duration: 900, visible: allIds, highlight: focused ? [focused.id] : allNodeIds, packets: diagram.animation?.preset === "cycle" && diagram.edges[0] ? [{ edge: diagram.edges[0].id }] : [], states: focused ? { ...initialStates, [focused.id]: "active" } : initialStates, counters: initialCounters, caption: `${diagram.animation?.preset} emphasis settles into the diagram.` });
      break;
    }

    case "data-flow":
    default: {
      if (diagram.edges.length === 0) {
        frames.push({
          index: 0,
          at: 0,
          duration: 1000,
          visible: allIds,
          highlight: allNodeIds,
          packets: [],
          states: initialStates,
          counters: initialCounters,
          caption: "Data state ready.",
        });
      } else {
        let accumAt = 0;
        const count = Math.min(diagram.edges.length, 16);
        for (let i = 0; i < count; i++) {
          const edge = diagram.edges[i]!;
          frames.push({
            index: i,
            at: accumAt,
            duration: 800,
            visible: allIds,
            highlight: [edge.id, edge.from, edge.to],
            packets: [{ edge: edge.id }],
            states: {
              ...initialStates,
              [edge.from]: "active",
              [edge.to]: "pending",
            },
            counters: { ...initialCounters },
            caption: `Flowing data along ${edge.label ?? edge.id} to ${edge.to}.`,
          });
          accumAt += 800;
        }

        // Final frame: all success
        frames.push({
          index: count,
          at: accumAt,
          duration: 800,
          visible: allIds,
          highlight: [],
          packets: [],
          states: Object.fromEntries(allNodeIds.map((id) => [id, "success" as NodeState])),
          counters: initialCounters,
          caption: "Data pipeline execution completed.",
        });
      }
      break;
    }
  }

  // Ensure deterministic <= 24 frames
  const cappedFrames = frames.slice(0, 24);
  // Re-index frames cleanly
  for (let i = 0; i < cappedFrames.length; i++) {
    cappedFrames[i]!.index = i;
  }

  return cappedFrames;
}
