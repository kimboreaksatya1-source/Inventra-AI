"use client";

import { AlertTriangle, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format";
import { useAnalysis } from "@/lib/queries";
import type { RiskLevel } from "@/lib/types";

const TONE: Record<RiskLevel, string> = {
  Critical: "#ef4444",
  High: "#f59e0b",
  Medium: "#14b8a6",
  Low: "#10b981",
  None: "#94a3b8",
};
const ORDER: RiskLevel[] = ["Critical", "High", "Medium", "Low", "None"];
const LABEL: Record<RiskLevel, string> = {
  Critical: "Critical",
  High: "High",
  Medium: "Medium",
  Low: "Healthy",
  None: "No sales",
};

/**
 * The visual layer above the risk table. Renders nothing until data is ready —
 * <RiskTable> owns the loading / empty / data-quality states.
 */
export function RiskOverview() {
  const { data } = useAnalysis();
  const products = data?.analysis?.products;
  if (!products || products.length === 0) return null;

  const atRisk = products
    .filter((p) => p.estimatedRevenueAtRisk > 0)
    .sort((a, b) => b.estimatedRevenueAtRisk - a.estimatedRevenueAtRisk);
  const total = atRisk.reduce((s, p) => s + p.estimatedRevenueAtRisk, 0);

  const counts = { Critical: 0, High: 0, Medium: 0, Low: 0, None: 0 } as Record<RiskLevel, number>;
  for (const p of products) counts[p.riskLevel] += 1;

  const ranking = atRisk.slice(0, 7);
  const rankMax = ranking[0]?.estimatedRevenueAtRisk || 1;
  const timeline = [...atRisk]
    .filter((p) => Number.isFinite(p.daysRemaining))
    .sort((a, b) => a.daysRemaining - b.daysRemaining)
    .slice(0, 6);

  return (
    <div className="space-y-4">
      {/* headline */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <p className="text-2xl font-bold tabular-nums text-red-600 dark:text-red-400">
          {formatCurrency(total)}
        </p>
        <p className="text-sm text-muted-foreground">
          revenue at risk over the next 30 days · {counts.Critical} critical, {counts.High} high
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Ranking */}
        <div className="rounded-xl border border-border bg-card p-4 lg:col-span-2">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <TrendingDown className="size-3.5" />
            Revenue at risk — ranked
          </div>
          <div className="mt-3 space-y-2">
            {ranking.map((p) => (
              <div key={p.name} className="flex items-center gap-2">
                <span className="w-24 shrink-0 truncate text-xs font-medium sm:w-40" title={p.name}>
                  {p.name}
                </span>
                <div className="h-4 flex-1 overflow-hidden rounded bg-muted">
                  <div
                    className="flex h-full items-center justify-end rounded bg-red-500/85 pr-1.5"
                    style={{ width: `${Math.max(9, (p.estimatedRevenueAtRisk / rankMax) * 100)}%` }}
                  >
                    <span className="text-[10px] font-semibold tabular-nums text-white">
                      {formatCurrency(p.estimatedRevenueAtRisk)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Priority distribution donut */}
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Priority distribution
          </p>
          <div className="mt-3 flex items-center gap-4">
            <Donut counts={counts} />
            <ul className="space-y-1 text-xs">
              {ORDER.map((k) =>
                counts[k] > 0 ? (
                  <li key={k} className="flex items-center gap-1.5">
                    <span
                      className="size-2 shrink-0 rounded-sm"
                      style={{ background: TONE[k] }}
                    />
                    <span className="text-muted-foreground">{LABEL[k]}</span>
                    <span className="font-semibold tabular-nums">{counts[k]}</span>
                  </li>
                ) : null
              )}
            </ul>
          </div>
        </div>
      </div>

      {/* Stockout timeline + Top 5 critical */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Stockout countdown
          </p>
          <div className="mt-3 space-y-2">
            {timeline.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing runs out inside the forecast window.</p>
            ) : (
              timeline.map((p) => {
                const d = Math.max(0, Math.round(p.daysRemaining));
                const tone = d < 3 ? "bg-red-500" : d < 7 ? "bg-amber-500" : "bg-teal-500";
                return (
                  <div key={p.name}>
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="min-w-0 truncate font-medium" title={p.name}>
                        {p.name}
                      </span>
                      <span className="shrink-0 tabular-nums text-muted-foreground">{d}d</span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn("h-full rounded-full", tone)}
                        style={{ width: `${Math.max(4, Math.min(100, (d / 14) * 100))}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <AlertTriangle className="size-3.5 text-red-500" />
            Top 5 critical products
          </div>
          <ol className="mt-3 space-y-2">
            {atRisk.slice(0, 5).map((p, i) => (
              <li key={p.name} className="flex items-center gap-3 text-sm">
                <span className="w-4 shrink-0 text-xs font-semibold text-muted-foreground tabular-nums">
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1 truncate" title={p.name}>
                  {p.name}
                </span>
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                  {Number.isFinite(p.daysRemaining) ? `${Math.round(p.daysRemaining)}d · ` : ""}
                </span>
                <span className="shrink-0 text-sm font-semibold tabular-nums text-red-600 dark:text-red-400">
                  {formatCurrency(p.estimatedRevenueAtRisk)}
                </span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}

function Donut({ counts }: { counts: Record<RiskLevel, number> }) {
  const total = ORDER.reduce((s, k) => s + counts[k], 0) || 1;
  let acc = 0;
  const stops: string[] = [];
  for (const k of ORDER) {
    if (counts[k] === 0) continue;
    const start = (acc / total) * 360;
    acc += counts[k];
    const end = (acc / total) * 360;
    stops.push(`${TONE[k]} ${start}deg ${end}deg`);
  }
  return (
    <div
      className="relative size-20 shrink-0 rounded-full"
      style={{ background: `conic-gradient(${stops.join(", ")})` }}
      role="img"
      aria-label="Products by risk priority"
    >
      <div className="absolute inset-[22%] rounded-full bg-card" />
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-sm font-bold tabular-nums">{total}</span>
      </div>
    </div>
  );
}
