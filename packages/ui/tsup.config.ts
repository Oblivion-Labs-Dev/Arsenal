import { defineConfig } from "tsup";

const external = ["lightweight-charts", "react", "react-dom", "framer-motion", "@arsenal/motion", "react-intersection-observer"];

// No tsup `clean`: the two builds share dist and a clean in one races the other. `build` cleans first.
export default defineConfig([
  {
    entry: ["src/index.ts"],
    format: ["esm"],
    dts: true,
    external,
    banner: {
      js: "'use client';",
    },
  },
  {
    // Data only: no banner, so server components get real values instead of client references.
    entry: ["src/catalog.ts"],
    format: ["esm"],
    dts: true,
    external,
  },
]);
