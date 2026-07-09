import { z } from "zod";

export const FileSummarySchema = z.object({
  path: z.string(),
  purpose: z.string(),
  exports: z.array(z.string()).default([]),
  imports: z.array(z.string()).default([]),
  keySymbols: z.array(z.string()).default([]),
  sideEffects: z.array(z.string()).default([]),
  dependsOn: z.array(z.string()).default([]),
  usedBy: z.array(z.string()).default([]),
  tests: z.array(z.string()).default([]),
  risks: z.array(z.string()).default([]),
  lastHash: z.string(),
});

export type FileSummary = z.infer<typeof FileSummarySchema>;
