import { diagramSchema, type Diagram, type DiagramSpec } from "./schema.js";

export const aiAgentRequestExample: Diagram = diagramSchema.parse({
  schemaVersion: "1.0",
  id: "ai-agent-request",
  title: "AI Agent Query Flow",
  summary: "How an AI agent processes a user prompt using tools and model inference",
  layout: "horizontal",
  theme: "auto",
  nodes: [
    { id: "user", kind: "user", label: "User Client", tone: "sky", meta: "Prompt input" },
    { id: "agent", kind: "agent", label: "Agent Core", tone: "violet", meta: "Task planner" },
    {
      id: "knowledge",
      kind: "knowledge",
      label: "Vector Index",
      tone: "sand",
      meta: "Domain facts",
    },
    { id: "tool", kind: "tool", label: "Code Sandbox", tone: "sand", meta: "Calculations" },
    { id: "model", kind: "ai", label: "Reasoning Model", tone: "violet", meta: "LLM completion" },
    {
      id: "response",
      kind: "process",
      label: "Response Synth",
      tone: "mint",
      meta: "Final answer",
    },
  ],
  edges: [
    { id: "e-usr-agt", from: "user", to: "agent", label: "Prompt" },
    { id: "e-agt-kb", from: "agent", to: "knowledge", label: "Context" },
    { id: "e-agt-tool", from: "agent", to: "tool", label: "Execute" },
    { id: "e-agt-mdl", from: "agent", to: "model", label: "Tokens" },
    { id: "e-mdl-resp", from: "model", to: "response", label: "Synthesis" },
    { id: "e-resp-usr", from: "response", to: "user", label: "Answer", dashed: true },
  ],
  groups: [{ id: "g-env", label: "Execution Environment", kind: "module" }],
  annotations: [{ id: "a-fast", kind: "info", text: "Cached lookup <10ms", target: "knowledge" }],
  animation: {
    preset: "request-response",
    speed: 1,
    loop: true,
  },
  explanations: {
    eli5: "When you ask the AI a question, it checks its private notebook and tools first before talking to the big thinking model, so you get an accurate answer.",
    advanced:
      "A coordinator agent dispatches retrieval-augmented context and sandbox tool executions into the prompt window before sending the completed context to the foundational LLM for token generation.",
  },
} satisfies DiagramSpec);

export const moneyTransferExample: Diagram = diagramSchema.parse({
  schemaVersion: "1.0",
  id: "money-transfer",
  title: "Secure Payment Transfer",
  summary: "Instant peer-to-peer balance transfer with automated fraud validation",
  layout: "horizontal",
  theme: "auto",
  nodes: [
    { id: "sender", kind: "user", label: "Sender Account", tone: "sky" },
    { id: "bank-api", kind: "api", label: "Payments Gateway", tone: "violet" },
    { id: "fraud-check", kind: "decision", label: "Fraud Risk Filter", tone: "peach" },
    {
      id: "ledger",
      kind: "database",
      label: "Ledger Database",
      tone: "mint",
      metric: { value: 250, unit: "USD", label: "Transfer" },
    },
    { id: "settled", kind: "success", label: "Transfer Settled", tone: "mint" },
  ],
  edges: [
    { id: "e-send-api", from: "sender", to: "bank-api", label: "Authorize $250" },
    { id: "e-api-fraud", from: "bank-api", to: "fraud-check", label: "Telemetry" },
    { id: "e-fraud-ledger", from: "fraud-check", to: "ledger", label: "Passed" },
    { id: "e-ledger-settle", from: "ledger", to: "settled", label: "Commit" },
  ],
  animation: {
    preset: "data-flow",
    speed: 1,
    loop: true,
  },
  explanations: {
    eli5: "Your payment travels to the bank, gets inspected to ensure nobody stole your card, and moves into the recipient's balance safely.",
    advanced:
      "Transactions pass through an idempotent API gateway into a sub-millisecond fraud scoring pipeline before initiating two-phase commit updates against the distributed ledger.",
  },
} satisfies DiagramSpec);

