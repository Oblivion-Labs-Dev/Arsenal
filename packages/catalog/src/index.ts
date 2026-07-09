export type IconId =
  | "analytics"
  | "dashboard"
  | "resume"
  | "automation"
  | "spark"
  | "forge"
  | "docs"
  | "pricing"
  | "settings"
  | "chat";

export type BackgroundId =
  | "animated-mesh"
  | "noise"
  | "aurora"
  | "stars"
  | "particles"
  | "grid"
  | "gradient"
  | "glass-blobs"
  | "forge-sparks"
  | "neural-network"
  | "circuit-board"
  | "liquid-metal";

export type IllustrationId =
  | "orbs"
  | "particles"
  | "grids"
  | "waves"
  | "dots"
  | "planets"
  | "rings"
  | "dashboard-graphic"
  | "browser-mockup"
  | "chrome-extension-mockup"
  | "ai-graphic";

export interface CatalogEntry<T extends string> {
  id: T;
  label: string;
  category: string;
}

export const ICONS: Record<IconId, CatalogEntry<IconId>> = {
  analytics: { id: "analytics", label: "Analytics", category: "data" },
  dashboard: { id: "dashboard", label: "Dashboard", category: "navigation" },
  resume: { id: "resume", label: "Resume", category: "career" },
  automation: { id: "automation", label: "Automation", category: "workflow" },
  spark: { id: "spark", label: "Spark", category: "brand" },
  forge: { id: "forge", label: "Forge", category: "brand" },
  docs: { id: "docs", label: "Docs", category: "navigation" },
  pricing: { id: "pricing", label: "Pricing", category: "commerce" },
  settings: { id: "settings", label: "Settings", category: "navigation" },
  chat: { id: "chat", label: "Chat", category: "ai" },
};

export const BACKGROUNDS: Record<BackgroundId, CatalogEntry<BackgroundId>> = {
  "animated-mesh": { id: "animated-mesh", label: "Animated Mesh", category: "ambient" },
  noise: { id: "noise", label: "Noise", category: "texture" },
  aurora: { id: "aurora", label: "Aurora", category: "ambient" },
  stars: { id: "stars", label: "Stars", category: "ambient" },
  particles: { id: "particles", label: "Particles", category: "ambient" },
  grid: { id: "grid", label: "Grid", category: "structure" },
  gradient: { id: "gradient", label: "Gradient", category: "ambient" },
  "glass-blobs": { id: "glass-blobs", label: "Glass Blobs", category: "glass" },
  "forge-sparks": { id: "forge-sparks", label: "Forge Sparks", category: "brand" },
  "neural-network": { id: "neural-network", label: "Neural Network", category: "ai" },
  "circuit-board": { id: "circuit-board", label: "Circuit Board", category: "tech" },
  "liquid-metal": { id: "liquid-metal", label: "Liquid Metal", category: "glass" },
};

export const ILLUSTRATIONS: Record<IllustrationId, CatalogEntry<IllustrationId>> = {
  orbs: { id: "orbs", label: "Orbs", category: "abstract" },
  particles: { id: "particles", label: "Particles", category: "abstract" },
  grids: { id: "grids", label: "Grids", category: "structure" },
  waves: { id: "waves", label: "Waves", category: "abstract" },
  dots: { id: "dots", label: "Dots", category: "abstract" },
  planets: { id: "planets", label: "Planets", category: "space" },
  rings: { id: "rings", label: "Rings", category: "abstract" },
  "dashboard-graphic": { id: "dashboard-graphic", label: "Dashboard Graphic", category: "product" },
  "browser-mockup": { id: "browser-mockup", label: "Browser Mockup", category: "product" },
  "chrome-extension-mockup": {
    id: "chrome-extension-mockup",
    label: "Chrome Extension Mockup",
    category: "product",
  },
  "ai-graphic": { id: "ai-graphic", label: "AI Graphic", category: "ai" },
};

export function getIcon(id: IconId): CatalogEntry<IconId> {
  return ICONS[id];
}

export function getBackground(id: BackgroundId): CatalogEntry<BackgroundId> {
  return BACKGROUNDS[id];
}

export function getIllustration(id: IllustrationId): CatalogEntry<IllustrationId> {
  return ILLUSTRATIONS[id];
}
