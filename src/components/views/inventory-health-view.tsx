"use client";

import { HeartPulse, CheckCircle2, AlertTriangle, ShieldCheck, Activity } from "lucide-react";
import { SectionHeading } from "@/components/shared/section-heading";
import { ChartSkeleton } from "@/components/shared/skeletons";
import { SparkleEmptyState } from "@/components/shared/empty-state";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useFetch } from "@/hooks/use-fetch";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartTooltip } from "@/components/shared/chart-tooltip";
import type { InventoryHealth as HealthData } from "@/lib/types";

interface HealthResponse {
  seeded: boolean;
  health?: HealthData;
}

export function InventoryHealthView() {
  const { data, loading } = useFetch<HealthResponse>("/api/health");

  if (loading || !data) return <HealthSkeleton />;
  if (!data.seeded || !data.health) return <SparkleEmptyState />;

  const { health } = data;
  const ringColor =
    health.score >= 85 ? "#22C55E" : health.score >= 70 ? "#0F766E" : health.score >= 55 ? "#F59E0B" : "#EF4444";

  const catChart = health.categoryBreakdown.map((c) => ({
    name: c.category,
    score: c.healthScore,
    revenue: c.revenueAtRisk,
  }));

  return (
    <div className="space-y-6 animate-in-fade">
      <SectionHeading
        title="Inventory Health"
        description="An AI-generated health score across your catalog, with strengths and risks."
        icon={HeartPulse}
      />

      {/* Score hero */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="relative overflow-hidden p-6">
          <div className="absolute -right-10 -top-10 size-40 rounded-full bg-teal-500/10 blur-3xl" />
          <div className="relative flex flex-col items-center">
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-teal-600" />
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Inventory Health Score
              </p>
            </div>
            <ScoreRing score={health.score} color={ringColor} />
            <Badge
              variant="outline"
              className={cn(
                "mt-4 border-0 font-semibold",
                health.score >= 85
                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                  : health.score >= 70
                  ? "bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300"
                  : health.score >= 55
                  ? "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                  : "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300"
              )}
            >
              {health.label}
            </Badge>
            <p className="mt-3 max-w-xs text-center text-sm text-muted-foreground text-balance">
              {health.explanation}
            </p>
          </div>
        </Card>

        {/* Strengths & risks */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:col-span-2">
          <Card className="p-5">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-4 text-emerald-600" />
              <h3 className="text-sm font-semibold">Strengths</h3>
            </div>
            <ul className="mt-3 space-y-2.5">
              {health.strengths.length > 0 ? (
                health.strengths.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-500" />
                    <span className="text-foreground">{s}</span>
                  </li>
                ))
              ) : (
                <li className="text-sm text-muted-foreground">No notable strengths yet.</li>
              )}
            </ul>
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-2">
              <AlertTriangle className="size-4 text-amber-600" />
              <h3 className="text-sm font-semibold">Risks</h3>
            </div>
            <ul className="mt-3 space-y-2.5">
              {health.risks.length > 0 ? (
                health.risks.map((r, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-500" />
                    <span className="text-foreground">{r}</span>
                  </li>
                ))
              ) : (
                <li className="text-sm text-muted-foreground">No significant risks detected.</li>
              )}
            </ul>
          </Card>
        </div>
      </div>

      {/* Category breakdown */}
      <Card className="p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="size-4 text-teal-600" />
            <h3 className="text-sm font-semibold">Health by Category</h3>
          </div>
          <p className="text-xs text-muted-foreground">{health.categoryBreakdown.length} categories</p>
        </div>
        <div className="mt-4 h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={catChart} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
              <XAxis
                dataKey="name"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: "oklch(0.55 0.015 260)" }}
              />
              <YAxis domain={[0, 100]} hide />
              <Tooltip
                content={<ChartTooltip valueFormatter={(v) => `${v}/100`} />}
                cursor={{ fill: "oklch(0.97 0.005 247)" }}
              />
              <Bar dataKey="score" name="Health score" radius={[6, 6, 0, 0]} barSize={36}>
                {catChart.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={entry.score >= 80 ? "#22C55E" : entry.score >= 60 ? "#F59E0B" : "#EF4444"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {health.categoryBreakdown.map((c) => (
            <div key={c.category} className="rounded-lg border border-border p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">{c.category}</p>
                <span
                  className={cn(
                    "text-sm font-bold tabular-nums",
                    c.healthScore >= 80 ? "text-emerald-600" : c.healthScore >= 60 ? "text-amber-600" : "text-red-600"
                  )}
                >
                  {c.healthScore}/100
                </span>
              </div>
              <Progress value={c.healthScore} className="mt-2 h-1.5" />
              <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                <span>{c.products} products</span>
                <span className={c.revenueAtRisk > 0 ? "text-red-600 dark:text-red-400 font-medium" : ""}>
                  {formatCurrency(c.revenueAtRisk)} at risk
                </span>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function ScoreRing({ score, color }: { score: number; color: string }) {
  const r = 56;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  return (
    <div className="relative mt-5 size-40">
      <svg className="size-full -rotate-90" viewBox="0 0 140 140">
        <circle cx="70" cy="70" r={r} fill="none" stroke="oklch(0.92 0.004 286)" strokeWidth="10" />
        <circle
          cx="70"
          cy="70"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.8s ease-out" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn("text-4xl font-bold tabular-nums", scoreTone(color))}>{score}</span>
        <span className="text-xs text-muted-foreground">/ 100</span>
      </div>
    </div>
  );
}

function scoreTone(color: string) {
  if (color === "#22C55E") return "text-emerald-600";
  if (color === "#0F766E") return "text-teal-600";
  if (color === "#F59E0B") return "text-amber-600";
  return "text-red-600";
}

function HealthSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-10 w-64 animate-pulse rounded-md bg-slate-200 dark:bg-slate-700" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="h-72 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-700" />
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:col-span-2">
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
      </div>
      <ChartSkeleton className="h-[300px]" />
    </div>
  );
}
