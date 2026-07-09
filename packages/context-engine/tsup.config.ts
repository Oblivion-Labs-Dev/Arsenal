import { defineConfig } from "tsup";
import { cpSync, mkdirSync } from "fs";
import { join } from "path";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    "cli/arsenal-context-cli": "src/cli/arsenal-context-cli.ts",
  },
  format: ["esm"],
  dts: true,
  clean: true,
  onSuccess: async () => {
    const dest = join("dist", "templates");
    mkdirSync(dest, { recursive: true });
    cpSync("src/templates", dest, { recursive: true });
    const uiDest = join("dist", "dashboard", "dashboard-ui");
    mkdirSync(uiDest, { recursive: true });
    cpSync("src/dashboard/dashboard-ui", uiDest, { recursive: true });
  },
});
