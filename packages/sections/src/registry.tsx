import type { SectionConfig } from "@arsenal/config";
import { Hero } from "./hero";
import { BentoFeatures } from "./bento-features";
import { BuilderPipeline } from "./builder-pipeline";
import { ConfigPreview } from "./config-preview";
import { TemplateGallery } from "./template-gallery";
import { CursorShowcase } from "./cursor-showcase";
import { ThemeGallery } from "./theme-gallery";
import { ModuleMarketplace } from "./module-marketplace";
import { FAQ } from "./faq";
import { CTASection } from "./cta";

const SECTION_MAP = {
  hero: Hero,
  features: BentoFeatures,
  pipeline: BuilderPipeline,
  "config-preview": ConfigPreview,
  "template-gallery": TemplateGallery,
  "cursor-showcase": CursorShowcase,
  "theme-gallery": ThemeGallery,
  "module-marketplace": ModuleMarketplace,
  faq: FAQ,
  cta: CTASection,
} as const;

export type SectionComponentKey = keyof typeof SECTION_MAP;

export function renderSection(section: SectionConfig, index: number) {
  const Component = SECTION_MAP[section.type as SectionComponentKey];
  if (!Component) return null;
  return <Component key={`${section.type}-${index}`} />;
}

export function SectionRenderer({ sections }: { sections: SectionConfig[] }) {
  return <>{sections.map((s, i) => renderSection(s, i))}</>;
}

export {
  Hero,
  BentoFeatures,
  BuilderPipeline,
  ConfigPreview,
  TemplateGallery,
  CursorShowcase,
  ThemeGallery,
  ModuleMarketplace,
  FAQ,
  CTASection,
};
