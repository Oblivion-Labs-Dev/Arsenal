import { defineSite } from "@arsenal/config";

export default defineSite({
  type: "saas",
  name: "My SaaS",
  tagline: "Ship faster with Arsenal.",
  theme: "obsidian-cyber",
  personality: "premium-professional",
  pages: ["landing", "pricing", "blog"],
  modules: ["waitlist", "blog", "analytics"],
  features: ["auth", "billing", "team"],
});
