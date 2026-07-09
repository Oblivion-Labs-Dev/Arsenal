import { z } from "zod";
import type { ModuleId, PageId, Personality, SiteConfig, SiteType, ThemeId } from "./index.js";
import { defineSite } from "./index.js";

export const projectDomainSchema = z.enum([
  "finance",
  "career",
  "developer-tools",
  "education",
  "productivity",
  "ai",
  "internal",
  "marketing",
  "gaming",
  "health",
]);

export const projectAudienceSchema = z.enum([
  "consumers",
  "developers",
  "enterprises",
  "creators",
  "students",
  "teams",
]);

export const projectCapabilitySchema = z.enum([
  "landing-page",
  "dashboard",
  "docs",
  "blog",
  "auth",
  "admin",
  "analytics",
  "ai-chat",
  "waitlist",
  "newsletter",
  "pricing",
  "changelog",
  "chrome-extension",
  "portfolio",
  "contact",
]);

export const projectBlueprintSchema = z.object({
  brand: z.string().min(1),
  tagline: z.string().optional(),
  domain: projectDomainSchema,
  audience: projectAudienceSchema,
  capabilities: z.array(projectCapabilitySchema).min(1),
  theme: z
    .object({
      id: z.enum(["obsidian-cyber", "ivory-graphite", "deep-forge"]).optional(),
      material: z
        .enum(["glass", "clay", "liquid", "metal", "paper", "carbon", "neumorphism", "cyber"])
        .optional(),
      mood: z
        .enum([
          "minimal",
          "elegant",
          "luxury",
          "playful",
          "scientific",
          "creative",
          "enterprise",
          "gaming",
        ])
        .optional(),
    })
    .optional(),
  personality: z
    .enum(["premium-professional", "creative-bold", "minimal-calm"])
    .optional(),
  features: z.array(z.string()).default([]),
  plugins: z.array(z.string()).default([]),
});

export type ProjectDomain = z.infer<typeof projectDomainSchema>;
export type ProjectAudience = z.infer<typeof projectAudienceSchema>;
export type ProjectCapability = z.infer<typeof projectCapabilitySchema>;
export type ProjectBlueprint = z.infer<typeof projectBlueprintSchema>;

const DOMAIN_DEFAULTS: Record<
  ProjectDomain,
  { theme: ThemeId; personality: Personality; siteType: SiteType }
> = {
  finance: { theme: "deep-forge", personality: "premium-professional", siteType: "saas" },
  career: { theme: "obsidian-cyber", personality: "premium-professional", siteType: "saas" },
  "developer-tools": {
    theme: "obsidian-cyber",
    personality: "creative-bold",
    siteType: "saas",
  },
  education: { theme: "ivory-graphite", personality: "minimal-calm", siteType: "docs" },
  productivity: { theme: "ivory-graphite", personality: "premium-professional", siteType: "saas" },
  ai: { theme: "obsidian-cyber", personality: "creative-bold", siteType: "saas" },
  internal: { theme: "ivory-graphite", personality: "minimal-calm", siteType: "internal-tool" },
  marketing: { theme: "deep-forge", personality: "creative-bold", siteType: "saas" },
  gaming: { theme: "deep-forge", personality: "creative-bold", siteType: "saas" },
  health: { theme: "ivory-graphite", personality: "minimal-calm", siteType: "saas" },
};

const CAPABILITY_PAGES: Partial<Record<ProjectCapability, PageId[]>> = {
  "landing-page": ["landing"],
  dashboard: ["dashboard"],
  docs: ["docs"],
  blog: ["blog"],
  auth: ["auth"],
  admin: ["admin"],
  pricing: ["pricing"],
  changelog: ["changelog"],
};

const CAPABILITY_MODULES: Partial<Record<ProjectCapability, ModuleId[]>> = {
  dashboard: ["dashboard"],
  docs: ["docs"],
  blog: ["blog"],
  analytics: ["analytics"],
  "ai-chat": [],
  waitlist: ["waitlist"],
  newsletter: ["newsletter"],
  changelog: ["changelog"],
  admin: ["admin"],
  contact: ["contact-form"],
};

const CAPABILITY_FEATURES: Partial<Record<ProjectCapability, string[]>> = {
  "ai-chat": ["ai-chat"],
  analytics: ["analytics"],
  "chrome-extension": ["browser-extension"],
};

export function defineProject(input: z.input<typeof projectBlueprintSchema>): ProjectBlueprint {
  const result = projectBlueprintSchema.safeParse(input);
  if (!result.success) {
    const messages = result.error.issues
      .map((issue) => `  • ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`Invalid project blueprint:\n${messages}`);
  }
  return result.data;
}

export function resolveProjectToSite(blueprint: ProjectBlueprint): SiteConfig {
  const defaults = DOMAIN_DEFAULTS[blueprint.domain];

  const pages = new Set<PageId>(["landing"]);
  const modules = new Set<ModuleId>();
  const features = new Set<string>(blueprint.features);

  let siteType = defaults.siteType;

  for (const capability of blueprint.capabilities) {
    for (const page of CAPABILITY_PAGES[capability] ?? []) pages.add(page);
    for (const mod of CAPABILITY_MODULES[capability] ?? []) modules.add(mod);
    for (const feature of CAPABILITY_FEATURES[capability] ?? []) features.add(feature);
    if (capability === "chrome-extension") siteType = "chrome-extension";
    if (capability === "portfolio") siteType = "portfolio";
  }

  if (blueprint.capabilities.includes("dashboard") && !blueprint.capabilities.includes("landing-page")) {
    pages.delete("landing");
  }

  return defineSite({
    type: siteType,
    name: blueprint.brand,
    tagline: blueprint.tagline ?? `${blueprint.brand} — built for ${blueprint.audience}`,
    theme: blueprint.theme?.id ?? defaults.theme,
    personality: blueprint.personality ?? defaults.personality,
    pages: [...pages],
    modules: [...modules],
    features: [...features],
    seo: {
      title: blueprint.brand,
      description: blueprint.tagline ?? `${blueprint.brand} for ${blueprint.audience}`,
    },
  });
}
