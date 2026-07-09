import arsenalPreset from "../../packages/ui/tailwind.preset";

/** @type {import('tailwindcss').Config} */
export default {
  presets: [arsenalPreset],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "../../packages/ui/src/**/*.{ts,tsx}",
    "../../packages/sections/src/**/*.{ts,tsx}",
    "../../packages/layouts/src/**/*.{ts,tsx}",
  ],
  plugins: [],
};
