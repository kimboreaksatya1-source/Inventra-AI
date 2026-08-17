"use client";

import { useState } from "react";
import {
  LineChart as LineChartIcon,
  TrendingUp,
  AlertTriangle,
  Activity,
  Gauge,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { SectionHeading } from "@/components/shared/section-heading";
import { KpiCard } from "@/components/shared/kpi-card";
import { ChartSkeleton } from "@/components/shared/skeletons";
import { SparkleEmptyState } from "@/components/shared/empty-state";
import { ConfidenceMeter, StatusDot } from "@/components/shared/badges";
import { ChartTooltip } from "@/components/shared/chart-tooltip";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useFetch } from "@/hooks/use-fetch";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ForecastPoint, ProductForecast } from "@/lib/types";

interface ForecastResponse {
  seeded: boolean;
  horizon: number;
  forecasts: ProductForecast[];
  aggregate: (ForecastPoint & { avgStockoutProbability?: number })[];
}

export function ForecastView() {
  const [horizon, setHorizon] = useState<7 | 30>(7);
  const { data, loading } = useFetch<ForecastResponse>(`/api/forecast?horizon=${horizon}`);

  if (loading || !data) return <ForecastSkeleton />;
  if (!data.seeded) return <SparkleEmptyState />;

  const { aggregate, forecasts } = data;
  const totalDemand = aggregate.reduce((a, p) => a + p.demand, 0);
  const peakDay = aggregate.reduce((a, b) => (b.demand > a.demand ? b : a), aggregate[0]);
  const avgStockoutProb = aggregate.length
    ? Math.round(aggregate.reduce((a, p) => a + (p.avgStockoutProbability || 0), 0) / aggregate.length)
    : 0;
  const highRisk = forecasts.filter((f) => f.stockoutProbability >= 50).length;

  return (
    <div className="space-y-6 animate-in-fade">
      <SectionHeading
        title="Forecast Center"
        description="AI demand forecasting with confidence bands and stockout probability."
        icon={LineChartIcon}
        actions={
          <div className="flex items-center rounded-lg border border-border bg-muted/50 p-0.5">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setHorizon(7)}
              className={cn(
                "h-7 rounded-md text-xs",
                horizon === 7 && "bg-background text-foreground shadow-sm"
              )}
            >
              7-Day
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setHorizon(30)}
              className={cn(
                "h-7 rounded-md text-xs",
                horizon === 30 && "bg-background text-foreground shadow-sm"
              )}
            >
              30-Day
            </Button>
          </div>
        }
      />

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Predicted Demand" value={formatNumber(totalDemand)} icon={TrendingUp} accent="teal" hint={`Next ${horizon} days`} />
        <KpiCard label="Peak Demand Day" value={peakDay?.label ?? "—"} icon={Activity} accent="amber" hint={`${formatNumber(peakDay?.demand ?? 0)} units`} />
        <KpiCard label="Avg Stockout Risk" value={`${avgStockoutProb}%`} icon={Gauge} accent={avgStockoutProb >= 40 ? "red" : "emerald"} />
        <KpiCard label="High-Risk Products" value={formatNumber(highRisk)} icon={AlertTriangle} accent="red" hint="Stockout risk ≥ 50%" />
      </div>

      {/* Aggregate demand chart */}
      <Card className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold">Aggregate Demand Forecast</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Predicted units/day with confidence band · {horizon}-day horizon
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-teal-600" /> Demand
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-teal-600/30" /> Confidence range
            </span>
          </div>
        </div>
        <div className="mt-4 h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={aggregate} margin={{ top: 6, right: 8, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id="demandGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#14B8A6" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#14B8A6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="bandGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0F766E" stopOpacity={0.15} />
                  <stop offset="100%" stopColor="#0F766E" stopOpacity={0.04} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.004 286)" vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "oklch(0.55 0.015 260)" }} />
              <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "oklch(0.55 0.015 260)" }} />
              <Tooltip content={<ChartTooltip valueFormatter={(v) => `${formatNumber(v)} units`} />} cursor={{ stroke: "#14B8A6", strokeWidth: 1, strokeDasharray: "3 3" }} />
              <Area type="monotone" dataKey="upper" name="Upper bound" stroke="none" fill="url(#bandGradient)" />
              <Area type="monotone" dataKey="lower" name="Lower bound" stroke="none" fill="var(--background)" />
              <Area
                type="monotone"
                dataKey="demand"
                name="Predicted demand"
                stroke="#0F766E"
                strokeWidth={2.5}
                fill="url(#demandGradient)"
                animationDuration={900}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Stockout probability per product */}
      <Card className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold">Stockout Probability by Product</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">End of forecast horizon</p>
          </div>
          <Badge variant="outline" className="text-muted-foreground">
            {forecasts.length} products
          </Badge>
        </div>
        <div className="mt-4 h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={forecasts.slice(0, 10).map((f) => ({ name: f.productName, prob: f.stockoutProbability }))}
              layout="vertical"
              margin={{ left: 0, right: 24, top: 4, bottom: 0 }}
            >
              <XAxis type="number" domain={[0, 100]} hide />
              <YAxis
                type="category"
                dataKey="name"
                width={120}
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: "oklch(0.55 0.015 260)" }}
              />
              <Tooltip content={<ChartTooltip valueFormatter={(v) => `${v}%`} />} cursor={{ fill: "oklch(0.97 0.005 247)" }} />
              <Bar dataKey="prob" name="Stockout probability" radius={[0, 6, 6, 0]} barSize={16}>
                {forecasts.slice(0, 10).map((f, i) => (
                  <Cell key={i} fill={f.stockoutProbability >= 70 ? "#EF4444" : f.stockoutProbability >= 40 ? "#F59E0B" : "#22C55E"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Per-product forecast cards */}
      <div>
        <h3 className="mb-3 text-sm font-semibold">Product Forecasts</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {forecasts.slice(0, 9).map((f) => (
            <ProductForecastCard key={f.productId} forecast={f} />
          ))}
        </div>
      </div>
    </div>
  );
}

function ProductForecastCard({ forecast }: { forecast: ProductForecast }) {
  const data = forecast.points.map((p, i) => ({ ...p, idx: i }));
  return (
    <Card className="p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{forecast.productName}</p>
          <p className="text-xs text-muted-foreground">{forecast.category}</p>
        </div>
        <StatusDot status={forecast.stockoutProbability >= 70 ? "critical" : forecast.stockoutProbability >= 40 ? "warning" : "healthy"} showLabel />
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
        <div>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Avg/day</p>
          <p className="text-sm font-semibold tabular-nums">{forecast.avgDailyDemand}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Peak day</p>
          <p className="text-sm font-semibold">{forecast.peakDay}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Total</p>
          <p className="text-sm font-semibold tabular-nums">{forecast.totalForecastDemand}</p>
        </div>
      </div>
      <div className="mt-3 h-[90px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={`fc-${forecast.productId}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#14B8A6" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#14B8A6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <Tooltip content={<ChartTooltip hideLabel valueFormatter={(v) => `${formatNumber(v)} units`} />} />
            <Area type="monotone" dataKey="demand" stroke="#0F766E" strokeWidth={2} fill={`url(#fc-${forecast.productId})`} animationDuration={700} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Confidence</span>
          <span className="font-medium tabular-nums">{forecast.confidence}%</span>
        </div>
        <ConfidenceMeter value={forecast.confidence} size="sm" showLabel={false} />
      </div>
    </Card>
  );
}

function ForecastSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-10 w-56 animate-pulse rounded-md bg-slate-200 dark:bg-slate-700" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-700" />
        ))}
      </div>
      <ChartSkeleton className="h-[320px]" />
      <ChartSkeleton className="h-[300px]" />
    </div>
  );
}
