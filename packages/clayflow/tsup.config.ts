import { defineConfig } from "tsup";

const external = ["react", "react-dom", "zod"];

// No tsup `clean`: the two builds share dist; `build` cleans first.
export default defineConfig([
  // Engine: pure TS (schema, layout, SVG renderer, runtime script). Server-safe, no banner.
  { entry: ["src/index.ts"], format: ["esm"], dts: true, external },
  // React wrapper and gallery.
  { entry: { react: "src/react/index.ts" }, format: ["esm"], dts: true, external, banner: { js: "'use client';" } },
]);
