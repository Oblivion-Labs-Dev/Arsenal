import type { DiagramSpec } from "../index.js";

// ---------------------------------------------------------------------------
// 1. Nodes: every kind in NODE_KINDS grouped by catalog family (<= 8 nodes each)
// ---------------------------------------------------------------------------

/** Architecture & Core Node Family (8 kinds) */
export const nodesArchitectureSpec: DiagramSpec = {
  schemaVersion: "1.0",
  id: "nodes-architecture",
  title: "Core Architecture Nodes",
  summary: "Foundational actors, runtimes, documents, and infrastructure entities",
  layout: "horizontal",
  theme: "auto",
  nodes: [
    { id: "arch-proc", kind: "process", label: "Process", meta: "Task runner" },
    { id: "arch-agent", kind: "agent", label: "AI Agent", meta: "Autonomous planner" },
    { id: "arch-user", kind: "user", label: "User", meta: "Client actor" },
    { id: "arch-sys", kind: "system", label: "System", meta: "Host environment" },
    { id: "arch-svc", kind: "service", label: "Service", meta: "Backend worker" },
    { id: "arch-tool", kind: "tool", label: "Tool", meta: "Integrated utility" },
    { id: "arch-doc", kind: "document", label: "Document", meta: "Structured file" },
    { id: "arch-cloud", kind: "cloud", label: "Cloud", meta: "Global infra" },
  ],
  edges: [
    { id: "e-arch-1", from: "arch-user", to: "arch-agent", label: "Instruct" },
    { id: "e-arch-2", from: "arch-agent", to: "arch-svc", label: "Dispatch" },
    { id: "e-arch-3", from: "arch-svc", to: "arch-cloud", label: "Deploy" },
  ],
};

/** Logic Family: Decision & Branching (5 kinds) */
export const nodesLogicBranchingSpec: DiagramSpec = {
  schemaVersion: "1.0",
  id: "nodes-logic-branching",
  title: "Logic: Decisions & Flow",
  summary: "Conditional branching, decision diamond gates, and iterative control loops",
  layout: "horizontal",
  theme: "auto",
  nodes: [
    { id: "logic-dec", kind: "decision", label: "Decision", meta: "Multi-path gate" },
    { id: "logic-br", kind: "branch", label: "Branch", meta: "Fork condition" },
    { id: "logic-cond", kind: "condition", label: "Condition", meta: "Boolean check" },
    { id: "logic-loop", kind: "loop", label: "Loop", meta: "Iterative batch" },
    { id: "logic-retry", kind: "retry", label: "Retry", meta: "Exponential backoff" },
  ],
  edges: [
    { id: "e-lb-1", from: "logic-dec", to: "logic-br", label: "Evaluate" },
    { id: "e-lb-2", from: "logic-br", to: "logic-cond", label: "Test" },
    { id: "e-lb-3", from: "logic-cond", to: "logic-loop", label: "Repeat" },
    { id: "e-lb-4", from: "logic-loop", to: "logic-retry", label: "On fail", dashed: true },
  ],
};

/** Logic Family: Concurrency & Outcomes (4 kinds) */
export const nodesLogicOutcomesSpec: DiagramSpec = {
  schemaVersion: "1.0",
  id: "nodes-logic-outcomes",
  title: "Logic: Concurrency & Status",
  summary: "Scatter-gather concurrency junctions and terminal state representations",
  layout: "horizontal",
  theme: "auto",
  nodes: [
    { id: "logic-par", kind: "parallel", label: "Parallel", meta: "Fan-out split" },
    { id: "logic-mrg", kind: "merge", label: "Merge", meta: "Fan-in join" },
    { id: "logic-succ", kind: "success", label: "Success", meta: "Completed OK" },
    { id: "logic-fail", kind: "fail", label: "Failure", meta: "Terminal abort" },
  ],
  edges: [
    { id: "e-lo-1", from: "logic-par", to: "logic-mrg", label: "Sync" },
    { id: "e-lo-2", from: "logic-mrg", to: "logic-succ", label: "Valid" },
    { id: "e-lo-3", from: "logic-mrg", to: "logic-fail", label: "Invalid", dashed: true },
  ],
};

