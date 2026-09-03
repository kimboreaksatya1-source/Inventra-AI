"use client";

import { Activity, Boxes, ShieldAlert, TrendingDown } from "lucide-react";
import { KpiCard } from "@/components/shared/kpi-card";
import { formatCurrency } from "@/lib/format";
import type { BusinessBrief, InventoryAnalysis } from "@/lib/types";

/** The four executive KPIs — the whole "how is the business" answer, in one glance. */
export function BriefKpis({
  brief,
  analysis,
}: {
  brief: BusinessBrief;
  analysis: InventoryAnalysis;
}) {
  const s = analysis.summary;
  const health = analysis.healthScore;
  const healthAccent = health >= 70 ? "teal" : health >= 55 ? "amber" : "red";

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      <KpiCard
        label="Business Health"
        value={`${health}`}
        icon={Activity}
        accent={healthAccent}
        hint={brief.healthLabel}
        note={brief.healthExplanation}
      />
      <KpiCard
        label="Revenue at Risk"
        value={formatCurrency(s.totalRevenueAtRisk)}
        icon={TrendingDown}
        accent="red"
        hint="next 30 days"
        note="Revenue exposed if at-risk products stock out before their supplier lead time."
      />
      <KpiCard
        label="Critical Products"
        value={`${s.criticalCount}`}
        icon={ShieldAlert}
        accent="amber"
        hint={s.highCount > 0 ? `+${s.highCount} high risk` : "in the danger zone"}
        note="Products projected to run out within their supplier lead time."
      />
      <KpiCard
        label="Inventory Value"
        value={formatCurrency(s.totalInventoryValue)}
        icon={Boxes}
        accent="charcoal"
        hint={`${s.totalProducts} products`}
        note="Stock on hand, valued at cost price."
      />
    </div>
  );
}
