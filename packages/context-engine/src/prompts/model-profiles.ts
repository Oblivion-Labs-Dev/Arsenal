export const MODEL_PROFILES = {
  claude: {
    name: "claude",
    maxContextHint: 200000,
    preferMarkdown: true,
    bulletStyle: "-",
  },
  cursor: {
    name: "cursor",
    maxContextHint: 128000,
    preferMarkdown: true,
    bulletStyle: "-",
  },
  openai: {
    name: "openai",
    maxContextHint: 128000,
    preferMarkdown: false,
    bulletStyle: "-",
  },
} as const;

export type ModelProfileName = keyof typeof MODEL_PROFILES;

export function getModelProfile(name: string) {
  return MODEL_PROFILES[name as ModelProfileName] ?? MODEL_PROFILES.claude;
}
