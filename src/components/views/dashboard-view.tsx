"use client";

import { useMemo } from "react";
import {
  Area,
  AreaChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  Package,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Zap,
} from "lucide-react";
import { useFetch } from "@/hooks/use-fetch";
import { KpiCard } from "@/components/shared/kpi-card";
import { DashboardSkeleton } from "@/components/shared/skeletons";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfidenceMeter, TrendPill } from "@/components/shared/badges";
import { ChartTooltip, compactCurrency } from "@/components/shared/chart-tooltip";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAppStore } from "@/lib/store";
import { formatCurrency, formatNumber } from "@/lib/format";
import type {
  DashboardMetrics,
  OpportunityFeedItem,
  ProductWithMetrics,
} from "@/lib/types";

interface MetricsResponse {
  seeded: boolean;
  user?: { name: string; businessName: string; email: string };
  metrics?: DashboardMetrics;
  feed?: OpportunityFeedItem[];
  productMetrics?: ProductWithMetrics[];
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good Morning";
  if (h < 17) return "Good Afternoon";
  return "Good Evening";
}

const feedIcon = {
  opportunity: { icon: TrendingUp, cls: "bg-emerald-50 text-emerald-600 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400 dark:ring-emerald-900" },
  risk: { icon: AlertTriangle, cls: "bg-red-50 text-red-600 ring-red-100 dark:bg-red-950/40 dark:text-red-400 dark:ring-red-900" },
  warning: { icon: Package, cls: "bg-amber-50 text-amber-600 ring-amber-100 dark:bg-amber-950/40 dark:text-amber-400 dark:ring-amber-900" },
} as const;

