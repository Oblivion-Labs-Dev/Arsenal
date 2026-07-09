import { defineSite } from "@arsenal/config";

export default defineSite({
  type: "docs",
  name: "Product Docs",
  tagline: "Everything you need to integrate.",
  theme: "obsidian-cyber",
  personality: "minimal-calm",
  pages: ["docs", "changelog"],
  modules: ["docs", "changelog", "search"],
  features: ["mdx", "versioning", "api-reference"],
});