export const decisionTreeExample: Diagram = diagramSchema.parse({
  schemaVersion: "1.0",
  id: "decision-tree",
  title: "Automated Refund Policy",
  summary: "Evaluating refund eligibility based on purchase date and item condition",
  layout: "horizontal",
  theme: "auto",
  nodes: [
    { id: "intake", kind: "process", label: "Refund Request", tone: "sky" },
    { id: "gate-date", kind: "condition", label: "Within 30 Days?", tone: "peach" },
    { id: "gate-condition", kind: "condition", label: "Unused Condition?", tone: "peach" },
    { id: "auto-approve", kind: "success", label: "Instant Refund", tone: "mint" },
    { id: "manual-review", kind: "agent", label: "Human Review", tone: "violet" },
    { id: "auto-reject", kind: "fail", label: "Request Denied", tone: "rose" },
  ],
  edges: [
    { id: "e-in-date", from: "intake", to: "gate-date" },
    { id: "e-date-cond", from: "gate-date", to: "gate-condition", label: "Yes" },
    { id: "e-date-rej", from: "gate-date", to: "auto-reject", label: "No" },
    { id: "e-cond-appr", from: "gate-condition", to: "auto-approve", label: "Yes" },
    { id: "e-cond-rev", from: "gate-condition", to: "manual-review", label: "Damaged" },
  ],
  animation: {
    preset: "decision-branch",
    speed: 1,
    loop: true,
  },
  explanations: {
    eli5: "If your item was bought recently and still looks new, you get your money back right away. If it was bought too long ago, it is turned down.",
    advanced:
      "Deterministic rule-engine routing evaluating time-to-return timestamps and condition inspection reports before emitting settlement webhooks.",
  },
} satisfies DiagramSpec);

export const parallelProcessingExample: Diagram = diagramSchema.parse({
  schemaVersion: "1.0",
  id: "parallel-processing",
  title: "Distributed Map-Reduce",
  summary: "Concurrent batch processing fanning out to parallel worker tasks",
  layout: "horizontal",
  theme: "auto",
  nodes: [
    { id: "dispatcher", kind: "parallel", label: "Task Dispatcher", tone: "violet" },
    { id: "worker-1", kind: "service", label: "Worker Node 1", tone: "sky" },
    { id: "worker-2", kind: "service", label: "Worker Node 2", tone: "sky" },
    { id: "worker-3", kind: "service", label: "Worker Node 3", tone: "sky" },
    { id: "collector", kind: "merge", label: "Result Aggregator", tone: "violet" },
    { id: "output", kind: "data", label: "Consolidated Data", tone: "mint" },
  ],
  edges: [
    { id: "e-d-w1", from: "dispatcher", to: "worker-1", label: "Batch A" },
    { id: "e-d-w2", from: "dispatcher", to: "worker-2", label: "Batch B" },
    { id: "e-d-w3", from: "dispatcher", to: "worker-3", label: "Batch C" },
    { id: "e-w1-c", from: "worker-1", to: "collector" },
    { id: "e-w2-c", from: "worker-2", to: "collector" },
    { id: "e-w3-c", from: "worker-3", to: "collector" },
    { id: "e-c-out", from: "collector", to: "output", label: "Final Result" },
  ],
  animation: {
    preset: "parallel",
    speed: 1,
    loop: true,
  },
  explanations: {
    eli5: "One big task is split into three smaller pieces so three helpers can work on them at the exact same time and combine their work.",
    advanced:
      "Employs scatter-gather concurrency: a coordinator splits an input stream across partitioned worker queues, joining results at an accumulator barrier.",
  },
} satisfies DiagramSpec);

export const failureRetryExample: Diagram = diagramSchema.parse({
  schemaVersion: "1.0",
  id: "failure-retry",
  title: "Resilient RPC with Backoff",
  summary: "Transient downstream failure with automatic exponential retry policy",
  layout: "horizontal",
  theme: "auto",
  nodes: [
    { id: "client", kind: "service", label: "Client Gateway", tone: "violet" },
    { id: "upstream", kind: "cloud", label: "Upstream Service", tone: "peach" },
    {
      id: "retry-handler",
      kind: "retry",
      label: "Retry Policy",
      tone: "peach",
      metric: { value: 2, label: "Attempt" },
    },
    { id: "order-placed", kind: "success", label: "Order Confirmed", tone: "mint" },
  ],
  edges: [
    { id: "e-call", from: "client", to: "upstream", label: "Call RPC" },
    { id: "e-fail", from: "upstream", to: "retry-handler", label: "503 Fail", dashed: true },
    { id: "e-retry", from: "retry-handler", to: "upstream", label: "Backoff Retry" },
    { id: "e-ok", from: "upstream", to: "order-placed", label: "200 Success" },
  ],
  animation: {
    preset: "retry-failure",
    speed: 1,
    loop: true,
  },
  explanations: {
    eli5: "If the computer says it is too busy to help, we wait a moment and ask again politely until the order goes through.",
    advanced:
      "Implements jittered exponential backoff and circuit breaker mitigation against transient 5xx HTTP response codes.",
  },
} satisfies DiagramSpec);

export const EXAMPLES: Record<string, Diagram> = {
  "ai-agent-request": aiAgentRequestExample,
  "money-transfer": moneyTransferExample,
  "decision-tree": decisionTreeExample,
  "parallel-processing": parallelProcessingExample,
  "failure-retry": failureRetryExample,
};
