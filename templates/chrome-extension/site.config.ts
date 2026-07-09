import { defineSite } from "@arsenal/config";

export default defineSite({
  type: "chrome-extension",
  name: "ApplyPilot",
  tagline: "Autofill job applications with memory.",
  theme: "obsidian-cyber",
  personality: "premium-professional",
  pages: ["landing", "dashboard", "docs"],
  modules: ["waitlist", "blog", "analytics"],
  features: ["autofill", "resume-attach", "cover-letter", "job-tracker", "self-learning-answers"],
});
