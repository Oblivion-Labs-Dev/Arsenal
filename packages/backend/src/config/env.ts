import { z } from "zod";

/** Parse and validate environment variables with a Zod schema. */
export function parseEnv<T extends z.ZodTypeAny>(schema: T, env: NodeJS.ProcessEnv = process.env): z.infer<T> {
  const result = schema.safeParse(env);
  if (!result.success) {
    const formatted = result.error.flatten().fieldErrors;
    const message = Object.entries(formatted)
      .map(([key, errors]) => `${key}: ${(errors ?? []).join(", ")}`)
      .join("; ");
    throw new Error(`Invalid environment configuration: ${message}`);
  }
  return result.data;
}

/** Common OpenRouter-related env schema (keys supplied by consuming app). */
export const openRouterEnvSchema = z.object({
  OPENROUTER_API_KEY: z.string().min(1).optional(),
  OPENROUTER_MODEL: z.string().default("openrouter/free"),
  OPENROUTER_API_URL: z.string().url().optional(),
  APP_URL: z.string().url().optional(),
});

export type OpenRouterEnv = z.infer<typeof openRouterEnvSchema>;

/** Read OpenRouter config from environment without embedding secrets in library code. */
export function readOpenRouterEnv(env: NodeJS.ProcessEnv = process.env): OpenRouterEnv {
  return parseEnv(openRouterEnvSchema, env);
}
