"use client";

import { useMemo, useState } from "react";
import {
  ArrowDownRight,
  Package,
  ShieldAlert,
  ShoppingBag,
  TrendingDown,
} from "lucide-react";
import { SectionHeading } from "@/components/shared/section-heading";
import { KpiCard } from "@/components/shared/kpi-card";
import { TableSkeleton } from "@/components/shared/skeletons";
import { NoRiskEmptyState } from "@/components/shared/empty-state";
import { PriorityBadge } from "@/components/shared/badges";
import { ChartTooltip } from "@/components/shared/chart-tooltip";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useFetch } from "@/hooks/use-fetch";
import { formatCurrency, formatNumber } from "@/lib/format";
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
import type { Priority, ProductWithMetrics, Recommendation } from "@/lib/types";
import { useAppStore } from "@/lib/store";
import { toast } from "sonner";

interface ProductsResponse {
  seeded: boolean;
  products: (ProductWithMetrics & { suggestedOrder: number })[];
  recommendations: Recommendation[];
}

type Filter = "all" | "critical" | "high" | "medium";

export function RevenueProtectionView() {
  const { data, loading, refresh } = useFetch<ProductsResponse>("/api/products");
  const setSection = useAppStore((s) => s.setSection);
  const [filter, setFilter] = useState<Filter>("all");

  const rows = useMemo(() => {
    if (!data?.products) return [];
    const atRisk = data.products.filter((p) => p.averageDailySales > 0);
    return atRisk.sort((a, b) => b.revenueAtRisk - a.revenueAtRisk);
  }, [data]);

  const filtered = useMemo(() => {
    if (filter === "all") return rows;
    return rows.filter((r) => priorityOf(r.daysRemaining, r.averageDailySales).toLowerCase() === filter);
  }, [rows, filter]);

  if (loading || !data) return <RevenueSkeleton />;
  if (!data.seeded) return <RevenueSkeleton />;

  const totalAtRisk = rows.reduce((a, r) => a + r.revenueAtRisk, 0);
  const criticalCount = rows.filter((r) => r.daysRemaining < 3 && r.averageDailySales > 0).length;
  const avgConfidence = data.recommendations.length
    ? Math.round(
        data.recommendations.reduce((a, r) => a + r.confidenceScore, 0) /
          data.recommendations.length
      )
    : 0;

  const chartData = rows
    .filter((r) => r.revenueAtRisk > 0)
    .slice(0, 6)
    .map((r) => ({ name: r.name, value: Math.round(r.revenueAtRisk), days: Math.round(r.daysRemaining) }));

  return (
    <div className="space-y-6 animate-in-fade">
      <SectionHeading
        title="Revenue Protection Center"
        description="Products likely to cause future revenue loss. Prioritise reorders to protect cash flow."
        icon={ShieldAlert}
        actions={
          <Button
            variant="outline"
            onClick={() => setSection("ai-advisor")}
          >
            Ask AI for plan
          </Button>
        }
      />

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Total Revenue At Risk" value={formatCurrency(totalAtRisk)} icon={TrendingDown} accent="red" hint="Next 7 days" />
        <KpiCard label="Critical Products" value={formatNumber(criticalCount)} icon={ShieldAlert} accent="amber" hint="Stockout < 3 days" />
        <KpiCard label="Products Tracked" value={formatNumber(rows.length)} icon={Package} accent="teal" />
        <KpiCard label="Avg AI Confidence" value={`${avgConfidence}%`} icon={ShieldAlert} accent="emerald" />
      </div>

      {rows.length === 0 ? (
        <NoRiskEmptyState />
      ) : (
        <>
          {/* Revenue at risk bar chart */}
          {chartData.length > 0 && (
            <Card className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold">Revenue At Risk by Product</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">Top products projected to lose sales</p>
                </div>
                <Badge variant="outline" className="text-red-600 border-red-200 bg-red-50 dark:bg-red-950/40 dark:border-red-900 dark:text-red-300">
                  {formatCurrency(totalAtRisk)} total
                </Badge>
              </div>
              <div className="mt-4 h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 16, top: 4, bottom: 0 }}>
                    <XAxis type="number" hide />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={120}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 11, fill: "oklch(0.55 0.015 260)" }}
                    />
                    <Tooltip
                      content={<ChartTooltip valueFormatter={(v) => formatCurrency(v)} />}
                      cursor={{ fill: "oklch(0.97 0.005 247)" }}
                    />
                    <Bar dataKey="value" name="Revenue at risk" radius={[0, 6, 6, 0]} barSize={18}>
                      {chartData.map((entry, i) => (
                        <Cell key={i} fill={entry.days < 3 ? "#EF4444" : entry.days < 5 ? "#F59E0B" : "#0F766E"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}

          {/* Filter tabs */}
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-thin pb-1">
            {([
              { id: "all", label: "All" },
              { id: "critical", label: "Critical" },
              { id: "high", label: "High" },
              { id: "medium", label: "Medium" },
            ] as { id: Filter; label: string }[]).map((t) => (
              <button
                key={t.id}
                onClick={() => setFilter(t.id)}
                className={cn(
                  "shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors",
                  filter === t.id
                    ? "bg-teal-600 text-white"
                    : "bg-muted text-muted-foreground hover:bg-teal-50 hover:text-teal-700 dark:hover:bg-teal-950/40 dark:hover:text-teal-300"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Table */}
          <Card className="p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-left">
                    <th className="px-4 py-3 font-semibold text-muted-foreground">Product</th>
                    <th className="px-4 py-3 text-right font-semibold text-muted-foreground">Stock</th>
                    <th className="px-4 py-3 text-right font-semibold text-muted-foreground">Daily Sales</th>
                    <th className="px-4 py-3 text-right font-semibold text-muted-foreground">Days Left</th>
                    <th className="px-4 py-3 text-right font-semibold text-muted-foreground">Revenue At Risk</th>
                    <th className="px-4 py-3 text-right font-semibold text-muted-foreground">Suggested Order</th>
                    <th className="px-4 py-3 text-center font-semibold text-muted-foreground">Priority</th>
                    <th className="px-4 py-3 text-right font-semibold text-muted-foreground">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtered.map((p) => {
                    const priority = priorityOf(p.daysRemaining, p.averageDailySales);
                    const isCritical = priority === "CRITICAL";
                    return (
                      <tr
                        key={p.id}
                        className={cn(
                          "transition-colors",
                          isCritical ? "bg-red-50/60 dark:bg-red-950/20" : "hover:bg-muted/40"
                        )}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "flex size-9 shrink-0 items-center justify-center rounded-lg",
                              isCritical ? "bg-red-100 text-red-600 dark:bg-red-950/50 dark:text-red-400" : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                            )}>
                              <Package className="size-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="truncate font-medium">{p.name}</p>
                              <p className="text-xs text-muted-foreground">{p.category}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">{p.stockQuantity}</td>
                        <td className="px-4 py-3 text-right tabular-nums">{p.averageDailySales}</td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          <span className={cn(
                            "inline-flex items-center gap-1 font-semibold",
                            p.daysRemaining < 3 ? "text-red-600 dark:text-red-400" : p.daysRemaining < 7 ? "text-amber-600 dark:text-amber-400" : "text-foreground"
                          )}>
                            {p.daysRemaining < 7 && <ArrowDownRight className="size-3" />}
                            {Number.isFinite(p.daysRemaining) ? Math.round(p.daysRemaining) : "30+"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className={cn(
                            "font-bold tabular-nums",
                            p.revenueAtRisk > 0 ? "text-red-600 dark:text-red-400" : "text-muted-foreground"
                          )}>
                            {formatCurrency(p.revenueAtRisk)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="font-semibold tabular-nums text-teal-700 dark:text-teal-400">
                            {p.suggestedOrder > 0 ? p.suggestedOrder : "—"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <PriorityBadge priority={priority} />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            size="sm"
                            variant={isCritical ? "default" : "outline"}
                            className={cn(isCritical && "bg-red-600 text-white hover:bg-red-700")}
                            onClick={() => {
                              toast.success(`Reorder initiated for ${p.name}`, {
                                description: `${p.suggestedOrder} units · protects ${formatCurrency(p.revenueAtRisk)}`,
                              });
                              refresh();
                            }}
                          >
                            <ShoppingBag className="size-3.5" />
                            Reorder
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {filtered.length === 0 && (
              <div className="px-4 py-10 text-center text-sm text-muted-foreground">
                No products match this filter.
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}

function priorityOf(daysRemaining: number, avgDaily: number): Priority {
  if (avgDaily <= 0) return "LOW";
  if (daysRemaining <= 2) return "CRITICAL";
  if (daysRemaining <= 5) return "HIGH";
  if (daysRemaining <= 10) return "MEDIUM";
  return "LOW";
}

function RevenueSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-10 w-72 animate-pulse rounded-md bg-slate-200 dark:bg-slate-700" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-700" />
        ))}
      </div>
      <TableSkeleton />
    </div>
  );
}
