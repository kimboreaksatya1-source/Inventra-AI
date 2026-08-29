"use client";

import { AlertTriangle, ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format";
import type { SimProductResult, SimulationResult } from "@/lib/types";

export function RiskIndicators({ result }: { result: SimulationResult }) {
  const hasReorder = result.params.reorderQuantity > 0;

  if (result.productsAtRisk.length === 0) {
    return (
      <Card className="flex-row items-center gap-3 p-5">
        <span className="flex size-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300">
          <ShieldCheck className="size-5" />
        </span>
        <div>
          <p className="text-sm font-semibold">No products at stockout risk</p>
          <p className="text-xs text-muted-foreground">
            Every product stays covered through the reorder window in this scenario.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="gap-4 p-5">
      <div className="flex items-center gap-2">
        <AlertTriangle className="size-4 text-amber-500" />
        <h3 className="text-sm font-semibold">
          Products at Risk <span className="text-muted-foreground">({result.productsAtRisk.length})</span>
        </h3>
      </div>
      <ul className="space-y-3.5">
        {result.productsAtRisk.map((p) => (
          <RiskRow key={p.id} p={p} hasReorder={hasReorder} />
        ))}
      </ul>
    </Card>
  );
}

function RiskRow({ p, hasReorder }: { p: SimProductResult; hasReorder: boolean }) {
  const prob = hasReorder ? p.mitigatedProbability : p.stockoutProbability;
  const tone = prob >= 70 ? "bg-red-500" : prob >= 40 ? "bg-amber-500" : "bg-emerald-500";
  return (
    <li>
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="font-medium">{p.name}</span>
        <span className="tabular-nums text-xs text-muted-foreground">
          cover {fmtDays(p.coverBefore)} → {fmtDays(p.coverAfter)}
        </span>
      </div>
      <div className="mt-1.5 flex items-center gap-2">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
          <div className={cn("h-full rounded-full transition-all", tone)} style={{ width: `${Math.max(3, prob)}%` }} />
        </div>
        <span className="w-24 shrink-0 text-right text-xs font-semibold tabular-nums">
          {p.stockoutProbability}%
          {hasReorder && p.mitigatedProbability !== p.stockoutProbability && (
            <span className="text-emerald-600 dark:text-emerald-400"> → {p.mitigatedProbability}%</span>
          )}
        </span>
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground">
        {formatCurrency(Math.abs(p.revenueImpact))} {p.revenueImpact < 0 ? "at risk" : "upside"} · stockout probability
        {hasReorder ? " after reorder" : ""}
      </p>
    </li>
  );
}

function fmtDays(n: number): string {
  if (n >= 999) return "60+d";
  return `${n}d`;
}
