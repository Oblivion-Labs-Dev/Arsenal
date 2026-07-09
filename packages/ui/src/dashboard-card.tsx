"use client";

import { GlassCard } from "./glass-card";
import { cn } from "./lib/cn";

interface DashboardCardProps {
  title: string;
  value: string;
  change?: string;
  trend?: "up" | "down" | "neutral";
  className?: string;
}

export function DashboardCard({ title, value, change, trend = "neutral", className }: DashboardCardProps) {
  const trendColor =
    trend === "up" ? "text-arsenal-success" : trend === "down" ? "text-arsenal-danger" : "text-arsenal-muted";
  return (
    <GlassCard className={cn("p-5", className)}>
      <p className="text-xs uppercase tracking-wider text-arsenal-muted">{title}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight">{value}</p>
      {change && <p className={cn("mt-1 text-sm", trendColor)}>{change}</p>}
    </GlassCard>
  );
}