/** Data Family (8 kinds) */
export const nodesDataSpec: DiagramSpec = {
  schemaVersion: "1.0",
  id: "nodes-data",
  title: "Data & Storage Nodes",
  summary: "Payloads, persistence layers, streaming brokers, and index stores",
  layout: "horizontal",
  theme: "auto",
  nodes: [
    { id: "data-db", kind: "database", label: "Database", meta: "Relational store" },
    { id: "data-payload", kind: "data", label: "Data Packet", meta: "JSON schema" },
    { id: "data-media", kind: "media", label: "Media", meta: "Audio/Video asset" },
    { id: "data-know", kind: "knowledge", label: "Knowledge", meta: "Vector embeddings" },
    { id: "data-code", kind: "code", label: "Code", meta: "Routine / Script" },
    { id: "data-api", kind: "api", label: "API Gateway", meta: "REST / gRPC" },
    { id: "data-q", kind: "queue", label: "Message Queue", meta: "Pub/Sub bus" },
    { id: "data-cache", kind: "cache", label: "Fast Cache", meta: "In-memory LRU" },
  ],
  edges: [
    { id: "e-dat-1", from: "data-api", to: "data-q", label: "Enqueue" },
    { id: "e-dat-2", from: "data-q", to: "data-cache", label: "Cache" },
    { id: "e-dat-3", from: "data-cache", to: "data-db", label: "Persist" },
  ],
};

/** Domain Specialization Nodes (6 kinds) */
export const nodesDomainSpec: DiagramSpec = {
  schemaVersion: "1.0",
  id: "nodes-domain",
  title: "Domain Intelligence Nodes",
  summary: "Specialized enterprise, scientific, financial, and reasoning disciplines",
  layout: "horizontal",
  theme: "auto",
  nodes: [
    { id: "dom-ai", kind: "ai", label: "AI Engine", meta: "Inference core" },
    { id: "dom-fin", kind: "finance", label: "Finance", meta: "Ledger / Ledger balances" },
    { id: "dom-sci", kind: "science", label: "Science", meta: "Empirical discovery" },
    { id: "dom-hlth", kind: "health", label: "Health", meta: "Vitals monitoring" },
    { id: "dom-learn", kind: "learning", label: "Learning", meta: "Knowledge consolidation" },
    { id: "dom-biz", kind: "business", label: "Business", meta: "Workflow metrics" },
  ],
  edges: [
    { id: "e-dom-1", from: "dom-ai", to: "dom-fin", label: "Audit" },
    { id: "e-dom-2", from: "dom-ai", to: "dom-sci", label: "Simulate" },
    { id: "e-dom-3", from: "dom-ai", to: "dom-learn", label: "Feedback" },
  ],
};

/** Progress & Measurement Family (6 kinds) */
export const nodesProgressSpec: DiagramSpec = {
  schemaVersion: "1.0",
  id: "nodes-progress",
  title: "Progress & Metric Cards",
  summary: "Visual gauges, milestones, meters, and quantitative telemetry chips",
  layout: "horizontal",
  theme: "auto",
  nodes: [
    {
      id: "prog-ring",
      kind: "progress-ring",
      label: "Progress Ring",
      metric: { value: 72, unit: "%", label: "Completed" },
    },
    {
      id: "prog-bar",
      kind: "progress-bar",
      label: "Progress Bar",
      metric: { value: 50, unit: "MB", label: "Buffered" },
    },
    {
      id: "prog-gauge",
      kind: "gauge",
      label: "Load Gauge",
      metric: { value: 88, unit: "psi", label: "Pressure" },
    },
    {
      id: "prog-counter",
      kind: "counter",
      label: "Event Counter",
      metric: { value: 2450, unit: "events", label: "Counted" },
    },
    {
      id: "prog-time",
      kind: "timeline",
      label: "Milestone",
      metric: { value: 3, unit: "step", label: "Phase" },
    },
    {
      id: "prog-met",
      kind: "metric",
      label: "Latency Metric",
      metric: { value: 12, unit: "ms", label: "p95 latency" },
    },
  ],
  edges: [
    { id: "e-p-1", from: "prog-ring", to: "prog-bar", label: "Transfer" },
    { id: "e-p-2", from: "prog-gauge", to: "prog-counter", label: "Record" },
  ],
};

// ---------------------------------------------------------------------------
// 2. States: every NODE_STATES value on the same node kind
// ---------------------------------------------------------------------------

