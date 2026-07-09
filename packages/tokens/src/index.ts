export type Material =
  | "glass"
  | "clay"
  | "liquid"
  | "metal"
  | "paper"
  | "carbon"
  | "neumorphism"
  | "cyber";

export type Mood =
  | "minimal"
  | "elegant"
  | "luxury"
  | "playful"
  | "scientific"
  | "creative"
  | "enterprise"
  | "gaming";

export interface DesignLanguage {
  material: Material;
  mood: Mood;
}

export interface DesignTokens {
  spacing: Record<string, string>;
  fontSize: Record<string, string>;
  fontWeight: Record<string, number>;
  lineHeight: Record<string, number>;
  borderRadius: Record<string, string>;
  boxShadow: Record<string, string>;
  elevation: Record<string, string>;
  motion: {
    duration: Record<string, string>;
    easing: Record<string, string>;
  };
  opacity: Record<string, number>;
  blur: Record<string, string>;
}

const MATERIAL_RADIUS: Record<Material, string> = {
  glass: "1rem",
  clay: "1.25rem",
  liquid: "1.5rem",
  metal: "0.375rem",
  paper: "0.5rem",
  carbon: "0.25rem",
  neumorphism: "1rem",
  cyber: "0.125rem",
};

const MOOD_SPACING_SCALE: Record<Mood, number> = {
  minimal: 0.9,
  elegant: 1,
  luxury: 1.15,
  playful: 1.05,
  scientific: 0.95,
  creative: 1.1,
  enterprise: 1,
  gaming: 1.2,
};

const MOOD_SHADOW: Record<Mood, string> = {
  minimal: "0 1px 2px rgba(0,0,0,0.06)",
  elegant: "0 8px 24px rgba(0,0,0,0.12)",
  luxury: "0 16px 48px rgba(0,0,0,0.22)",
  playful: "0 10px 30px rgba(0,0,0,0.14)",
  scientific: "0 2px 8px rgba(0,0,0,0.08)",
  creative: "0 12px 36px rgba(0,0,0,0.16)",
  enterprise: "0 4px 16px rgba(0,0,0,0.1)",
  gaming: "0 0 32px rgba(99,102,241,0.35)",
};

const MOOD_EASING: Record<Mood, string> = {
  minimal: "cubic-bezier(0.4, 0, 0.2, 1)",
  elegant: "cubic-bezier(0.22, 1, 0.36, 1)",
  luxury: "cubic-bezier(0.19, 1, 0.22, 1)",
  playful: "cubic-bezier(0.34, 1.56, 0.64, 1)",
  scientific: "cubic-bezier(0.4, 0, 0.2, 1)",
  creative: "cubic-bezier(0.68, -0.55, 0.27, 1.55)",
  enterprise: "cubic-bezier(0.4, 0, 0.2, 1)",
  gaming: "cubic-bezier(0.25, 0.46, 0.45, 0.94)",
};

/** Derive a full design token scale from material + mood. */
export function generateDesignTokens(language: DesignLanguage): DesignTokens {
  const scale = MOOD_SPACING_SCALE[language.mood];
  const base = 4 * scale;

  const spacing: Record<string, string> = {};
  for (const [key, mult] of Object.entries({ xs: 1, sm: 2, md: 4, lg: 6, xl: 8, "2xl": 12, "3xl": 16 })) {
    spacing[key] = `${base * mult}px`;
  }

  return {
    spacing,
    fontSize: {
      xs: "0.75rem",
      sm: "0.875rem",
      base: "1rem",
      lg: "1.125rem",
      xl: "1.25rem",
      "2xl": "1.5rem",
      "3xl": "1.875rem",
      "4xl": "2.25rem",
      "5xl": "3rem",
    },
    fontWeight: { normal: 400, medium: 500, semibold: 600, bold: 700 },
    lineHeight: { tight: 1.2, normal: 1.5, relaxed: 1.75 },
    borderRadius: {
      sm: `calc(${MATERIAL_RADIUS[language.material]} * 0.5)`,
      md: MATERIAL_RADIUS[language.material],
      lg: `calc(${MATERIAL_RADIUS[language.material]} * 1.5)`,
      full: "9999px",
    },
    boxShadow: {
      sm: MOOD_SHADOW[language.mood],
      md: MOOD_SHADOW[language.mood],
      lg: MOOD_SHADOW[language.mood],
      glow: "0 0 40px color-mix(in srgb, var(--arsenal-accent) 30%, transparent)",
    },
    elevation: { 0: "none", 1: MOOD_SHADOW[language.mood], 2: MOOD_SHADOW[language.mood] },
    motion: {
      duration: { fast: "150ms", normal: "300ms", slow: "500ms" },
      easing: { default: MOOD_EASING[language.mood], enter: MOOD_EASING[language.mood] },
    },
    opacity: { muted: 0.6, overlay: 0.8, disabled: 0.4 },
    blur: {
      sm: language.material === "glass" ? "8px" : "4px",
      md: language.material === "glass" ? "16px" : "8px",
      lg: language.material === "glass" ? "24px" : "12px",
    },
  };
}

export function tokensToCssVariables(tokens: DesignTokens): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const [key, value] of Object.entries(tokens.spacing)) vars[`--arsenal-space-${key}`] = value;
  for (const [key, value] of Object.entries(tokens.borderRadius))
    vars[`--arsenal-radius-${key}`] = value;
  for (const [key, value] of Object.entries(tokens.boxShadow))
    vars[`--arsenal-shadow-${key}`] = value;
  for (const [key, value] of Object.entries(tokens.motion.duration))
    vars[`--arsenal-duration-${key}`] = value;
  for (const [key, value] of Object.entries(tokens.motion.easing))
    vars[`--arsenal-easing-${key}`] = value;
  return vars;
}
