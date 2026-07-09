import { z } from "zod";

export const siteTypeSchema = z.enum([
  "saas",
  "chrome-extension",
  "portfolio",
  "dashboard",
  "docs",
  "internal-tool",
]);

export const themeIdSchema = z.enum([
  "obsidian-cyber",
  "ivory-graphite",
  "deep-forge",
]);

export const personalitySchema = z.enum([
  "premium-professional",
  "creative-bold",
  "minimal-calm",
]);

export const pageIdSchema = z.enum([
  "landing",
  "dashboard",
  "docs",
  "blog",
  "pricing",
  "auth",
  "admin",
  "changelog",
]);

export const moduleIdSchema = z.enum([
  "blog",
  "docs",
  "waitlist",
  "newsletter",
  "analytics",
  "contact-form",
  "dashboard",
  "admin",
  "changelog",
]);

export const sectionTypeSchema = z.enum([
  "hero",
  "features",
  "how-it-works",
  "timeline",
  "pricing",
  "faq",
  "testimonials",
  "dashboard-preview",
  "docs-preview",
  "blog-list",
  "contact",
  "cta",
  "cursor-showcase",
  "theme-gallery",
  "template-gallery",
  "config-preview",
  "pipeline",
  "module-marketplace",
]);

export const sectionConfigSchema = z.object({
  type: sectionTypeSchema,
  variant: z.string().optional(),
  props: z.record(z.unknown()).optional(),
});

export const siteConfigSchema = z.object({
  type: siteTypeSchema,
  name: z.string().min(1, "Site name is required"),
  tagline: z.string().min(1, "Tagline is required"),
  theme: themeIdSchema.default("obsidian-cyber"),
  personality: personalitySchema.default("premium-professional"),
  pages: z.array(pageIdSchema).min(1),
  modules: z.array(moduleIdSchema).default([]),
  features: z.array(z.string()).default([]),
  sections: z.array(sectionConfigSchema).optional(),
  seo: z
    .object({
      title: z.string().optional(),
      description: z.string().optional(),
      ogImage: z.string().optional(),
    })
    .optional(),
});

export type SiteType = z.infer<typeof siteTypeSchema>;
export type ThemeId = z.infer<typeof themeIdSchema>;
export type Personality = z.infer<typeof personalitySchema>;
export type PageId = z.infer<typeof pageIdSchema>;
export type ModuleId = z.infer<typeof moduleIdSchema>;
export type SectionType = z.infer<typeof sectionTypeSchema>;
export type SectionConfig = z.infer<typeof sectionConfigSchema>;
export type SiteConfig = z.infer<typeof siteConfigSchema>;

export function defineSite(config: z.input<typeof siteConfigSchema>): SiteConfig {
  const result = siteConfigSchema.safeParse(config);
  if (!result.success) {
    const messages = result.error.issues
      .map((issue) => `  • ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`Invalid site config:\n${messages}`);
  }
  return result.data;
}

export function validateSiteConfig(config: unknown): SiteConfig {
  return siteConfigSchema.parse(config);
}

export const DEFAULT_SECTIONS: Record<SiteType, SectionConfig[]> = {
  saas: [
    { type: "hero", variant: "aurora-command" },
    { type: "features", variant: "bento-glass" },
    { type: "how-it-works", variant: "flow-line" },
    { type: "pricing", variant: "tier-cards" },
    { type: "faq", variant: "accordion" },
    { type: "cta", variant: "forge-glow" },
  ],
  "chrome-extension": [
    { type: "hero", variant: "aurora-command" },
    { type: "features", variant: "bento-glass" },
    { type: "how-it-works", variant: "flow-line" },
    { type: "dashboard-preview", variant: "floating-panels" },
    { type: "faq", variant: "accordion" },
    { type: "cta", variant: "forge-glow" },
  ],
  portfolio: [
    { type: "hero", variant: "minimal-spotlight" },
    { type: "timeline", variant: "vertical-glow" },
    { type: "testimonials", variant: "carousel" },
    { type: "contact", variant: "split-form" },
  ],
  dashboard: [
    { type: "hero", variant: "dashboard-intro" },
    { type: "dashboard-preview", variant: "floating-panels" },
    { type: "features", variant: "bento-glass" },
  ],
  docs: [
    { type: "hero", variant: "docs-command" },
    { type: "docs-preview", variant: "sidebar-preview" },
    { type: "features", variant: "bento-glass" },
  ],
  "internal-tool": [
    { type: "hero", variant: "minimal-spotlight" },
    { type: "features", variant: "bento-glass" },
    { type: "cta", variant: "forge-glow" },
  ],
};

export function resolveSections(config: SiteConfig): SectionConfig[] {
  return config.sections ?? DEFAULT_SECTIONS[config.type] ?? [];
}

export {
  defineProject,
  resolveProjectToSite,
  projectBlueprintSchema,
  projectDomainSchema,
  projectAudienceSchema,
  projectCapabilitySchema,
  type ProjectBlueprint,
  type ProjectDomain,
  type ProjectAudience,
  type ProjectCapability,
} from "./blueprint.js";