export const statesOverviewSpec: DiagramSpec = {
  schemaVersion: "1.0",
  id: "states-overview",
  title: "All Eight Node States",
  summary: "A single node kind rendered in each canonical lifecycle state",
  layout: "horizontal",
  theme: "auto",
  nodes: [
    { id: "st-idle", kind: "process", label: "Idle State", state: "idle", meta: "Awaiting input" },
    {
      id: "st-active",
      kind: "process",
      label: "Active State",
      state: "active",
      meta: "Executing work",
    },
    {
      id: "st-success",
      kind: "process",
      label: "Success State",
      state: "success",
      meta: "Completed ok",
    },
    {
      id: "st-warning",
      kind: "process",
      label: "Warning State",
      state: "warning",
      meta: "Degraded output",
    },
    {
      id: "st-error",
      kind: "process",
      label: "Error State",
      state: "error",
      meta: "Unhandled failure",
    },
    {
      id: "st-pending",
      kind: "process",
      label: "Pending State",
      state: "pending",
      meta: "Queued for run",
    },
    {
      id: "st-disabled",
      kind: "process",
      label: "Disabled State",
      state: "disabled",
      meta: "Turned off",
    },
    {
      id: "st-selected",
      kind: "process",
      label: "Selected State",
      state: "selected",
      meta: "User focused",
    },
  ],
  edges: [],
};

// ---------------------------------------------------------------------------
// 3. Connectors: straight, curved, orthogonal, dashed, bidi, labelled, animated, parallel
// ---------------------------------------------------------------------------

export const connectorsOverviewSpec: DiagramSpec = {
  schemaVersion: "1.0",
  id: "connectors-overview",
  title: "Connector Geometries & Styles",
  summary: "Curved, straight, and orthogonal paths with animations, dashing, and parallel lanes",
  layout: "horizontal",
  theme: "auto",
  nodes: [
    { id: "conn-alpha", kind: "service", label: "Source Alpha", tone: "violet" },
    { id: "conn-beta", kind: "system", label: "Hub Beta", tone: "sand" },
    { id: "conn-gamma", kind: "database", label: "Sink Gamma", tone: "sky" },
    { id: "conn-delta", kind: "cloud", label: "Cluster Delta", tone: "mint" },
  ],
  edges: [
    {
      id: "e-straight",
      from: "conn-alpha",
      to: "conn-beta",
      style: "straight",
      label: "Straight Link",
    },
    {
      id: "e-curved",
      from: "conn-beta",
      to: "conn-gamma",
      style: "curved",
      label: "Curved Transit",
    },
    {
      id: "e-ortho",
      from: "conn-gamma",
      to: "conn-delta",
      style: "orthogonal",
      label: "Orthogonal Wire",
    },
    {
      id: "e-dashed",
      from: "conn-alpha",
      to: "conn-gamma",
      style: "curved",
      dashed: true,
      label: "Dashed Async",
    },
    {
      id: "e-bidi",
      from: "conn-beta",
      to: "conn-delta",
      style: "curved",
      bidirectional: true,
      label: "Two-way Sync",
    },
    {
      id: "e-anim",
      from: "conn-alpha",
      to: "conn-delta",
      style: "curved",
      animated: true,
      label: "Active Stream",
    },
    {
      id: "e-parallel-primary",
      from: "conn-beta",
      to: "conn-gamma",
      style: "curved",
      label: "Parallel Lane 1",
    },
    {
      id: "e-parallel-secondary",
      from: "conn-beta",
      to: "conn-gamma",
      style: "curved",
      dashed: true,
      label: "Parallel Lane 2",
    },
  ],
};

// ---------------------------------------------------------------------------
// 4. Groups: group, module, boundary, plus a nested group (depth 2)
// ---------------------------------------------------------------------------

