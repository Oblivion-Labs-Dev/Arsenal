import { describe, expect, it } from "vitest";
import { defineProject, resolveProjectToSite } from "./blueprint.js";

describe("project blueprint", () => {
  it("maps FinanceOS-style blueprint to a full site config", () => {
    const blueprint = defineProject({
      domain: "finance",
      audience: "consumers",
      brand: "FinanceOS",
      tagline: "Personal finance with memory.",
      capabilities: ["dashboard", "ai-chat", "analytics", "docs", "landing-page"],
    });

    const site = resolveProjectToSite(blueprint);

    expect(site.name).toBe("FinanceOS");
    expect(site.theme).toBe("deep-forge");
    expect(site.pages).toContain("dashboard");
    expect(site.pages).toContain("docs");
    expect(site.modules).toContain("analytics");
    expect(site.features).toContain("ai-chat");
  });

  it("selects chrome-extension site type from capability", () => {
    const site = resolveProjectToSite(
      defineProject({
        domain: "career",
        audience: "consumers",
        brand: "ApplyPilot",
        capabilities: ["chrome-extension", "landing-page", "docs"],
      }),
    );

    expect(site.type).toBe("chrome-extension");
    expect(site.pages).toContain("docs");
  });
});
