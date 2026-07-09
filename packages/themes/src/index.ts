import type { ThemeId } from "@arsenal/config";

export interface ThemePalette {
  id: ThemeId;
  label: string;
  mode: "dark" | "light";
  colors: Record<string, string>;
}

export const OBSIDIAN_CYBER: ThemePalette = {
  id: "obsidian-cyber",
  label: "Obsidian Cyber",
  mode: "dark",
  colors: {
    background: "#070A12",
    surface: "#0D111C",
    elevated: "#131A2A",
    border: "#263044",
    "text-primary": "#F4F7FB",
    "text-secondary": "#AAB4C3",
    muted: "#687386",
    accent: "#47E6FF",
    "accent-cyan": "#47E6FF",
    "accent-violet": "#8B5CF6",
    "accent-gold": "#F6C85F",
    danger: "#FF5C7A",
    success: "#44D19D",
  },
};

export const IVORY_GRAPHITE: ThemePalette = {
  id: "ivory-graphite",
  label: "Ivory Graphite",
  mode: "light",
  colors: {
    background: "#F7F3EA",
    surface: "#FFFFFF",
    elevated: "#EFE7DA",
    border: "#DDD2BF",
    "text-primary": "#171717",
    "text-secondary": "#515151",
    muted: "#79716B",
    accent: "#2F3542",
    "accent-graphite": "#2F3542",
    "accent-blue": "#3B82F6",
    "accent-amber": "#D99A29",
    danger: "#DC2626",
    success: "#16A34A",
  },
};

export const DEEP_FORGE: ThemePalette = {
  id: "deep-forge",
  label: "Deep Forge",
  mode: "dark",
  colors: {
    background: "#030201",
    surface: "#0A0705",
    elevated: "#14100C",
    border: "#3D2818",
    "text-primary": "#FFF8F0",
    "text-secondary": "#E8C9A8",
    muted: "#9A7A5C",
    accent: "#FF6A00",
    ember: "#FF6A00",
    "molten-gold": "#FFB020",
    "steel-blue": "#5AA9E6",
    danger: "#FF4466",
    success: "#3DD68C",
  },
};

export const THEMES: Record<ThemeId, ThemePalette> = {
  "obsidian-cyber": OBSIDIAN_CYBER,
  "ivory-graphite": IVORY_GRAPHITE,
  "deep-forge": DEEP_FORGE,
};

export function getTheme(id: ThemeId): ThemePalette {
  return THEMES[id];
}

/** Convert palette to CSS custom properties for :root */
export function themeToCssVariables(theme: ThemePalette): Record<string, string> {
  const vars: Record<string, string> = {
    "--arsenal-mode": theme.mode,
  };
  for (const [key, value] of Object.entries(theme.colors)) {
    vars[`--arsenal-${key}`] = value;
  }
  return vars;
}

export function themeToCssString(theme: ThemePalette): string {
  const vars = themeToCssVariables(theme);
  return Object.entries(vars)
    .map(([k, v]) => `${k}: ${v};`)
    .join("\n  ");
}

/** Tailwind-compatible token map (uses CSS variables set by active theme) */
export function themeToTailwindTokens(_theme?: ThemePalette) {
  return {
    colors: {
      arsenal: {
        background: "var(--arsenal-background)",
        surface: "var(--arsenal-surface)",
        elevated: "var(--arsenal-elevated)",
        border: "var(--arsenal-border)",
        primary: "var(--arsenal-text-primary)",
        secondary: "var(--arsenal-text-secondary)",
        muted: "var(--arsenal-muted)",
        accent: "var(--arsenal-accent)",
        danger: "var(--arsenal-danger)",
        success: "var(--arsenal-success)",
      },
    },
    borderRadius: {
      arsenal: "1rem",
      "arsenal-sm": "0.5rem",
      "arsenal-lg": "1.5rem",
    },
    boxShadow: {
      arsenal: "0 8px 32px rgba(0,0,0,0.35)",
      "arsenal-glow": "0 0 40px color-mix(in srgb, var(--arsenal-accent) 25%, transparent)",
    },
  };
}

export function createTailwindPreset(themeId: ThemeId = "deep-forge") {
  const palette = getTheme(themeId);
  return {
    theme: {
      extend: themeToTailwindTokens(palette),
    },
  };
}
