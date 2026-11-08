export interface Capability {
  name: string;
  package: string;
  description: string;
  outputs?: string;
}

export interface FeatureArea {
  id: string;
  slug: string;
  title: string;
  tagline: string;
  description: string;
  packages: string[];
  capabilities: Capability[];
  metrics: { label: string; value: string; hint: string }[];
  playbook: string[];
  relatedLinks?: { label: string; href: string }[];
}

export const FEATURE_AREAS: FeatureArea[] = [
  {
    id: 'repository-bootstrap',
    slug: 'repository-bootstrap',
    title: 'Repository Bootstrap',
    tagline: 'Set up a new repository with shared tooling and templates.',
    description:
      'Project creation, folder templates, package setup, TypeScript, linting, formatting, hooks, release policy, and repeatable scaffolds.',
    packages: ['@arsenal/generator', '@arsenal/config', '@arsenal/site-config', '@arsenal/core'],
    metrics: [
      { label: 'Templates', value: '4', hint: 'saas, docs, dashboard, portfolio' },
      { label: 'Quality gates', value: 'Prewired', hint: 'lint, typecheck, test, build' },
      { label: 'Install path', value: 'CLI', hint: 'future plugin-ready generator' },
    ],
    playbook: [
      'Select project blueprint',
      'Install workspace contracts',
      'Generate folder map',
      'Apply quality gates',
    ],
    capabilities: [
      {
        name: 'Project creation',
        package: '@arsenal/generator',
        description: 'Creates a repo blueprint from typed templates.',
      },
      {
        name: 'Package setup',
        package: '@arsenal/config',
        description: 'Shared TypeScript, lint, and build conventions.',
      },
      {
        name: 'Husky and release policy',
        package: '@arsenal/site-testing',
        description: 'Pre-commit and pre-push gates for human and agent work.',
      },
      {
        name: 'Template registry',
        package: '@arsenal/site-config',
        description: 'Reusable app shapes and deployment defaults.',
      },
    ],
  },
  {
    id: 'developer-components',
    slug: 'developer-components',
    title: 'Developer Components',
    tagline: 'Reusable UI components for current and future projects.',
    description:
      'Cards, buttons, backgrounds, command surfaces, dashboards, motion primitives, and component docs that can be imported independently.',
    packages: ['@arsenal/ui', '@arsenal/motion', '@arsenal/sections', '@arsenal/layouts'],
    metrics: [
      { label: 'Categories', value: '9', hint: 'hero, cards, backgrounds, motion, dashboards' },
      { label: 'Docs', value: 'Inline', hint: 'props, usage, a11y, performance' },
      { label: 'Import granularity', value: '1 file', hint: 'use only what a repo needs' },
    ],
    playbook: [
      'Pick a component category',
      'Preview behavior',
      'Copy usage',
      'Import from @arsenal/ui',
    ],
    capabilities: [
      {
        name: 'Component showcase',
        package: '@arsenal/ui',
        description: 'Preview, description, props, usage, accessibility, performance, and code.',
      },
      {
        name: 'Network background',
        package: '@arsenal/ui',
        description: 'Interactive canvas mesh migrated from the portfolio design language.',
      },
      {
        name: 'Motion primitives',
        package: '@arsenal/motion',
        description: 'Reveal, cursor, parallax, and magnetic interaction helpers.',
      },
      {
        name: 'Landing sections',
        package: '@arsenal/sections',
        description: 'Reusable hero, bento, FAQ, marketplace, and template galleries.',
      },
    ],
    relatedLinks: [{ label: 'Open component library', href: '/components' }],
  },
  {
    id: 'testing',
    slug: 'testing',
    title: 'Testing',
    tagline: 'Run and track the checks used across a repository.',
    description:
      'Unit, integration, visual, accessibility, performance, e2e, mutation, regression, golden image, and coverage gates.',
    packages: ['@arsenal/testing', '@arsenal/site-testing', '@arsenal/evaluation'],
    metrics: [
      { label: 'Coverage lanes', value: '10', hint: 'unit through golden images' },
      { label: 'Regression posture', value: 'Guarded', hint: 'smoke and interaction checks' },
      { label: 'Agent safety', value: 'High', hint: 'quality gates before merge' },
    ],
    playbook: [
      'Register test layers',
      'Set thresholds',
      'Run local quality gate',
      'Publish CI artifacts',
    ],
    capabilities: [
      {
        name: 'Quality gates',
        package: '@arsenal/site-testing',
        description: 'Typed checks for lint, test, build, and performance.',
      },
      {
        name: 'Evaluation harness',
        package: '@arsenal/evaluation',
        description: 'Inspector patterns for repository output verification.',
      },
      {
        name: 'Regression dashboard',
        package: '@arsenal/testing',
        description: 'Central status for all test lanes.',
      },
    ],
  },
  {
    id: 'ci-cd',
    slug: 'ci-cd',
    title: 'CI/CD',
    tagline: 'Build, verify, and release repository artifacts.',
    description:
      'GitHub Actions, Docker, Terraform, AWS, Azure, Kubernetes, deployment checks, rollback plans, and release notes.',
    packages: ['@arsenal/site-testing', '@arsenal/observability', '@arsenal/tools'],
    metrics: [
      { label: 'Pipeline stages', value: '8', hint: 'check, test, build, scan, deploy' },
      { label: 'Rollback', value: 'Designed', hint: 'release safety as default' },
      { label: 'Artifacts', value: 'Verified', hint: 'deploy built output only' },
    ],
    playbook: [
      'Generate workflow',
      'Attach quality gates',
      'Upload reports',
      'Deploy artifact',
      'Record release',
    ],
    capabilities: [
      {
        name: 'Actions templates',
        package: '@arsenal/tools',
        description: 'Workflow scaffolds for common repository types.',
      },
      {
        name: 'Release notes',
        package: '@arsenal/summary',
        description: 'Summarizes verified changes into ship notes.',
      },
      {
        name: 'Deployment telemetry',
        package: '@arsenal/observability',
        description: 'Tracks build and deploy health.',
      },
    ],
  },
  {
    id: 'ai-development',
    slug: 'ai-development',
    title: 'AI Development',
    tagline: 'Manage rules, memory, prompts, and guardrails for AI-assisted engineering.',
    description:
      'Cursor, Claude, Codex, Copilot, and Gemini rules backed by context engineering, memory, prompt optimization, and knowledge graphs.',
    packages: [
      '@arsenal/context-engine',
      '@arsenal/prompt',
      '@arsenal/policy',
      '@arsenal/session-memory',
    ],
    metrics: [
      { label: 'Rule surfaces', value: '5', hint: 'Cursor, Claude, Codex, Copilot, Gemini' },
      { label: 'Prompt profiles', value: '9', hint: 'debug, review, refactor, architecture' },
      { label: 'Memory', value: 'Persistent', hint: 'decisions, pitfalls, active work' },
    ],
    playbook: ['Index repo', 'Load rules', 'Compile context', 'Apply policy', 'Write memory'],
    capabilities: [
      {
        name: 'Prompt compiler',
        package: '@arsenal/prompt',
        description: 'Converts objective, rules, and context into structured prompts.',
      },
      {
        name: 'Policy engine',
        package: '@arsenal/policy',
        description: 'Injects constraints and rejects unsafe context choices.',
      },
      {
        name: 'Session memory',
        package: '@arsenal/session-memory',
        description: 'Maintains active task, decisions, and pitfalls across sessions.',
      },
      {
        name: 'Context rules',
        package: '@arsenal/context-engine',
        description: 'Generates AGENTS, CLAUDE, Cursor rules, and testing rules.',
      },
    ],
  },
  {
    id: 'token-optimization',
    slug: 'token-optimization',
    title: 'Token Optimization',
    tagline: 'Measure and reduce context, then reuse it across model requests.',
    description:
      'Estimated savings, cache hits, prompt reductions, knowledge reuse, compressed context, retrieval usage, and historical metrics.',
    packages: [
      '@arsenal/budget',
      '@arsenal/context-engine',
      '@arsenal/cache',
      '@arsenal/observability',
    ],
    metrics: [
      { label: 'Typical savings', value: '85-98%', hint: 'summaries before source' },
      { label: 'Cache hits', value: '94%', hint: 'skip unchanged files' },
      { label: 'Budget profiles', value: '6', hint: 'tiny through maximum-quality' },
    ],
    playbook: [
      'Estimate full repo',
      'Use cached summaries',
      'Retrieve graph neighbors',
      'Drop low-priority context',
    ],
    capabilities: [
      {
        name: 'Token estimator',
        package: '@arsenal/core',
        description: 'Fast char-based token estimates.',
      },
      {
        name: 'Budget manager',
        package: '@arsenal/budget',
        description: 'Caps context by task profile.',
      },
      {
        name: 'Savings calculator',
        package: '@arsenal/context-engine',
        description: 'Compares selected context against full-repo estimates.',
      },
      {
        name: 'Usage logger',
        package: '@arsenal/context-engine',
        description: 'Stores context build history.',
      },
    ],
    relatedLinks: [{ label: 'Open live dashboard', href: '/context' }],
  },
  {
    id: 'knowledge-graph',
    slug: 'knowledge-graph',
    title: 'Knowledge Graph',
    tagline: 'Query relationships between components, rules, templates, agents, docs, and prompts.',
    description:
      'Interactive relationships between modules, source files, summaries, rules, agents, projects, documentation, and generated prompts.',
    packages: ['@arsenal/context-engine', '@arsenal/knowledge', '@arsenal/retrieval'],
    metrics: [
      { label: 'Node classes', value: '14', hint: 'files, symbols, routes, packages' },
      { label: 'Edge classes', value: '11', hint: 'imports, tests, calls, owns' },
      { label: 'Query modes', value: '6', hint: 'who-calls, what-breaks, where-is' },
    ],
    playbook: [
      'Scan symbols',
      'Build dependency edges',
      'Attach tests',
      'Query graph',
      'Expand neighbors',
    ],
    capabilities: [
      {
        name: 'Graph builder',
        package: '@arsenal/context-engine',
        description: 'Merges repo map, symbols, dependencies, tests, and routes.',
      },
      {
        name: 'Graph schema',
        package: '@arsenal/knowledge',
        description: 'Zod-validated nodes and edges.',
      },
      {
        name: 'Hybrid retrieval',
        package: '@arsenal/retrieval',
        description: 'TF-IDF plus graph distance and recency.',
      },
    ],
  },
  {
    id: 'documentation',
    slug: 'documentation',
    title: 'Documentation',
    tagline:
      'Architecture, ADRs, API docs, component docs, and diagrams generated from repo truth.',
    description:
      'Decision logs, auto docs, sequence diagrams, Mermaid, component docs, API docs, and module documentation.',
    packages: ['@arsenal/summary', '@arsenal/content', '@arsenal/context-engine'],
    metrics: [
      { label: 'Doc modes', value: '7', hint: 'ADR, API, component, architecture' },
      { label: 'Diagrams', value: 'Mermaid', hint: 'sequence and dependency maps' },
      { label: 'Freshness', value: 'Hash based', hint: 'detect stale summaries' },
    ],
    playbook: ['Summarize modules', 'Record decisions', 'Generate diagrams', 'Link docs to graph'],
    capabilities: [
      {
        name: 'Architecture summary',
        package: '@arsenal/context-engine',
        description: 'Generates top-level repo architecture notes.',
      },
      {
        name: 'Decision summarizer',
        package: '@arsenal/context-engine',
        description: 'Turns work history into decision logs.',
      },
      {
        name: 'Component docs',
        package: '@arsenal/ui',
        description: 'Props, usage, accessibility, performance, and snippets.',
      },
    ],
  },
  {
    id: 'dashboards',
    slug: 'dashboards',
    title: 'Dashboards',
    tagline:
      'Repository health, tests, builds, coverage, performance, prompts, and technical debt.',
    description:
      'A dense operational layer for repository health, testing, builds, coverage, performance, prompt usage, knowledge quality, and automation.',
    packages: ['@arsenal/dashboard', '@arsenal/observability', '@arsenal/context-engine'],
    metrics: [
      { label: 'Dashboard lanes', value: '9', hint: 'health through automation' },
      { label: 'Snapshot', value: 'JSON', hint: 'render anywhere' },
      { label: 'Learning', value: 'Active', hint: 'quality score and pattern detector' },
    ],
    playbook: ['Collect signals', 'Score quality', 'Render dashboard', 'Suggest improvements'],
    capabilities: [
      {
        name: 'Dashboard snapshot',
        package: '@arsenal/context-engine',
        description: 'Builds analytics JSON for local viewers.',
      },
      {
        name: 'Learning engine',
        package: '@arsenal/observability',
        description: 'Records usage metrics and retrieval signals.',
      },
      {
        name: 'Dashboard components',
        package: '@arsenal/ui',
        description: 'Metric cards and operational surfaces.',
      },
    ],
  },
  {
    id: 'labs',
    slug: 'labs',
    title: 'Labs',
    tagline: 'Explore prototypes, animation experiments, AI workflows, and planned capabilities.',
    description:
      'A contained space for proof-of-concepts, animation experiments, new agent workflows, and repository operating-system ideas.',
    packages: ['@arsenal/sections', '@arsenal/motion', '@arsenal/plugins'],
    metrics: [
      { label: 'Risk', value: 'Isolated', hint: 'experiments do not leak into core' },
      { label: 'Motion', value: 'Intentional', hint: 'Framer-powered prototypes' },
      { label: 'Promotion path', value: 'Plugin', hint: 'graduate stable modules' },
    ],
    playbook: ['Prototype in lab', 'Measure utility', 'Document constraints', 'Promote to package'],
    capabilities: [
      {
        name: 'Animation lab',
        package: '@arsenal/motion',
        description: 'Cursor, reveal, parallax, and magnetic experiments.',
      },
      {
        name: 'Plugin incubation',
        package: '@arsenal/plugins',
        description: 'Future import boundary for optional modules.',
      },
      {
        name: 'Template gallery',
        package: '@arsenal/sections',
        description: 'Reusable landing and showcase sections.',
      },
    ],
  },
];

