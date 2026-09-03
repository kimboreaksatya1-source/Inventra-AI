"use client";

import { formatCurrency } from "@/lib/format";
import type { InventoryAnalysis, RiskLevel } from "@/lib/types";

const RISK_TONE: Record<Exclude<RiskLevel, "None"> | "None", string> = {
  Critical: "bg-red-500",
  High: "bg-amber-500",
  Medium: "bg-teal-500",
  Low: "bg-emerald-500/70",
  None: "bg-slate-300 dark:bg-slate-600",
};

const RISK_ORDER: RiskLevel[] = ["Critical", "High", "Medium", "Low", "None"];
const RISK_LABEL: Record<RiskLevel, string> = {
  Critical: "Critical",
  High: "High",
  Medium: "Medium",
  Low: "Healthy",
  None: "No sales",
};

/** Two glanceable charts: where the money is at risk, and the overall risk mix. */
export function BriefCharts({ analysis }: { analysis: InventoryAnalysis }) {
  const risky = [...analysis.products]
    .filter((p) => p.estimatedRevenueAtRisk > 0)
    .sort((a, b) => b.estimatedRevenueAtRisk - a.estimatedRevenueAtRisk)
    .slice(0, 6);
  const max = risky[0]?.estimatedRevenueAtRisk || 1;

  const counts = { Critical: 0, High: 0, Medium: 0, Low: 0, None: 0 } as Record<RiskLevel, number>;
  for (const p of analysis.products) counts[p.riskLevel] += 1;
  const total = analysis.products.length || 1;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-xl border border-border bg-card p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Revenue at risk by product
        </p>
        <div className="mt-3 space-y-2">
          {risky.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing is at stockout risk right now.</p>
          ) : (
            risky.map((p) => (
              <div key={p.name} className="flex items-center gap-2">
                <span className="w-24 shrink-0 truncate text-xs font-medium sm:w-36" title={p.name}>
                  {p.name}
                </span>
                <div className="h-4 flex-1 overflow-hidden rounded bg-muted">
                  <div
                    className="flex h-full items-center justify-end rounded bg-red-500/85 pr-1.5"
                    style={{ width: `${Math.max(9, (p.estimatedRevenueAtRisk / max) * 100)}%` }}
                  >
                    <span className="text-[10px] font-semibold tabular-nums text-white">
                      {formatCurrency(p.estimatedRevenueAtRisk)}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Products by risk level
        </p>
        <div className="mt-3 flex h-4 overflow-hidden rounded bg-muted">
          {RISK_ORDER.map((k) =>
            counts[k] > 0 ? (
              <div
                key={k}
                className={RISK_TONE[k]}
                style={{ width: `${(counts[k] / total) * 100}%` }}
                title={`${RISK_LABEL[k]}: ${counts[k]}`}
              />
            ) : null
          )}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs sm:grid-cols-3">
          {RISK_ORDER.map((k) =>
            counts[k] > 0 ? (
              <div key={k} className="flex items-center gap-1.5">
                <span className={`size-2 shrink-0 rounded-sm ${RISK_TONE[k]}`} />
                <span className="text-muted-foreground">{RISK_LABEL[k]}</span>
                <span className="font-semibold tabular-nums">{counts[k]}</span>
              </div>
            ) : null
          )}
        </div>
      </div>
    </div>
  );
}
