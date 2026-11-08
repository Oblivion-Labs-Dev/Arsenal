import type { DiagramSpec, NodeKind } from "../schema.js";

const node = (
  id: string,
  kind: NodeKind,
  label: string,
  role: string,
  inputs: string[],
  outputs: string[],
  evidence: string,
) => ({ id, kind, label, role, inputs, outputs, evidence, tone: "violet" as const });

const oneNode = (id: string, kind: NodeKind, label: string): DiagramSpec => ({
  schemaVersion: "1.0",
  id: `state-${id}`,
  title: `${label} states`,
  summary: `State previews for the ${label.toLowerCase()} node family.`,
  illustrative: true,
  nodes: [node("focus", kind, label, "State preview", ["incoming work"], ["updated state"], "State sequence authored for this showcase.")],
  animation: {
    preset: "state-transition",
    loop: false,
    steps: [
      { caption: `${label} is ready.`, states: { focus: "idle" } },
      { caption: `${label} is active.`, states: { focus: "active" } },
      { caption: `${label} encountered an error.`, states: { focus: "error" } },
      { caption: `${label} is complete.`, states: { focus: "success" }, complete: true },
    ],
  },
});

export const COMPONENT_STATE_SPECS = [
  oneNode("process", "process", "Process"),
  oneNode("data", "data", "Data"),
  oneNode("agent", "agent", "Agent"),
  oneNode("people", "person", "Person"),
  oneNode("decision", "decision", "Decision"),
  oneNode("money", "money", "Money"),
  oneNode("growth", "growth", "Growth"),
  oneNode("goal", "goal", "Goal"),
  oneNode("timeline", "timeline", "Timeline"),
  oneNode("launch", "launch", "Launch"),
  oneNode("science-technology", "science", "Science"),
  oneNode("technology", "technology", "Technology"),
  oneNode("status", "success", "Status"),
  oneNode("progress", "progress-ring", "Progress"),
  {
    schemaVersion: "1.0",
    id: "state-group",
    title: "Group states",
    summary: "State previews for a node inside a group container.",
    illustrative: true,
    groups: [{ id: "container", label: "Group container", kind: "group" }],
    nodes: [{ ...node("focus", "process", "Grouped process", "Contained work", ["incoming work"], ["updated state"], "Group preview."), group: "container" }],
    animation: { preset: "state-transition", loop: false, steps: [
      { caption: "The grouped process is ready.", states: { focus: "idle" } },
      { caption: "The grouped process is active.", states: { focus: "active" } },
      { caption: "The grouped process encountered an error.", states: { focus: "error" } },
      { caption: "The grouped process is complete.", states: { focus: "success" }, complete: true },
    ] },
  },
] satisfies DiagramSpec[];

const connector = (
  id: string,
  label: string,
  edge: Omit<NonNullable<DiagramSpec["edges"]>[number], "id" | "from" | "to">,
): DiagramSpec => {
  const branching = id === "branch";
  const edgeOptions: Array<Omit<NonNullable<DiagramSpec["edges"]>[number], "id" | "from" | "to"> & { from?: string; to?: string }> = id === "parallel"
    ? [edge, { style: "curved" as const, kind: "parallel" as const, label: "second lane" }]
    : branching
      ? [{ ...edge, label: "yes" }, { from: "from", to: "alternate", style: "curved" as const, kind: "branch" as const, label: "no" }]
      : [edge];
  const edges = edgeOptions.map((item, index) => ({ ...item, id: `link-${index + 1}`, from: item.from ?? "from", to: item.to ?? "to" }));
  return {
    schemaVersion: "1.0",
    id: `connector-${id}`,
    title: label,
    summary: `${label} connector preview.`,
    illustrative: true,
    nodes: [
      node("from", "process", "Source", "Connector origin", ["request"], ["signal"], "Static connector demonstration."),
      node("to", "service", "Target", "Connector destination", ["signal"], ["result"], "Static connector demonstration."),
      ...(branching ? [node("alternate", "service", "Alternative", "Other route", ["signal"], ["result"], "Static connector demonstration.")] : []),
    ],
    edges,
    animation: { preset: "data-flow", loop: false, steps: [{ caption: `${label} carries a signal from source to target.`, packets: edges.map(({ id: edgeId }) => ({ edge: edgeId })) }] },
  };
};

