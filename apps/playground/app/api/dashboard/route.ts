import { aggregateDashboardData, AnalyticsStore } from "@arsenal/context-engine";
import { findArsenalRepoRoot } from "@/lib/repo-root";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const repoRoot = findArsenalRepoRoot();
    const data = aggregateDashboardData(repoRoot);
    const snapshot = new AnalyticsStore(repoRoot).readDashboardSnapshot();

    return Response.json({
      generatedAt: snapshot?.generatedAt ?? new Date().toISOString(),
      repoRoot,
      ...data,
      details: snapshot?.details ?? null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: message }, { status: 500 });
  }
}
