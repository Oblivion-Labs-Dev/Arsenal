import type { AutoreviewConfig } from "./src/config/defaults.js";

/**
 * Example consumer config. Copy to your repository root as autoreview.config.ts
 * or autoreview.config.json.
 */
const config: Partial<AutoreviewConfig> = {
  baseBranch: "main",
  app: {
    startCommand: "pnpm dev",
    url: "http://localhost:3000",
    readyTimeoutMs: 60_000,
  },
  scope: {
    dependencyDepth: 2,
    reverseDependencyDepth: 1,
    maxRoutes: 3,
    maxScreenshots: 8,
    ignoredFiles: ["**/node_modules/**", "**/.env*"],
    ignoredRoutes: ["/admin/debug"],
    riskExpansionEnabled: true,
  },
  review: {
    mode: "fast",
    maxIterations: 2,
    maxCriticCalls: 2,
  },
  routeMappings: {
    "/components": ["src/components/Card.tsx", "src/components/ComponentCard.tsx"],
  },
  componentPreviewMappings: {
    "src/components/Card.tsx": "http://localhost:6006/?path=/story/card--default",
  },
};

export default config;