export const CONNECTOR_SPECS = [
  connector("straight", "Straight", { style: "straight" }),
  connector("curved", "Curved", { style: "curved" }),
  connector("dashed", "Dashed", { style: "curved", dashed: true }),
  connector("bidirectional", "Bidirectional", { style: "straight", bidirectional: true }),
  connector("parallel", "Parallel", { style: "curved", kind: "parallel" }),
  connector("branch", "Branch", { style: "curved", kind: "branch", label: "yes" }),
  connector("conditional", "Conditional", { style: "curved", kind: "conditional", condition: "ready" }),
  connector("feedback", "Feedback", { style: "curved", kind: "feedback", label: "retry" }),
] satisfies DiagramSpec[];

export const EXAMPLE_DIAGRAMS = {
  dataPipeline: {
    schemaVersion: "1.0", id: "showcase-data-pipeline", title: "A small data pipeline", summary: "Sample records move through cleanup and into a report.", illustrative: true, topic: "general",
    nodes: [
      node("source", "database", "Source records", "Input dataset", ["sample rows"], ["raw records"], "Made-up sample data for demonstration."),
      node("clean", "process", "Clean fields", "Normalization step", ["raw records"], ["clean records"], "Illustrative cleanup stage."),
      node("report", "document", "Build report", "Output document", ["clean records"], ["summary"], "Illustrative output."),
    ],
    edges: [{ id: "e-source-clean", from: "source", to: "clean", label: "raw" }, { id: "e-clean-report", from: "clean", to: "report", label: "clean" }],
    animation: { preset: "data-flow", loop: false, steps: [{ caption: "Read the sample records." }, { caption: "Clean and normalize the fields.", packets: [{ edge: "e-source-clean" }] }, { caption: "Use the cleaned records to build a report.", packets: [{ edge: "e-clean-report" }], complete: true }] },
  },
  aiAgentWorkflow: {
    schemaVersion: "1.0", id: "showcase-agent-workflow", title: "An AI agent workflow", summary: "A fictional agent gathers context, uses a tool, then drafts an answer.", illustrative: true, topic: "ai-tech",
    nodes: [
      node("question", "user", "Question", "User request", ["prompt"], ["task"], "Fictional request."),
      node("agent", "agent", "Research agent", "Planner and synthesizer", ["task", "context"], ["tool call", "draft"], "Fictional agent workflow."),
      node("search", "tool", "Search tool", "Retrieval tool", ["query"], ["sources"], "Example tool output, not live research."),
      node("answer", "document", "Draft answer", "Generated response", ["draft", "sources"], ["response"], "Fictional response."),
    ],
    edges: [{ id: "e-question-agent", from: "question", to: "agent" }, { id: "e-agent-search", from: "agent", to: "search", kind: "conditional", condition: "needs context" }, { id: "e-search-agent", from: "search", to: "agent", kind: "feedback", label: "sources" }, { id: "e-agent-answer", from: "agent", to: "answer" }],
    animation: { preset: "data-flow", loop: false, steps: [{ caption: "The agent receives the question and plans a response." }, { caption: "It requests context from a search tool.", packets: [{ edge: "e-agent-search" }] }, { caption: "The tool returns sample sources to the agent.", packets: [{ edge: "e-search-agent" }] }, { caption: "The agent drafts an answer from the request and context.", packets: [{ edge: "e-agent-answer" }], complete: true }] },
  },
  decisionTree: {
    schemaVersion: "1.0", id: "showcase-decision-tree", title: "A decision tree", summary: "A sample request follows the approved path; alternatives remain visible.", illustrative: true,
    nodes: [node("request", "data", "Request", "Incoming sample", ["request"], ["criteria"], "Made-up decision input."), node("gate", "decision", "Meets criteria?", "Decision point", ["criteria"], ["route"], "Fictional rules for the example."), node("approved", "success", "Continue", "Taken outcome", ["approved route"], ["next step"], "Illustrative outcome."), node("review", "process", "Manual review", "Alternative outcome", ["review route"], ["human decision"], "Illustrative alternative.")],
    edges: [{ id: "e-request-gate", from: "request", to: "gate" }, { id: "e-approved", from: "gate", to: "approved", kind: "branch", label: "yes" }, { id: "e-review", from: "gate", to: "review", kind: "branch", label: "no" }],
    animation: { preset: "decision-branch", loop: false, steps: [{ caption: "Evaluate the fictional request against sample criteria." }, { caption: "The criteria pass, so the request continues.", branch: { from: "gate", take: "e-approved" }, packets: [{ edge: "e-approved" }] }] },
  },
  conditionalLoop: {
    schemaVersion: "1.0", id: "showcase-conditional-loop", title: "A conditional loop", summary: "A fictional review repeats until its quality check passes.", illustrative: true,
    nodes: [node("draft", "document", "Draft", "Working document", ["idea"], ["draft"], "Fictional draft."), node("review", "loop", "Quality check", "Loop condition", ["draft"], ["pass or revise"], "Example condition, not a real score."), node("revise", "process", "Revise", "Iteration step", ["feedback"], ["updated draft"], "Fictional revision."), node("ready", "success", "Ready", "Terminal state", ["approved draft"], ["final"], "Illustrative completion.")],
    edges: [{ id: "e-draft-review", from: "draft", to: "review" }, { id: "e-review-revise", from: "review", to: "revise", kind: "conditional", condition: "needs edits" }, { id: "e-revise-review", from: "revise", to: "review", kind: "feedback", label: "again" }, { id: "e-review-ready", from: "review", to: "ready", kind: "branch", label: "passes" }],
    animation: { preset: "loop", loop: false, steps: [{ caption: "Start a sample review cycle." }, { caption: "The check requests one more revision.", loop: { edge: "e-revise-review", times: 2 } }, { caption: "The final check passes and the loop ends.", branch: { from: "review", take: "e-review-ready" }, complete: true }] },
  },
  stockResearch: {
    schemaVersion: "1.0", id: "showcase-stock-research", title: "Stock research, at a glance", summary: "A teaching example connecting a company, sample metrics and a research note.", illustrative: true, topic: "finance",
    nodes: [node("company", "business", "Northstar Foods", "Fictional company", ["company profile"], ["sample financials"], "Company and figures are invented."), node("metrics", "metric", "Sample metrics", "Illustrative financial inputs", ["revenue", "margin"], ["comparison"], "No live market data is used."), node("analyst", "agent", "Research desk", "Analytical role", ["metrics", "risks"], ["questions"], "Teaching example only."), node("memo", "document", "Research note", "Written output", ["questions"], ["next questions"], "Not investment advice or factual research.")],
    edges: [{ id: "e-company-metrics", from: "company", to: "metrics" }, { id: "e-metrics-analyst", from: "metrics", to: "analyst" }, { id: "e-analyst-memo", from: "analyst", to: "memo" }],
    animation: { preset: "data-flow", loop: false, steps: [{ caption: "Begin with a fictional company profile." }, { caption: "Review invented metrics alongside risks.", packets: [{ edge: "e-company-metrics" }, { edge: "e-metrics-analyst" }] }, { caption: "Capture questions in a research note.", packets: [{ edge: "e-analyst-memo" }], complete: true }] },
  },
  storyConnection: {
    schemaVersion: "1.0", id: "showcase-story-connection", title: "Connecting a story", summary: "Fictional people and an organization meet around a sample event.", illustrative: true, topic: "business",
    nodes: [node("reporter", "person", "Reporter", "Story observer", ["public context"], ["question"], "Fictional person."), node("team", "team", "Product team", "Group of people", ["organization"], ["announcement"], "Fictional team."), node("org", "organization", "Cedar Works", "Fictional organization", ["team"], ["event"], "Fictional organization."), node("event", "launch", "Pilot begins", "Sample milestone", ["announcement"], ["story thread"], "Made-up event, not a reported fact.")],
    edges: [{ id: "e-team-org", from: "team", to: "org", label: "part of" }, { id: "e-org-event", from: "org", to: "event", label: "announces" }, { id: "e-reporter-event", from: "reporter", to: "event", label: "follows" }],
    animation: { preset: "data-flow", loop: false, steps: [{ caption: "Meet the fictional team and organization." }, { caption: "A made-up pilot connects the people around the story.", packets: [{ edge: "e-team-org" }, { edge: "e-org-event" }, { edge: "e-reporter-event" }], complete: true }] },
  },
  timeline: {
    schemaVersion: "1.0", id: "showcase-timeline", title: "A sample project timeline", summary: "Three fictional milestones, from idea to release.", illustrative: true,
    nodes: [node("idea", "timeline", "Idea", "First milestone", ["need"], ["concept"], "Fictional milestone."), node("prototype", "timeline", "Prototype", "Middle milestone", ["concept"], ["test"], "Fictional milestone."), node("release", "timeline", "Release", "Final milestone", ["test"], ["launch"], "Fictional milestone.")],
    edges: [{ id: "e-idea-prototype", from: "idea", to: "prototype", label: "then" }, { id: "e-prototype-release", from: "prototype", to: "release", label: "then" }],
    animation: { preset: "timeline", loop: false, steps: [{ caption: "Read the illustrative milestones in order." }, { caption: "A concept becomes a prototype.", packets: [{ edge: "e-idea-prototype" }] }, { caption: "The prototype reaches a sample release.", packets: [{ edge: "e-prototype-release" }], complete: true }] },
  },
} satisfies Record<string, DiagramSpec>;

