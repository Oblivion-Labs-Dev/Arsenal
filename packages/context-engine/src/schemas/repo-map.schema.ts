import { z } from "zod";

export const RepoFileEntrySchema = z.object({
  path: z.string(),
  kind: z.string(),
  extension: z.string().optional(),
  size: z.number(),
  hash: z.string(),
  module: z.string().optional(),
});

export const RepoMapSchema = z.object({
  version: z.string().default("1.0"),
  generatedAt: z.string(),
  root: z.string(),
  projectType: z.string(),
  stats: z.object({
    totalFiles: z.number(),
    sourceFiles: z.number(),
    testFiles: z.number(),
    configFiles: z.number(),
    docFiles: z.number(),
  }),
  modules: z.array(z.string()),
  files: z.array(RepoFileEntrySchema),
});

export type RepoFileEntry = z.infer<typeof RepoFileEntrySchema>;
export type RepoMap = z.infer<typeof RepoMapSchema>;
