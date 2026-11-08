import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests/browser",
  reporter: "list",
  use: { launchOptions: { args: ["--use-angle=d3d11", "--enable-gpu"] } },
});