export const groupsOverviewSpec: DiagramSpec = {
  schemaVersion: "1.0",
  id: "groups-overview",
  title: "Regions, Modules & Nested Boundaries",
  summary: "Hierarchical containment zones with collapsible tabs and depth nesting",
  layout: "horizontal",
  theme: "auto",
  nodes: [
    { id: "gn-app-core", kind: "service", label: "Payment Handler", group: "grp-module" },
    { id: "gn-sec-vault", kind: "database", label: "Encrypted Keys", group: "grp-boundary" },
    { id: "gn-parent", kind: "system", label: "Cluster Controller", group: "grp-outer" },
    { id: "gn-child", kind: "agent", label: "Subsystem Worker", group: "grp-nested" },
  ],
  edges: [
    { id: "e-grp-1", from: "gn-app-core", to: "gn-sec-vault", label: "Auth Token" },
    { id: "e-grp-2", from: "gn-parent", to: "gn-child", label: "Supervise" },
  ],
  groups: [
    { id: "grp-module", label: "Core Module", kind: "module" },
    { id: "grp-boundary", label: "Protected Enclave", kind: "boundary" },
    { id: "grp-outer", label: "Parent Infrastructure", kind: "group" },
    {
      id: "grp-nested",
      label: "Nested Sub-region",
      kind: "group",
      parent: "grp-outer",
    },
  ],
};

// ---------------------------------------------------------------------------
// 5. Annotations: every ANNOTATION_KINDS value
// ---------------------------------------------------------------------------

export const annotationsOverviewSpec: DiagramSpec = {
  schemaVersion: "1.0",
  id: "annotations-overview",
  title: "Node Annotations & Callouts",
  summary: "Status indicators, callouts, alerts, and supplementary context badges",
  layout: "horizontal",
  theme: "auto",
  nodes: [
    { id: "ann-node-ok", kind: "process", label: "Compile Step" },
    { id: "ann-node-pend", kind: "queue", label: "Ingest Buffer" },
    { id: "ann-node-err", kind: "api", label: "HTTP Endpoint" },
    { id: "ann-node-warn", kind: "database", label: "Replica Cluster" },
    { id: "ann-node-info", kind: "cloud", label: "Edge Gateway" },
    { id: "ann-node-call", kind: "user", label: "Security Lead" },
    { id: "ann-node-tip", kind: "tool", label: "Profiler" },
    { id: "ann-node-lbl", kind: "agent", label: "Triage Bot" },
  ],
  edges: [],
  annotations: [
    { id: "ann-1", target: "ann-node-ok", kind: "success", text: "Build passed" },
    { id: "ann-2", target: "ann-node-pend", kind: "pending", text: "12 jobs pending" },
    { id: "ann-3", target: "ann-node-err", kind: "error", text: "504 Gateway Timeout" },
    { id: "ann-4", target: "ann-node-warn", kind: "warning", text: "Replication lag 4s" },
    { id: "ann-5", target: "ann-node-info", kind: "info", text: "Direct fiber connection" },
    { id: "ann-6", target: "ann-node-call", kind: "callout", text: "Human verification required" },
    { id: "ann-7", target: "ann-node-tip", kind: "tooltip", text: "Click to inspect flamegraph" },
    { id: "ann-8", target: "ann-node-lbl", kind: "label", text: "Autonomous Tier 1" },
  ],
};

// ---------------------------------------------------------------------------
// 6. Progress and Metrics
// ---------------------------------------------------------------------------

export const progressMetricsOverviewSpec: DiagramSpec = {
  schemaVersion: "1.0",
  id: "progress-metrics-overview",
  title: "Telemetry & Metric Visualizations",
  summary: "Comprehensive showcase of progress shapes, dial gauges, and tabular metric chips",
  layout: "horizontal",
  theme: "auto",
  nodes: [
    {
      id: "pm-ring",
      kind: "progress-ring",
      label: "CPU Ring",
      metric: { value: 76, unit: "%", label: "Cluster load" },
    },
    {
      id: "pm-bar",
      kind: "progress-bar",
      label: "Memory Bar",
      metric: { value: 64, unit: "GB", label: "RAM committed" },
    },
    {
      id: "pm-gauge",
      kind: "gauge",
      label: "Throughput",
      metric: { value: 1420, unit: "qps", label: "Requests per sec" },
    },
    {
      id: "pm-counter",
      kind: "counter",
      label: "Total Errors",
      metric: { value: 0, unit: "err", label: "Zero fault run" },
    },
    {
      id: "pm-timeline",
      kind: "timeline",
      label: "Sprint Target",
      metric: { value: 5, unit: "day", label: "Release window" },
    },
    {
      id: "pm-metric",
      kind: "metric",
      label: "p99 Response",
      metric: { value: 8.4, unit: "ms", label: "Fastest tier" },
    },
  ],
  edges: [
    { id: "e-pm-1", from: "pm-ring", to: "pm-bar", label: "Resource sync" },
    { id: "e-pm-2", from: "pm-gauge", to: "pm-metric", label: "Telemetry" },
  ],
};

