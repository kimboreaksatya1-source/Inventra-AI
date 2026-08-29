"use client";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format";
import type { SimulationResult } from "@/lib/types";

export function BeforeAfter({ result }: { result: SimulationResult }) {
  const rows = [
    {
      label: "Revenue (30 days)",
      before: result.before.revenue30d,
      after: result.after.revenue30d,
      fmt: (n: number) => formatCurrency(n),
      higherIsBetter: true,
    },
    {
      label: "Inventory value on hand",
      before: result.before.inventoryValue,
      after: result.after.inventoryValue,
      fmt: (n: number) => formatCurrency(n),
      higherIsBetter: true,
    },
    {
      label: "Avg stockout probability",
      before: result.before.avgStockoutProbability,
      after: result.after.avgStockoutProbability,
      fmt: (n: number) => `${n}%`,
      higherIsBetter: false,
    },
    {
      label: "Products at risk",
      before: result.before.productsAtRisk,
      after: result.after.productsAtRisk,
      fmt: (n: number) => `${n}`,
      higherIsBetter: false,
    },
  ];

  return (
    <Card className="gap-4 p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Before vs After</h3>
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="size-2 rounded-full bg-slate-300 dark:bg-slate-600" /> Now
          </span>
          <span className="flex items-center gap-1">
            <span className="size-2 rounded-full bg-teal-500" /> Scenario
          </span>
        </div>
      </div>

      <div className="space-y-4">
        {rows.map((r) => {
          const max = Math.max(r.before, r.after, 1);
          const worse = r.higherIsBetter ? r.after < r.before : r.after > r.before;
          return (
            <div key={r.label}>
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{r.label}</span>
                <span className="tabular-nums">
                  <span className="text-muted-foreground">{r.fmt(r.before)}</span>
                  <span className="mx-1 text-muted-foreground">→</span>
                  <span className={cn("font-semibold", worse ? "text-red-600 dark:text-red-400" : "text-teal-700 dark:text-teal-300")}>
                    {r.fmt(r.after)}
                  </span>
                </span>
              </div>
              <div className="space-y-1">
                <Bar value={Math.max(0, r.before)} max={max} className="bg-slate-300 dark:bg-slate-600" />
                <Bar
                  value={Math.max(0, r.after)}
                  max={max}
                  className={worse ? "bg-red-400" : "bg-teal-500"}
                />
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function Bar({ value, max, className }: { value: number; max: number; className: string }) {
  const pct = Math.max(2, Math.min(100, (value / max) * 100));
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
      <div className={cn("h-full rounded-full transition-all", className)} style={{ width: `${pct}%` }} />
    </div>
  );
}