const recipe = (
  id: string,
  title: string,
  explanation: string,
  entries: readonly [string, NodeKind, string, NodeKind, string][],
): DiagramSpec => ({
  schemaVersion: "1.0", id: `recipe-${id}`, title, summary: explanation, illustrative: true,
  nodes: entries.map(([nodeId, beforeKind, beforeLabel]) => node(nodeId, beforeKind, beforeLabel, "Transformation input", ["starting form"], ["changed form"], explanation)),
  edges: entries.slice(1).map((entry, index) => ({ id: `e-${entries[index]![0]}-${entry[0]}`, from: entries[index]![0], to: entry[0] })),
  animation: { preset: "state-transition", loop: false, steps: entries.map(([nodeId, , , afterKind, afterLabel], index) => ({ caption: index === 0 ? explanation : `${afterLabel} takes shape.`, transform: [{ node: nodeId, kind: afterKind, label: afterLabel }], highlight: [nodeId] })) },
});

export const TRANSFORMATION_RECIPES = [
  recipe("data-cleaning", "Raw data to clean data", "The same data node changes after normalization rules run.", [["data", "data", "Raw data", "data", "Clean data"]]),
  recipe("idea-launch", "Idea to launch", "An early idea moves through a prototype into a launch-ready product.", [["idea", "general", "Idea", "process", "Prototype"], ["prototype", "process", "Prototype", "launch", "Launch"]]),
  recipe("research-answer", "Question to answer", "Research turns an open question into a supported answer.", [["question", "user", "Question", "agent", "Research"], ["answer", "agent", "Research", "document", "Answer"]]),
  recipe("money-growth", "Investment to growth", "A fictional investment is transformed into a growth milestone.", [["capital", "money", "Investment", "finance", "Allocation"], ["outcome", "finance", "Allocation", "growth", "Growth"]]),
] satisfies DiagramSpec[];

export const STRESS_SPECS = [
  oneNode("stress-process", "process", "Process"),
  oneNode("stress-agent", "agent", "Agent"),
  oneNode("stress-data", "data", "Data"),
  oneNode("stress-decision", "decision", "Decision"),
  oneNode("stress-growth", "growth", "Growth"),
  oneNode("stress-timeline", "timeline", "Timeline"),
] satisfies DiagramSpec[];

export const ALL_SHOWCASE_SPECS = [
  ...COMPONENT_STATE_SPECS,
  ...CONNECTOR_SPECS,
  ...Object.values(EXAMPLE_DIAGRAMS),
  ...TRANSFORMATION_RECIPES,
  ...STRESS_SPECS,
];
