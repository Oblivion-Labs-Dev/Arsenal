import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: true,
  clean: true,
  external: ["@arsenal/fx", "@react-three/fiber", "three", "react", "react-dom"],
  banner: {
    js: "'use client';",
  },
});
