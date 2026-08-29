"use client";

import { ArrowDownRight, ArrowUpRight, Boxes, DollarSign, ShieldAlert, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format";
import type { SimulationResult } from "@/lib/types";

export function ImpactCards({ result }: { result: SimulationResult }) {
  const { deltas, before, after } = result;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Card
        icon={<DollarSign className="size-4" />}
        accent="teal"
        label="Revenue Impact"
        value={signedCurrency(deltas.revenueImpact)}
        delta={deltas.revenueImpact}
        sub={`${formatCurrency(before.revenue30d)} → ${formatCurrency(after.revenue30d)} (30d)`}
      />
      <Card
        icon={<Boxes className="size-4" />}
        accent="slate"
        label="Inventory Impact"
        value={signedCurrency(deltas.inventoryImpact)}
        delta={0}
        neutralDelta
        sub={`${formatCurrency(before.inventoryValue)} → ${formatCurrency(after.inventoryValue)} on hand`}
      />
      <Card
        icon={<ShieldAlert className="size-4" />}
        accent={after.avgStockoutProbability > before.avgStockoutProbability ? "red" : "emerald"}
        label="Stockout Risk"
        value={`${after.avgStockoutProbability}%`}
        delta={before.avgStockoutProbability - after.avgStockoutProbability}
        deltaAsPercent
        sub={`avg probability · ${after.productsAtRisk} product${after.productsAtRisk === 1 ? "" : "s"} at risk`}
      />
      <Card
        icon={<Wallet className="size-4" />}
        accent={deltas.netCashFlowImpact >= 0 ? "emerald" : "amber"}
        label="Cash Flow Impact"
        value={signedCurrency(deltas.netCashFlowImpact)}
        delta={deltas.netCashFlowImpact}
        sub={
          deltas.cashOutlay > 0
            ? `${formatCurrency(deltas.cashOutlay)} outlay · ${formatCurrency(deltas.protectedRevenue)} protected`
            : "no stock purchase modelled"
        }
      />
    </div>
  );
}

function signedCurrency(n: number): string {
  const s = formatCurrency(Math.abs(n));
  return n > 0 ? `+${s}` : n < 0 ? `−${s}` : s;
}

function Card({
  icon,
  accent,
  label,
  value,
  delta,
  sub,
  deltaAsPercent,
  neutralDelta,
}: {
  icon: React.ReactNode;
  accent: "teal" | "slate" | "red" | "emerald" | "amber";
  label: string;
  value: string;
  delta: number;
  sub: string;
  deltaAsPercent?: boolean;
  neutralDelta?: boolean;
}) {
  const accentCls = {
    teal: "bg-teal-50 text-teal-600 dark:bg-teal-950/40 dark:text-teal-300",
    slate: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
    red: "bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-300",
    emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300",
    amber: "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-300",
  }[accent];

  const good = delta > 0;
  const showDelta = !neutralDelta && Math.abs(delta) >= (deltaAsPercent ? 1 : 1);

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2">
        <span className={cn("flex size-7 items-center justify-center rounded-lg", accentCls)}>
          {icon}
        </span>
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
      </div>
      <p className="mt-2 text-xl font-bold tabular-nums">{value}</p>
      {showDelta && (
        <p
          className={cn(
            "mt-0.5 flex items-center gap-1 text-xs font-semibold",
            good ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
          )}
        >
          {good ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
          {deltaAsPercent
            ? `${good ? "−" : "+"}${Math.abs(Math.round(delta))} pts risk`
            : `${good ? "better" : "worse"} by ${formatCurrency(Math.abs(delta))}`}
        </p>
      )}
      <p className="mt-1.5 text-[11px] text-muted-foreground">{sub}</p>
    </div>
  );
}
