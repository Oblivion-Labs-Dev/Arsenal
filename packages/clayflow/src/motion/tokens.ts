export const MOTION = {
  activation: { min: 250, max: 400, default: 320 },
  lift: { min: 300, max: 450, default: 380 },
  transform: { min: 500, max: 850, default: 680 },
  connector: { min: 400, max: 700, default: 560 },
  packet: { min: 700, max: 1500, default: 1100 },
  group: { min: 400, max: 650, default: 520 },
  status: { min: 250, max: 450, default: 340 },
  scene: { min: 600, max: 1000, default: 800 },
} as const;

export const EASE = {
  standard: "cubic-bezier(0.22,1,0.36,1)",
  emphasized: "cubic-bezier(0.2,0,0,1)",
  exit: "cubic-bezier(0.4,0,1,1)",
} as const;

const durationProperties = Object.entries(MOTION)
  .map(([name, token]) => `  --cf-dur-${name}: ${token.default}ms;`)
  .join("\n");
const easeProperties = Object.entries(EASE)
  .map(([name, value]) => `  --cf-ease-${name}: ${value};`)
  .join("\n");
const reducedDurations = Object.keys(MOTION)
  .map((name) => `    --cf-dur-${name}: 0ms;`)
  .join("\n");

export const MOTION_CSS = `.cf {\n${durationProperties}\n${easeProperties}\n}\n@media (prefers-reduced-motion: reduce) {\n  .cf {\n${reducedDurations}\n  }\n}`;