// ---------------------------------------------------------------------------
// 7. Animation Presets: 12 compact diagrams (one per preset)
// ---------------------------------------------------------------------------

export const animDataFlowSpec: DiagramSpec = {
  schemaVersion: "1.0",
  id: "anim-data-flow",
  title: "Preset: data-flow",
  summary: "Continuous streaming flow with traveling packets along edge paths",
  layout: "horizontal",
  theme: "auto",
  nodes: [
    { id: "df-src", kind: "service", label: "Ingest Producer", tone: "violet" },
    { id: "df-pipe", kind: "process", label: "Stream Transformer", tone: "sky" },
    { id: "df-dst", kind: "database", label: "Timeseries Sink", tone: "mint" },
  ],
  edges: [
    { id: "e-df-1", from: "df-src", to: "df-pipe", label: "Events" },
    { id: "e-df-2", from: "df-pipe", to: "df-dst", label: "Batch" },
  ],
  animation: { preset: "data-flow", speed: 1, loop: true },
};

export const animRequestResponseSpec: DiagramSpec = {
  schemaVersion: "1.0",
  id: "anim-request-response",
  title: "Preset: request-response",
  summary: "Round-trip RPC conversation between client and server",
  layout: "horizontal",
  theme: "auto",
  nodes: [
    { id: "rr-client", kind: "user", label: "Web Client", tone: "sky" },
    { id: "rr-gw", kind: "api", label: "Gateway Router", tone: "violet" },
    { id: "rr-srv", kind: "service", label: "Compute Backend", tone: "mint" },
  ],
  edges: [
    { id: "e-rr-req", from: "rr-client", to: "rr-gw", label: "Request" },
    { id: "e-rr-call", from: "rr-gw", to: "rr-srv", label: "Invoke" },
    { id: "e-rr-resp", from: "rr-srv", to: "rr-client", label: "Payload", dashed: true },
  ],
  animation: { preset: "request-response", speed: 1, loop: true },
};

export const animStepRevealSpec: DiagramSpec = {
  schemaVersion: "1.0",
  id: "anim-step-reveal",
  title: "Preset: step-reveal",
  summary: "Progressive node and edge reveal in ordinal presentation order",
  layout: "horizontal",
  theme: "auto",
  nodes: [
    { id: "sr-1", kind: "process", label: "Phase 1: Parse", tone: "sand" },
    { id: "sr-2", kind: "process", label: "Phase 2: Optimize", tone: "sky" },
    { id: "sr-3", kind: "process", label: "Phase 3: Emit", tone: "mint" },
  ],
  edges: [
    { id: "e-sr-1", from: "sr-1", to: "sr-2" },
    { id: "e-sr-2", from: "sr-2", to: "sr-3" },
  ],
  animation: { preset: "step-reveal", speed: 1, loop: true },
};

export const animParallelSpec: DiagramSpec = {
  schemaVersion: "1.0",
  id: "anim-parallel",
  title: "Preset: parallel",
  summary: "Synchronized concurrent execution across partitioned workers",
  layout: "horizontal",
  theme: "auto",
  nodes: [
    { id: "par-split", kind: "parallel", label: "Dispatcher", tone: "violet" },
    { id: "par-w1", kind: "service", label: "Shard Alpha", tone: "sky" },
    { id: "par-w2", kind: "service", label: "Shard Beta", tone: "sky" },
    { id: "par-join", kind: "merge", label: "Aggregator", tone: "mint" },
  ],
  edges: [
    { id: "e-p-w1", from: "par-split", to: "par-w1" },
    { id: "e-p-w2", from: "par-split", to: "par-w2" },
    { id: "e-p-j1", from: "par-w1", to: "par-join" },
    { id: "e-p-j2", from: "par-w2", to: "par-join" },
  ],
  animation: { preset: "parallel", speed: 1, loop: true },
};

