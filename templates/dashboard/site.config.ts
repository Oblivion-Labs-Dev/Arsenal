import { defineSite } from "@arsenal/config";

export default defineSite({
  type: "dashboard",
  name: "Command Center",
  tagline: "Your operations at a glance.",
  theme: "deep-forge",
  personality: "premium-professional",
  pages: ["dashboard", "admin"],
  modules: ["dashboard", "analytics", "admin"],
  features: ["metrics", "alerts", "team"],
});
