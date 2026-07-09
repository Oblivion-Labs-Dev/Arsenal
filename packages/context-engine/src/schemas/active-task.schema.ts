import { z } from "zod";

export const ActiveTaskSchema = z.object({
  title: z.string().default(""),
  status: z.enum(["active", "blocked", "done"]).default("active"),
  query: z.string().optional(),
  filesTouched: z.array(z.string()).default([]),
  decisions: z.array(z.string()).default([]),
  pitfalls: z.array(z.string()).default([]),
  testsRun: z.array(z.string()).default([]),
  nextSteps: z.array(z.string()).default([]),
  updatedAt: z.string(),
});

export type ActiveTask = z.infer<typeof ActiveTaskSchema>;
