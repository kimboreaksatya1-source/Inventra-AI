"use client";

import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format";
import { describeParams } from "./describe-params";
import type { SavedScenario } from "@/lib/types";

export function CompareView({
  scenarios,
  onBack,
}: {
  scenarios: SavedScenario[];
  onBack: () => void;
}) {
  const items = scenarios.slice(0, 3);

  const metrics: { label: string; get: (s: SavedScenario) => number; fmt: (n: number) => string; higherIsBetter: boolean }[] = [
    { label: "Revenue impact (30d)", get: (s) => s.result.deltas.revenueImpact, fmt: money, higherIsBetter: true },
    { label: "Net cash-flow impact", get: (s) => s.result.deltas.netCashFlowImpact, fmt: money, higherIsBetter: true },
    { label: "Cash outlay", get: (s) => s.result.deltas.cashOutlay, fmt: (n) => formatCurrency(n), higherIsBetter: false },
    { label: "Avg stockout probability (after)", get: (s) => s.result.after.avgStockoutProbability, fmt: (n) => `${n}%`, higherIsBetter: false },
    { label: "Products at risk (after)", get: (s) => s.result.after.productsAtRisk, fmt: (n) => `${n}`, higherIsBetter: false },
  ];

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={onBack}>
        <ArrowLeft className="size-4" />
        Back to saved scenarios
      </Button>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="border-b bg-muted/50 text-left">
              <th className="px-4 py-3 font-medium text-muted-foreground">Metric</th>
              {items.map((s) => (
                <th key={s.id} className="px-4 py-3">
                  <p className="font-semibold">{s.name}</p>
                  <p className="text-[11px] font-normal text-muted-foreground">
                    {describeParams(s.params) || "Baseline"}
                  </p>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {metrics.map((m) => {
              const vals = items.map((s) => m.get(s));
              const best = m.higherIsBetter ? Math.max(...vals) : Math.min(...vals);
              return (
                <tr key={m.label}>
                  <td className="px-4 py-3 text-muted-foreground">{m.label}</td>
                  {items.map((s, i) => (
                    <td
                      key={s.id}
                      className={cn(
                        "px-4 py-3 font-semibold tabular-nums",
                        vals[i] === best && vals.length > 1 && "text-teal-700 dark:text-teal-300"
                      )}
                    >
                      {m.fmt(vals[i])}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className={cn("grid gap-3", items.length === 2 ? "sm:grid-cols-2" : "sm:grid-cols-3")}>
        {items.map((s) => (
          <Card key={s.id} className="gap-1 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Recommended action
            </p>
            <p className="text-sm font-semibold">{s.result.recommendedAction.headline}</p>
            <p className="text-xs text-muted-foreground">{s.result.recommendedAction.detail}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}

function money(n: number): string {
  const s = formatCurrency(Math.abs(n));
  return n > 0 ? `+${s}` : n < 0 ? `−${s}` : s;
}
