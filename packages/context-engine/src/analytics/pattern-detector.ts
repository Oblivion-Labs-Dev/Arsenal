import type { AgentEvent, ContextBuildRecord } from "./analytics-types.js";

export interface DashboardPatterns {
  repeatedModules: { module: string; count: number }[];
  heavilyEditedModules: { module: string; edits: number }[];
  totalBuilds: number;
  totalEvents: number;
}

export function detectPatterns(
  builds: Pick<ContextBuildRecord, "task" | "selectedFiles">[],
  events: Pick<AgentEvent, "eventType" | "file" | "module">[],
): DashboardPatterns {
  const moduleFrequency = new Map<string, number>();
  for (const b of builds) {
    for (const file of b.selectedFiles) {
      const mod = file.split("/").slice(0, 2).join("/");
      moduleFrequency.set(mod, (moduleFrequency.get(mod) ?? 0) + 1);
    }
  }

  const repeatedModules = [...moduleFrequency.entries()]
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .map(([module, count]) => ({ module, count }));

  const editedModules = new Map<string, number>();
  for (const e of events) {
    if (e.eventType === "FILE_EDITED" && e.module) {
      editedModules.set(e.module, (editedModules.get(e.module) ?? 0) + 1);
    }
  }

  return {
    repeatedModules,
    heavilyEditedModules: [...editedModules.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([module, edits]) => ({ module, edits })),
    totalBuilds: builds.length,
    totalEvents: events.length,
  };
}