export function DashboardView() {
  const { data, loading } = useFetch<MetricsResponse>("/api/metrics");
  const setSection = useAppStore((s) => s.setSection);

  const userName = data?.user?.name ?? "Owner";

  if (loading || !data || !data.metrics) return <DashboardSkeleton />;
  if (!data.seeded) return <DashboardSkeleton />;

  const { metrics, feed } = data;

  return (
    <div className="space-y-6 animate-in-fade">
      {/* Greeting */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          {greeting()}, {userName} <span className="inline-block animate-[wave_1.8s_ease-in-out_infinite] origin-[70%_70%]">👋</span>
        </h1>
        <p className="text-sm text-muted-foreground sm:text-base">
          Your inventory decisions today could impact{" "}
          <span className="font-semibold text-red-600 dark:text-red-400">
            {formatCurrency(metrics.revenueAtRisk)}
          </span>{" "}
          in revenue.
        </p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Revenue At Risk"
          value={formatCurrency(metrics.revenueAtRisk)}
          icon={AlertTriangle}
          accent="red"
          hint="Next 7 days"
          trend={metrics.weeklyRevenueGrowth > 0 ? metrics.weeklyRevenueGrowth : undefined}
        />
        <KpiCard
          label="Potential Stockouts"
          value={formatNumber(metrics.potentialStockouts)}
          icon={Package}
          accent="amber"
          hint="Within 7 days"
        />
        <KpiCard
          label="Inventory Health"
          value={`${metrics.inventoryHealthScore} / 100`}
          icon={ShieldCheck}
          accent={metrics.inventoryHealthScore >= 70 ? "emerald" : "amber"}
          hint={metrics.inventoryHealthScore >= 70 ? "Healthy" : "Needs attention"}
        />
        <KpiCard
          label="Recommended Actions"
          value={formatNumber(metrics.recommendedActions)}
          icon={Zap}
          accent="teal"
          hint="AI suggestions"
        />
      </div>

      {/* Hero AI recommendation + revenue trend */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Hero AI card */}
        <Card className="relative overflow-hidden lg:col-span-2 p-0 border-0 bg-gradient-to-br from-slate-900 via-slate-900 to-teal-950 text-white">
          <div className="absolute inset-0 bg-grid opacity-[0.07]" />
          <div className="absolute -right-12 -top-12 size-48 rounded-full bg-teal-500/20 blur-3xl" />
          <div className="relative p-6 sm:p-7">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-500/15 px-2.5 py-1 text-xs font-medium text-teal-300 ring-1 ring-inset ring-teal-400/30">
                <Sparkles className="size-3.5" />
                Today&apos;s Top Recommendation
              </span>
              <Badge className="bg-white/10 text-white border-0 hover:bg-white/15">
                AI Generated
              </Badge>
            </div>
            <h2 className="mt-4 text-lg font-semibold leading-snug sm:text-xl text-balance">
              {metrics.topRecommendation.title}
            </h2>
            <p className="mt-1 text-sm text-slate-300">{metrics.topRecommendation.title === "No urgent reorders needed today." ? "Your inventory is in great shape." : "Act within 72 hours to prevent lost sales."}</p>

            <div className="mt-5 flex flex-wrap items-end gap-x-8 gap-y-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">
                  Estimated Revenue Protected
                </p>
                <p className="mt-1 text-3xl font-bold tabular-nums text-emerald-400">
                  +{formatCurrency(metrics.topRecommendation.revenueProtected)}
                </p>
              </div>
              <div className="min-w-[160px] flex-1 max-w-[220px]">
                <p className="text-xs uppercase tracking-wide text-slate-400">
                  Confidence Score
                </p>
                <div className="mt-2">
                  <ConfidenceMeter value={metrics.topRecommendation.confidenceScore} />
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              <Button
                onClick={() => setSection("revenue-protection")}
                className="bg-teal-500 text-white hover:bg-teal-400"
              >
                View Recommendation
                <ArrowRight className="size-4" />
              </Button>
              <Button
                variant="outline"
                onClick={() => setSection("ai-advisor")}
                className="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white"
              >
                <Bot className="size-4" />
                Ask AI Advisor
              </Button>
            </div>
          </div>
        </Card>

        {/* Revenue trend */}
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Weekly Revenue
              </p>
              <p className="mt-1 text-2xl font-bold tabular-nums">
                {formatCurrency(metrics.weeklyRevenue)}
              </p>
            </div>
            <TrendPill value={metrics.weeklyRevenueGrowth} />
          </div>
          <div className="mt-4 h-[160px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={metrics.kpiTrend} margin={{ top: 6, right: 4, left: 4, bottom: 0 }}>
                <defs>
                  <linearGradient id="revGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#14B8A6" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#14B8A6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: "oklch(0.55 0.015 260)" }}
                />
                <Tooltip
                  content={<ChartTooltip valueFormatter={(v) => formatCurrency(v)} />}
                  cursor={{ stroke: "#14B8A6", strokeWidth: 1, strokeDasharray: "3 3" }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  name="Revenue"
                  stroke="#0F766E"
                  strokeWidth={2.5}
                  fill="url(#revGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* AI Opportunity Feed + category distribution */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 p-0">
          <div className="flex items-center justify-between border-b px-5 py-4">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-teal-600" />
              <h3 className="text-sm font-semibold">AI Opportunity Feed</h3>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setSection("insights")} className="text-teal-600 hover:text-teal-700">
              View all
              <ArrowRight className="size-3.5" />
            </Button>
          </div>
          <div className="divide-y">
            {feed && feed.length > 0 ? (
              feed.slice(0, 5).map((item) => {
                const cfg = feedIcon[item.type];
                const Icon = cfg.icon;
                return (
                  <div key={item.id} className="flex items-start gap-3 px-5 py-3.5 transition-colors hover:bg-muted/40">
                    <div className={`flex size-9 shrink-0 items-center justify-center rounded-lg ring-1 ${cfg.cls}`}>
                      <Icon className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          {item.title}
                        </p>
                      </div>
                      <p className="mt-0.5 text-sm text-foreground">{item.description}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{item.action}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        {item.impact}
                      </p>
                      <p
                        className={`text-sm font-bold tabular-nums ${
                          item.type === "opportunity"
                            ? "text-emerald-600 dark:text-emerald-400"
                            : item.type === "risk"
                            ? "text-red-600 dark:text-red-400"
                            : "text-amber-600 dark:text-amber-400"
                        }`}
                      >
                        {item.type === "opportunity" ? "+" : item.type === "risk" ? "-" : ""}
                        {formatCurrency(item.impactValue)}
                      </p>
                    </div>
                  </div>
                );
              })
            ) : (
              <EmptyState title="No opportunities yet" className="border-0 m-5" />
            )}
          </div>
        </Card>

        {/* Category distribution */}
        <Card className="p-5">
          <h3 className="text-sm font-semibold">Revenue by Category</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">This week</p>
          <div className="mt-2 h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={metrics.categoryDistribution}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={48}
                  outerRadius={72}
                  paddingAngle={2}
                  strokeWidth={0}
                >
                  {metrics.categoryDistribution.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip valueFormatter={(v) => formatCurrency(v)} />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5">
            {metrics.categoryDistribution.slice(0, 6).map((c) => (
              <div key={c.name} className="flex items-center gap-1.5 text-xs">
                <span className="size-2 rounded-full" style={{ background: c.color }} />
                <span className="truncate text-muted-foreground">{c.name}</span>
                <span className="ml-auto font-medium tabular-nums">{compactCurrency(c.value)}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* At-risk products snapshot */}
      <Card className="p-0">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <h3 className="text-sm font-semibold">Top Revenue at Risk</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">Products projected to stock out soon</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setSection("revenue-protection")} className="text-teal-600 hover:text-teal-700">
            Open center
            <ArrowRight className="size-3.5" />
          </Button>
        </div>
        <div className="divide-y">
          {data.productMetrics
            ?.filter((p) => p.revenueAtRisk > 0)
            .sort((a, b) => b.revenueAtRisk - a.revenueAtRisk)
            .slice(0, 4)
            .map((p) => (
              <div key={p.id} className="flex items-center gap-4 px-5 py-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500">
                  <Package className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{p.category}</p>
                </div>
                <div className="hidden text-right sm:block">
                  <p className="text-xs text-muted-foreground">Stock</p>
                  <p className="text-sm font-semibold tabular-nums">{p.stockQuantity}</p>
                </div>
                <div className="hidden text-right sm:block">
                  <p className="text-xs text-muted-foreground">Days left</p>
                  <p className="text-sm font-semibold tabular-nums">
                    {Number.isFinite(p.daysRemaining) ? Math.round(p.daysRemaining) : "30+"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">At risk</p>
                  <p className="text-sm font-bold tabular-nums text-red-600 dark:text-red-400">
                    {formatCurrency(p.revenueAtRisk)}
                  </p>
                </div>
              </div>
            ))}
        </div>
      </Card>
    </div>
  );
}
