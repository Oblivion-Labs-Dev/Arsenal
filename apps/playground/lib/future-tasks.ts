export type FutureTaskCategory =
  | 'Visualization'
  | 'Templates'
  | 'Agents'
  | 'Quality'
  | 'Analytics'
  | 'Rules'
  | 'Automation'
  | 'Migration'
  | 'Memory'
  | 'Sandbox';

export interface FutureTask {
  title: string;
  category: FutureTaskCategory;
  description: string;
  value: string;
  futureScope: string[];
}

export const FUTURE_TASKS: FutureTask[] = [
  {
    title: 'Dependency Explorer',
    category: 'Visualization',
    description:
      'Visualize internal package dependencies, import chains, ownership boundaries, and circular imports across a workspace.',
    value: 'Helps teams see coupling before refactors, package splits, or architectural changes.',
    futureScope: ['Package graph', 'Circular import warnings', 'Import-depth filters'],
  },
  {
    title: 'Template Marketplace',
    category: 'Templates',
    description:
      'Browse and install reusable repository templates such as Next.js apps, Chrome extensions, Python packages, MCP servers, dashboards, and docs sites.',
    value: 'Turns Arsenal into a launchpad for new projects instead of a static component library.',
    futureScope: ['Template previews', 'Install commands', 'Compatibility metadata'],
  },
  {
    title: 'Agent Playground',
    category: 'Agents',
    description:
      'Compare how Cursor, Claude Code, Codex, Gemini, Copilot, and other assistants approach the same engineering task.',
    value:
      'Makes AI tooling choices more concrete by showing output quality, speed, context usage, and failure modes side by side.',
    futureScope: ['Task fixtures', 'Agent scorecards', 'Diff comparison'],
  },
  {
    title: 'Repository Health Score',
    category: 'Quality',
    description:
      'Grade projects across testing, documentation, performance, security, AI readiness, maintainability, accessibility, and release maturity.',
    value: 'Gives every imported repo a clear baseline and a ranked improvement plan.',
    futureScope: ['Weighted score model', 'Trend history', 'Remediation checklist'],
  },
  {
    title: 'Prompt & Token Analytics',
    category: 'Analytics',
    description:
      'Estimate token savings from preprocessing, caching, context pruning, summary reuse, and knowledge graph retrieval.',
    value:
      'Shows the real cost and quality tradeoffs behind each context strategy before a model call happens.',
    futureScope: ['Savings estimates', 'Cache hit reporting', 'Budget profiles'],
  },
  {
    title: 'Rule Conflict Detector',
    category: 'Rules',
    description:
      'Identify overlapping, duplicated, stale, or contradictory AI rules before they affect coding sessions.',
    value:
      'Keeps AGENTS, Cursor, Claude, Codex, and project-specific guidance aligned instead of noisy.',
    futureScope: ['Rule linting', 'Conflict explanations', 'Suggested merges'],
  },
  {
    title: 'Architecture Visualizer',
    category: 'Visualization',
    description:
      'Automatically generate dependency graphs, call graphs, React component trees, route maps, and service diagrams.',
    value:
      'Makes architecture review faster for humans and gives agents a better map of the system.',
    futureScope: ['Mermaid export', 'Component trees', 'Service diagrams'],
  },
  {
    title: 'CLI Generator',
    category: 'Automation',
    description:
      'Create commands such as arsenal init to bootstrap a new repository with selected Arsenal modules, quality gates, rules, and templates.',
    value: 'Turns the Arsenal vault into a repeatable setup workflow for new repos.',
    futureScope: ['arsenal init', 'Module selection', 'Generated setup report'],
  },
  {
    title: 'Versioned Knowledge Packs',
    category: 'Rules',
    description:
      'Package rules, prompts, templates, conventions, and documentation so repositories can pin compatible Arsenal versions.',
    value:
      'Lets different projects adopt Arsenal at different speeds without drifting into inconsistent guidance.',
    futureScope: ['Pack manifests', 'Compatibility checks', 'Upgrade notes'],
  },
  {
    title: 'Live Demo Sandbox',
    category: 'Sandbox',
    description:
      'Render every UI component with editable props, similar to Storybook, while staying inside the Arsenal playground.',
    value:
      'Helps teams inspect behavior, copy snippets, and validate states without leaving the product surface.',
    futureScope: ['Editable props', 'State presets', 'Responsive previews'],
  },
  {
    title: 'Migration Assistant',
    category: 'Migration',
    description:
      'Scan an existing repository and recommend Arsenal modules to adopt, including estimated effort, benefits, and migration order.',
    value:
      'Creates a practical adoption path instead of asking teams to understand every package first.',
    futureScope: ['Repo scan', 'Effort estimate', 'Adoption roadmap'],
  },
  {
    title: 'Quality Gates Dashboard',
    category: 'Quality',
    description:
      'Consolidate linting, tests, coverage, bundle size, accessibility, security scans, and performance into one release readiness view.',
    value: 'Makes the final ship decision visible and repeatable for humans and agents.',
    futureScope: ['Gate status', 'Release readiness', 'CI artifact links'],
  },
  {
    title: 'AI Memory Inspector',
    category: 'Memory',
    description:
      'Visualize exactly what context, summaries, embeddings, caches, and memories would be sent to an AI agent for a given task.',
    value: 'Improves trust by making AI context selection inspectable before it influences code.',
    futureScope: ['Context preview', 'Memory timeline', 'Privacy checks'],
  },
  {
    title: 'Automation Catalog',
    category: 'Automation',
    description:
      'Catalog every GitHub Action, pre-commit hook, formatter, generator, release workflow, and reusable automation available in Arsenal.',
    value:
      'Makes automation discoverable instead of hidden across package scripts and workflow folders.',
    futureScope: ['Workflow inventory', 'Hook registry', 'Reuse instructions'],
  },
  {
    title: 'Project Import Wizard',
    category: 'Migration',
    description:
      'Import an existing repository, analyze its structure, and generate an adoption plan for Arsenal features.',
    value: 'Turns evaluation into a guided workflow with recommendations, risks, and next steps.',
    futureScope: ['Repository import', 'Module matching', 'Generated adoption plan'],
  },
];

export const FUTURE_TASK_CATEGORIES = Array.from(
  new Set(FUTURE_TASKS.map((task) => task.category)),
).sort();
