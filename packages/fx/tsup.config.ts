import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: true,
  clean: true,
  external: ["@arsenal/motion", "react", "react-dom", "framer-motion"],
  banner: {
    js: "'use client';",
  },
});
