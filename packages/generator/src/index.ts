import type { ProjectBlueprint, SiteConfig } from "@arsenal/config";

export function generateSiteConfigFile(config: SiteConfig): string {
  return `import { defineSite } from "@arsenal/config";

export default defineSite(${JSON.stringify(config, null, 2)});
`;
}

export function generateProjectBlueprintFile(blueprint: ProjectBlueprint): string {
  return `import { defineProject } from "@arsenal/config";

export default defineProject(${JSON.stringify(blueprint, null, 2)});
`;
}

export function generatePackageJson(name: string): string {
  return JSON.stringify(
    {
      name,
      version: "0.1.0",
      private: true,
      scripts: {
        dev: "next dev",
        build: "next build",
        start: "next start",
      },
      dependencies: {
        "@arsenal/config": "workspace:*",
        "@arsenal/layouts": "workspace:*",
        "@arsenal/sections": "workspace:*",
        "@arsenal/themes": "workspace:*",
        "@arsenal/ui": "workspace:*",
        next: "^15.1.0",
        react: "^18.3.1",
        "react-dom": "^18.3.1",
      },
    },
    null,
    2,
  );
}

export const CLI_COMMANDS = [
  "create",
  "blueprint",
  "add",
  "theme",
  "preview",
  "doctor",
  "audit",
  "analyze",
  "context",
] as const;
