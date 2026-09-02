"use client";

import Link from "next/link";
import {
  AlertCircle,
  Coins,
  Lock,
  Package,
  Percent,
  TrendingDown,
  Wallet,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { KpiCard } from "@/components/shared/kpi-card";
import { KpiCardSkeleton, TableSkeleton } from "@/components/shared/skeletons";
import { RecommendationChip, VelocityChip } from "@/components/shared/fmcg-chips";
import { EmptyState } from "@/components/shared/empty-state";
import { DataQualityBanner, DataRequiredState, dataAvailability } from "@/components/shared/data-quality";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format";
import { KPI } from "@/lib/kpi-glossary";
import { useCashflow } from "@/lib/queries";

export function CashflowClient() {
  const { data, isLoading, isError, error, refetch } = useCashflow();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <KpiCardSkeleton key={i} />
          ))}
        </div>
        <TableSkeleton />
      </div>
    );
  }

  if (isError) {
    return (
      <EmptyState
        icon={AlertCircle}
        title="Could not load the cash flow analysis"
        description={error instanceof Error ? error.message : "Please try again."}
        action={<Button onClick={() => refetch()}>Retry</Button>}
      />
    );
  }

  if (!data?.hasData) {
    return (
      <EmptyState
        icon={Package}
        tone="teal"
        title="No product data yet"
        description="Import your catalog and Inventra will show where your working capital is tied up."
        action={
          <Button asChild>
            <Link href="/upload">Upload data</Link>
          </Button>
        }
      />
    );
  }

  if (!dataAvailability(data.dataQuality, "cashflow").available) {
    return <DataRequiredState dq={data.dataQuality} feature="cashflow" />;
  }

  const k = data.kpis;
  const total = k.totalInventoryValue || 1;
  const seg = [
    { label: "Healthy stock", value: data.breakdown.healthy, cls: "bg-teal-500" },
    { label: "Slow-moving", value: data.breakdown.slowMoving, cls: "bg-amber-500" },
    { label: "Dead stock", value: data.breakdown.dead, cls: "bg-red-500" },
  ];

  return (
    <div className="space-y-6">
      <DataQualityBanner dq={data.dataQuality} />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <KpiCard
          label={KPI.totalInventoryValue.label}
          value={formatCurrency(k.totalInventoryValue)}
          icon={Wallet}
          accent="charcoal"
          hint="at cost price"
          note={KPI.totalInventoryValue.note}
        />
        <KpiCard
          label="Cash Locked in Slow Moving"
          value={formatCurrency(k.slowMovingValue)}
          icon={Lock}
          accent="amber"
          hint="cost of stock with slow velocity"
        />
        <KpiCard
          label={KPI.cashLockedPct.label}
          value={`${Math.round(k.cashLockedPct * 100)}%`}
          icon={Percent}
          accent="amber"
          hint={`${formatCurrency(k.cashLocked)} slow + dead, of inventory value`}
          note={KPI.cashLockedPct.note}
        />
        <KpiCard
          label={KPI.revenueAtRisk.label}
          value={formatCurrency(k.revenueAtRisk)}
          icon={TrendingDown}
          accent="red"
          hint="stockout exposure, next 30 days"
          note={`${KPI.revenueAtRisk.note} Shown here for context — it is separate from capital locked in stock.`}
        />
        <KpiCard
          label={KPI.workingCapitalHealth.label}
          value={`${k.workingCapitalHealth}/100`}
          icon={Coins}
          accent={k.workingCapitalHealth >= 70 ? "emerald" : k.workingCapitalHealth >= 55 ? "amber" : "red"}
          hint={`${k.workingCapitalLabel} · ${KPI.workingCapitalHealthShort}`}
          note={KPI.workingCapitalHealth.note}
        />
      </div>

      <Card className="p-6">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Cash Locked Breakdown
          </h2>
          <span className="text-xs text-muted-foreground">{formatCurrency(k.totalInventoryValue)} total</span>
        </div>
        <div className="mt-4 flex h-4 w-full overflow-hidden rounded-full bg-muted">
          {seg.map((s) =>
            s.value > 0 ? (
              <div
                key={s.label}
                className={cn("h-full", s.cls)}
                style={{ width: `${(s.value / total) * 100}%` }}
                title={`${s.label}: ${formatCurrency(s.value)}`}
              />
            ) : null
          )}
        </div>
        <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1.5">
          {seg.map((s) => (
            <div key={s.label} className="flex items-center gap-2 text-xs">
              <span className={cn("size-2.5 rounded-full", s.cls)} />
              <span className="text-muted-foreground">{s.label}</span>
              <span className="font-semibold tabular-nums">
                {formatCurrency(s.value)} ({Math.round((s.value / total) * 100)}%)
              </span>
            </div>
          ))}
        </div>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{data.explanation}</p>
      </Card>

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Top Capital Consumers
        </h2>
        <Card className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-10 text-center">#</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                <TableHead className="text-right">Unit Cost</TableHead>
                <TableHead className="text-right">Inventory Value</TableHead>
                <TableHead>% of Capital</TableHead>
                <TableHead>Recommendation</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.topConsumers.map((c, i) => (
                <TableRow key={c.id}>
                  <TableCell className="text-center text-xs text-muted-foreground tabular-nums">
                    {i + 1}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{c.name}</span>
                      <VelocityChip velocity={c.velocity} />
                    </div>
                    {c.sku && <div className="text-xs text-muted-foreground">{c.sku}</div>}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{c.category}</TableCell>
                  <TableCell className="text-right tabular-nums">{c.stock}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatCurrency(c.unitCost, { decimals: 2 })}</TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">
                    {formatCurrency(c.inventoryValue)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-teal-500"
                          style={{ width: `${Math.min(100, c.shareOfCapital * 100)}%` }}
                        />
                      </div>
                      <span className="text-xs tabular-nums text-muted-foreground">
                        {Math.round(c.shareOfCapital * 100)}%
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <RecommendationChip recommendation={c.recommendation} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>
    </div>
  );
}