export const MODULE_SHORTCUTS = [
  'repository-bootstrap',
  'developer-components',
  'testing',
  'ci-cd',
  'ai-development',
  'token-optimization',
  'knowledge-graph',
  'documentation',
  'dashboards',
  'labs',
];

export const GRAPH_QUERIES = [
  'Who calls this?',
  'Where is authentication handled?',
  'What breaks if this changes?',
  'Which tests cover this?',
  'Which services depend on this?',
  'Which prompts reuse this context?',
];

export const BUDGET_PROFILES = [
  { name: 'tiny', tokens: '2,000', use: 'Quick fixes, typos' },
  { name: 'small', tokens: '4,000', use: 'Single-function changes' },
  { name: 'balanced', tokens: '12,000', use: 'Default feature work' },
  { name: 'large', tokens: '24,000', use: 'Multi-module features' },
  { name: 'maximum-quality', tokens: '48,000', use: 'Refactors, migrations' },
  { name: 'maximum-savings', tokens: '1,500', use: 'Aggressive cost reduction' },
];

export const ALL_PACKAGES = [
  '@arsenal/core',
  '@arsenal/context-engine',
  '@arsenal/ui',
  '@arsenal/motion',
  '@arsenal/sections',
  '@arsenal/layouts',
  '@arsenal/budget',
  '@arsenal/policy',
  '@arsenal/prompt',
  '@arsenal/context',
  '@arsenal/retrieval',
  '@arsenal/summary',
  '@arsenal/knowledge',
  '@arsenal/session-memory',
  '@arsenal/cache',
  '@arsenal/observability',
  '@arsenal/dashboard',
  '@arsenal/testing',
  '@arsenal/generator',
];

export function getFeatureBySlug(slug: string): FeatureArea | undefined {
  return FEATURE_AREAS.find((feature) => feature.slug === slug);
}
