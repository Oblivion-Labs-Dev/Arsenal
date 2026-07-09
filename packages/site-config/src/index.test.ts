import { describe, expect, it } from "vitest";
import { defineSite, resolveSections } from "./index";

describe("defineSite", () => {
  it("validates and returns site config", () => {
    const site = defineSite({
      type: "chrome-extension",
      name: "ApplyPilot",
      tagline: "Autofill job applications with memory.",
      theme: "obsidian-cyber",
      personality: "premium-professional",
      pages: ["landing", "dashboard", "docs"],
      modules: ["waitlist", "blog", "analytics"],
      features: ["autofill", "resume-attach"],
    });
    expect(site.name).toBe("ApplyPilot");
    expect(site.theme).toBe("obsidian-cyber");
  });

  it("throws helpful errors on invalid config", () => {
    expect(() =>
      defineSite({
        type: "saas",
        name: "",
        tagline: "x",
        pages: [],
      } as never),
    ).toThrow(/Invalid site config/);
  });

  it("resolves default sections by type", () => {
    const site = defineSite({
      type: "saas",
      name: "Test",
      tagline: "Test tagline",
      pages: ["landing"],
    });
    const sections = resolveSections(site);
    expect(sections.length).toBeGreaterThan(0);
    expect(sections[0]?.type).toBe("hero");
  });
});
