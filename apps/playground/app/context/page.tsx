import type { Metadata } from "next";
import { ArsenalAppShell } from "@/components/arsenal-app-shell";
import { ContextDashboard } from "@/components/context-dashboard/context-dashboard";

export const metadata: Metadata = {
  title: "Context Intelligence — Arsenal",
  description: "Token savings, context quality, and AI preprocessing analytics for Arsenal.",
};

export default function ContextPage() {
  return (
    <ArsenalAppShell
      title="Context Intelligence"
      subtitle="Token usage, savings, quality scores, and optimization insights"
    >
      <ContextDashboard />
    </ArsenalAppShell>
  );
}