export const animDecisionBranchSpec: DiagramSpec = {
  schemaVersion: "1.0",
  id: "anim-decision-branch",
  title: "Preset: decision-branch",
  summary: "Evaluation of conditional criteria leading to branching path resolution",
  layout: "horizontal",
  theme: "auto",
  nodes: [
    { id: "db-input", kind: "data", label: "Incoming Claim", tone: "sand" },
    { id: "db-gate", kind: "decision", label: "Valid Token?", tone: "peach" },
    { id: "db-pass", kind: "success", label: "Authorized", tone: "mint" },
    { id: "db-deny", kind: "fail", label: "Forbidden", tone: "rose" },
  ],
  edges: [
    { id: "e-db-in", from: "db-input", to: "db-gate" },
    { id: "e-db-yes", from: "db-gate", to: "db-pass", label: "Yes" },
    { id: "e-db-no", from: "db-gate", to: "db-deny", label: "No" },
  ],
  animation: { preset: "decision-branch", speed: 1, loop: true },
};

export const animRetryFailureSpec: DiagramSpec = {
  schemaVersion: "1.0",
  id: "anim-retry-failure",
  title: "Preset: retry-failure",
  summary: "Transient failure followed by scheduled backoff and resolution",
  layout: "horizontal",
  theme: "auto",
  nodes: [
    { id: "rf-caller", kind: "service", label: "Gateway Caller", tone: "violet" },
    { id: "rf-remote", kind: "cloud", label: "Third-party API", tone: "peach" },
    { id: "rf-recovery", kind: "retry", label: "Retry Policy", tone: "mint" },
  ],
  edges: [
    { id: "e-rf-call", from: "rf-caller", to: "rf-remote", label: "Try 1 (Fail)", dashed: true },
    { id: "e-rf-backoff", from: "rf-remote", to: "rf-recovery", label: "Backoff" },
    { id: "e-rf-ok", from: "rf-recovery", to: "rf-caller", label: "Try 2 (OK)" },
  ],
  animation: { preset: "retry-failure", speed: 1, loop: true },
};

export const animLoopSpec: DiagramSpec = {
  schemaVersion: "1.0",
  id: "anim-loop",
  title: "Preset: loop",
  summary: "Repeated cyclical iteration through bounded state updates",
  layout: "horizontal",
  theme: "auto",
  nodes: [
    { id: "loop-step-a", kind: "process", label: "Inspect Frame", tone: "violet" },
    { id: "loop-step-b", kind: "tool", label: "Compute Diff", tone: "sky" },
    { id: "loop-step-c", kind: "condition", label: "Convergence Check", tone: "peach" },
  ],
  edges: [
    { id: "e-lp-ab", from: "loop-step-a", to: "loop-step-b" },
    { id: "e-lp-bc", from: "loop-step-b", to: "loop-step-c" },
    { id: "e-lp-ca", from: "loop-step-c", to: "loop-step-a", label: "Next epoch", dashed: true },
  ],
  animation: { preset: "loop", speed: 1, loop: true },
};

export const animProgressSpec: DiagramSpec = {
  schemaVersion: "1.0",
  id: "anim-progress",
  title: "Preset: progress",
  summary: "Step-by-step progress advancement along milestone targets",
  layout: "horizontal",
  theme: "auto",
  nodes: [
    { id: "prg-s1", kind: "timeline", label: "Stage 1: Setup", tone: "sand" },
    { id: "prg-s2", kind: "timeline", label: "Stage 2: Ingest", tone: "sky" },
    { id: "prg-s3", kind: "timeline", label: "Stage 3: Ready", tone: "mint" },
  ],
  edges: [
    { id: "e-prg-1", from: "prg-s1", to: "prg-s2" },
    { id: "e-prg-2", from: "prg-s2", to: "prg-s3" },
  ],
  animation: { preset: "progress", speed: 1, loop: true },
};

export const animFanOutInSpec: DiagramSpec = {
  schemaVersion: "1.0",
  id: "anim-fan-out-in",
  title: "Preset: fan-out-in",
  summary: "Broadcast packet distribution fanning out and collecting into a receiver",
  layout: "horizontal",
  theme: "auto",
  nodes: [
    { id: "fo-source", kind: "api", label: "Event Dispatcher", tone: "violet" },
    { id: "fo-node-a", kind: "service", label: "Search Indexer", tone: "sky" },
    { id: "fo-node-b", kind: "service", label: "Analytics Tap", tone: "sand" },
    { id: "fo-sink", kind: "database", label: "Audited Ledger", tone: "mint" },
  ],
  edges: [
    { id: "e-fo-a", from: "fo-source", to: "fo-node-a" },
    { id: "e-fo-b", from: "fo-source", to: "fo-node-b" },
    { id: "e-fi-a", from: "fo-node-a", to: "fo-sink" },
    { id: "e-fi-b", from: "fo-node-b", to: "fo-sink" },
  ],
  animation: { preset: "fan-out-in", speed: 1, loop: true },
};

