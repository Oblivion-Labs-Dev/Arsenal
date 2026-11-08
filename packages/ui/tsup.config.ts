import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: true,
  clean: true,
  external: ["lightweight-charts", "react", "react-dom", "framer-motion", "@arsenal/motion", "react-intersection-observer"],
  banner: {
    js: "'use client';",
  },
});
