// Zod schema to strict structured-output JSON Schema, ported from Kaka packages/ai/src/llm/strictSchema.ts.
import { z } from 'zod/v4';

export type JsonSchema = Record<string, unknown>;

/**
 * Converts a zod schema to the JSON Schema that strict structured output accepts: every object
 * closed, every property required. Optional values must be modelled as `.nullable()`, not
 * `.optional()`.
 *
 * It throws instead of quietly loosening a schema, because a non-strict schema is "best effort"
 * on several providers and fails at request time with a 400.
 */
export function toStrictJsonSchema(schema: z.ZodType): JsonSchema {
  const json = z.toJSONSchema(schema, { target: 'draft-7', io: 'output' }) as JsonSchema;
  delete json.$schema;
  assertStrict(json, '$');
  return json;
}

/** Throws if any object in `node` has optional properties; closes every object it finds. */
export function assertStrict(node: unknown, path: string): void {
  if (Array.isArray(node)) {
    node.forEach((item, index) => assertStrict(item, `${path}[${index}]`));
    return;
  }
  if (!node || typeof node !== 'object') return;
  const schema = node as JsonSchema;

  if (schema.type === 'object' || schema.properties) {
    const properties = Object.keys((schema.properties as JsonSchema | undefined) ?? {});
    const required = new Set((schema.required as string[] | undefined) ?? []);
    const missing = properties.filter((key) => !required.has(key));
    if (missing.length > 0) {
      throw new Error(
        `Schema at ${path} has optional properties (${missing.join(', ')}). ` +
          'Use .nullable() instead of .optional() for strict structured output.',
      );
    }
    schema.additionalProperties = false;
  }
  for (const [key, value] of Object.entries(schema)) {
    if (key === 'required' || key === 'enum') continue;
    assertStrict(value, `${path}.${key}`);
  }
}