export const animTimelineSpec: DiagramSpec = {
  schemaVersion: "1.0",
  id: "anim-timeline",
  title: "Preset: timeline",
  summary: "Chronological progression through key delivery milestones",
  layout: "horizontal",
  theme: "auto",
  nodes: [
    { id: "tl-q1", kind: "timeline", label: "Discovery Q1", tone: "sand" },
    { id: "tl-q2", kind: "timeline", label: "Prototyping Q2", tone: "sky" },
    { id: "tl-q3", kind: "timeline", label: "Production Q3", tone: "mint" },
  ],
  edges: [
    { id: "e-tl-1", from: "tl-q1", to: "tl-q2" },
    { id: "e-tl-2", from: "tl-q2", to: "tl-q3" },
  ],
  animation: { preset: "timeline", speed: 1, loop: true },
};

export const animStateTransitionSpec: DiagramSpec = {
  schemaVersion: "1.0",
  id: "anim-state-transition",
  title: "Preset: state-transition",
  summary: "Dynamic lifecycle state mutations across interconnected entities",
  layout: "horizontal",
  theme: "auto",
  nodes: [
    { id: "st-src", kind: "agent", label: "Agent Observer", tone: "violet" },
    { id: "st-trans", kind: "process", label: "State Machine", tone: "peach" },
    { id: "st-dest", kind: "database", label: "State Snapshot", tone: "mint" },
  ],
  edges: [
    { id: "e-st-1", from: "st-src", to: "st-trans", label: "Emit event" },
    { id: "e-st-2", from: "st-trans", to: "st-dest", label: "Transition" },
  ],
  animation: { preset: "state-transition", speed: 1, loop: true },
};

export const animHighlightSpec: DiagramSpec = {
  schemaVersion: "1.0",
  id: "anim-highlight",
  title: "Preset: highlight",
  summary: "Sequential visual emphasis across focal nodes and connectors",
  layout: "horizontal",
  theme: "auto",
  nodes: [
    { id: "hl-focus-1", kind: "ai", label: "Primary Model", tone: "violet" },
    { id: "hl-focus-2", kind: "tool", label: "Execution Sandbox", tone: "sky" },
    { id: "hl-focus-3", kind: "knowledge", label: "Semantic Index", tone: "mint" },
  ],
  edges: [
    { id: "e-hl-1", from: "hl-focus-1", to: "hl-focus-2" },
    { id: "e-hl-2", from: "hl-focus-2", to: "hl-focus-3" },
  ],
  animation: { preset: "highlight", speed: 1, loop: true },
};

/** All gallery specs grouped for verification and iteration */
export const ALL_GALLERY_SPECS: Record<string, DiagramSpec> = {
  // Nodes
  "nodes-architecture": nodesArchitectureSpec,
  "nodes-logic-branching": nodesLogicBranchingSpec,
  "nodes-logic-outcomes": nodesLogicOutcomesSpec,
  "nodes-data": nodesDataSpec,
  "nodes-domain": nodesDomainSpec,
  "nodes-progress": nodesProgressSpec,
  // States
  "states-overview": statesOverviewSpec,
  // Connectors
  "connectors-overview": connectorsOverviewSpec,
  // Groups
  "groups-overview": groupsOverviewSpec,
  // Annotations
  "annotations-overview": annotationsOverviewSpec,
  // Progress & metrics
  "progress-metrics-overview": progressMetricsOverviewSpec,
  // Presets
  "anim-data-flow": animDataFlowSpec,
  "anim-request-response": animRequestResponseSpec,
  "anim-step-reveal": animStepRevealSpec,
  "anim-parallel": animParallelSpec,
  "anim-decision-branch": animDecisionBranchSpec,
  "anim-retry-failure": animRetryFailureSpec,
  "anim-loop": animLoopSpec,
  "anim-progress": animProgressSpec,
  "anim-fan-out-in": animFanOutInSpec,
  "anim-timeline": animTimelineSpec,
  "anim-state-transition": animStateTransitionSpec,
  "anim-highlight": animHighlightSpec,
};
