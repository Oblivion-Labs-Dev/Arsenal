import { z } from 'zod';
import * as dotenv from 'dotenv';
export const BaseConfigSchema = z.object({
  nodeEnv: z.string().default('development'),
});
export function loadBaseConfig() {
  dotenv.config();
  return BaseConfigSchema.parse({
    nodeEnv: process.env.NODE_ENV,
  });
}
