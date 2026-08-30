"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ClipboardCopy,
  FileDown,
  Loader2,
  Package,
  PackageCheck,
  Search,
  ShoppingCart,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { KpiCard } from "@/components/shared/kpi-card";
import { KpiCardSkeleton, TableSkeleton } from "@/components/shared/skeletons";
import { PriorityBadge } from "@/components/shared/badges";
import { VelocityChip } from "@/components/shared/fmcg-chips";
import { EmptyState } from "@/components/shared/empty-state";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format";
import { useProcurement, useGeneratePurchasePlan } from "@/lib/queries";
import { exportPurchasePlanPdf } from "@/lib/purchase-plan-pdf";
import type { Priority, ProcurementPlanResponse, ProcurementRow } from "@/lib/types";

const PRIORITY_MAP: Record<ProcurementRow["priority"], Priority> = {
  Critical: "CRITICAL",
  High: "HIGH",
  Medium: "MEDIUM",
  Low: "LOW",
};

const FILTERS: { id: ProcurementRow["priority"] | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "Critical", label: "Critical" },
  { id: "High", label: "High" },
  { id: "Medium", label: "Medium" },
  { id: "Low", label: "Low" },
];

export function ProcurementClient() {
  const { data, isLoading, isError, error, refetch } = useProcurement();
  const genPlan = useGeneratePurchasePlan();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<ProcurementRow["priority"] | "all">("all");
  const [plan, setPlan] = useState<ProcurementPlanResponse | null>(null);

  const rows = data?.rows ?? [];
  const business = "your business";

  const filtered = useMemo(() => {
    let list = [...rows];
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          (p.brand ?? "").toLowerCase().includes(q) ||
          (p.sku ?? "").toLowerCase().includes(q)
      );
    }
    if (filter !== "all") list = list.filter((p) => p.priority === filter);
    return list;
  }, [rows, search, filter]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
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
        title="Could not load the procurement plan"
        description={error instanceof Error ? error.message : "Please try again."}
        action={<Button onClick={() => refetch()}>Retry</Button>}
      />
    );
  }

  if (!data?.hasData || !data.kpis) {
    return (
      <EmptyState
        icon={Package}
        tone="teal"
        title="No product data yet"
        description="Import your catalog and Inventra will build a purchasing plan from your stock and sales."
        action={
          <Button asChild>
            <Link href="/upload">Upload data</Link>
          </Button>
        }
      />
    );
  }

  const k = data.kpis;

  async function generate() {
    try {
      const res = await genPlan.mutateAsync();
      setPlan(res);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not generate the purchase plan.");
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          label="Products to Reorder"
          value={String(k.productsToReorder)}
          icon={ShoppingCart}
          accent="teal"
        />
        <KpiCard
          label="Critical Orders"
          value={String(k.criticalOrders)}
          icon={AlertCircle}
          accent="red"
          hint="Stock out < 3 days"
        />
        <KpiCard
          label="Estimated Purchase Cost"
          value={formatCurrency(k.estimatedPurchaseCost)}
          icon={PackageCheck}
          accent="charcoal"
          hint={`${k.estimatedPurchaseUnits.toLocaleString()} units`}
        />
        <KpiCard
          label="Revenue Protected"
          value={formatCurrency(k.revenueProtected)}
          icon={TrendingUp}
          accent="emerald"
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search products or categories"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                filter === f.id
                  ? "bg-teal-600 text-white"
                  : "bg-muted text-muted-foreground hover:bg-teal-50 hover:text-teal-700 dark:hover:bg-teal-950/40"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <Card className="p-0 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Product</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead className="text-right">Current Stock</TableHead>
              <TableHead className="text-right">Days Remaining</TableHead>
              <TableHead className="text-right">Suggested Qty</TableHead>
              <TableHead className="text-center">Priority</TableHead>
              <TableHead className="text-right">Est. Cost</TableHead>
              <TableHead>Reason</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((p) => {
              const needsOrder = p.suggestedQuantity > 0;
              const critical = p.priority === "Critical";
              return (
                <TableRow
                  key={p.id}
                  className={cn(critical && "bg-red-50/70 hover:bg-red-50 dark:bg-red-950/20")}
                >
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{p.name}</span>
                      <VelocityChip velocity={p.velocity} />
                    </div>
                    <div className="text-xs text-muted-foreground">{p.category}</div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{p.sku ?? "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">{p.stock}</TableCell>
                  <TableCell
                    className={cn(
                      "text-right font-medium tabular-nums",
                      critical
                        ? "text-red-600 dark:text-red-400"
                        : p.priority === "High"
                        ? "text-amber-600 dark:text-amber-400"
                        : "text-foreground"
                    )}
                  >
                    {Number.isFinite(p.daysRemaining) ? `${p.daysRemaining.toFixed(1)}d` : "—"}
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">
                    {needsOrder ? p.suggestedQuantity.toLocaleString() : "—"}
                  </TableCell>
                  <TableCell className="text-center">
                    {needsOrder ? (
                      <PriorityBadge priority={PRIORITY_MAP[p.priority]} />
                    ) : (
                      <span className="text-xs text-muted-foreground">Covered</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {needsOrder ? formatCurrency(p.estimatedCost) : "—"}
                  </TableCell>
                  <TableCell className="max-w-xs text-xs text-muted-foreground">{p.reason}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        {filtered.length === 0 && (
          <div className="px-4 py-10 text-center text-sm text-muted-foreground">
            No products match this filter.
          </div>
        )}
      </Card>

      <Card className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
              <Sparkles className="size-4 text-teal-600" />
              Purchase Plan
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              A clean purchasing recommendation you can send to your supplier.
            </p>
          </div>
          <Button onClick={generate} disabled={genPlan.isPending}>
            {genPlan.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <ShoppingCart className="size-4" />
            )}
            Generate Purchase Plan
          </Button>
        </div>

        {plan && (
          <div className="mt-6 space-y-4">
            <div className="rounded-lg border border-teal-100 bg-teal-50/60 p-4 text-sm leading-relaxed dark:border-teal-900 dark:bg-teal-950/30">
              {plan.summary}
              <span className="mt-2 block text-xs text-muted-foreground">
                {plan.source === "ai"
                  ? "Narrative generated by Inventra AI from your data."
                  : "Generated from your data using Inventra's analysis engine."}
              </span>
            </div>

            {plan.plan.length > 0 && (
              <>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      try {
                        exportPurchasePlanPdf(plan, business);
                      } catch {
                        toast.error("Could not generate the PDF.");
                      }
                    }}
                  >
                    <FileDown className="size-4" />
                    Export PDF
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard
                        .writeText(planToText(plan))
                        .then(() => toast.success("Purchase plan copied."))
                        .catch(() => toast.error("Could not copy."));
                    }}
                  >
                    <ClipboardCopy className="size-4" />
                    Copy
                  </Button>
                </div>

                <div className="overflow-x-auto rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead>Product</TableHead>
                        <TableHead>SKU</TableHead>
                        <TableHead className="text-right">Current Stock</TableHead>
                        <TableHead className="text-right">Suggested Qty</TableHead>
                        <TableHead className="text-right">Est. Cost</TableHead>
                        <TableHead className="text-center">Priority</TableHead>
                        <TableHead>Reason</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {plan.plan.map((r) => (
                        <TableRow key={r.id}>
                          <TableCell className="font-medium">{r.name}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {r.sku ?? "—"}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">{r.stock}</TableCell>
                          <TableCell className="text-right font-semibold tabular-nums">
                            {r.suggestedQuantity.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatCurrency(r.estimatedCost)}
                          </TableCell>
                          <TableCell className="text-center">
                            <PriorityBadge priority={PRIORITY_MAP[r.priority]} />
                          </TableCell>
                          <TableCell className="max-w-xs text-xs text-muted-foreground">
                            {r.reason}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}

function planToText(plan: ProcurementPlanResponse): string {
  const lines = plan.plan.map(
    (r) =>
      `- ${r.name}${r.sku ? ` (${r.sku})` : ""} — order ${r.suggestedQuantity} units (~${formatCurrency(
        r.estimatedCost
      )}), ${r.priority}. ${r.reason}`
  );
  return [
    "PURCHASE PLAN — Inventra AI",
    "",
    plan.summary.replace(/\*\*/g, ""),
    "",
    `Products to reorder: ${plan.kpis.productsToReorder} · Critical: ${plan.kpis.criticalOrders} · Est. cost: ${formatCurrency(
      plan.kpis.estimatedPurchaseCost
    )} · Revenue protected: ${formatCurrency(plan.kpis.revenueProtected)}`,
    "",
    ...lines,
  ].join("\n");
}
