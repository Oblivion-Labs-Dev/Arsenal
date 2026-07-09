import { describe, expect, it } from "vitest";
import { definePlugin, mergePlugins } from "./index.js";

describe("plugins", () => {
  it("merges plugin surfaces", () => {
    const stripe = definePlugin({
      name: "Stripe",
      components: [{ id: "checkout", exportName: "StripeCheckout" }],
      routes: [{ path: "/billing", component: "StripeCheckout" }],
    });
    const clerk = definePlugin({
      name: "Clerk",
      routes: [{ path: "/sign-in", component: "SignIn" }],
    });

    const merged = mergePlugins([stripe, clerk]);
    expect(merged.pluginNames).toEqual(["Stripe", "Clerk"]);
    expect(merged.routes).toHaveLength(2);
    expect(merged.components).toHaveLength(1);
  });
});
