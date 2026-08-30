"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowDown,
  ArrowUp,
  ChevronsUpDown,
  Package,
  Search,
  ShieldAlert,
  TrendingDown,
} from "lucide-react";
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
import { PriorityBadge } from "@/components/shared/badges";
import { RecommendationChip, VelocityChip } from "@/components/shared/fmcg-chips";
import { TableSkeleton } from "@/components/shared/skeletons";
import { EmptyState, NoRiskEmptyState } from "@/components/shared/empty-state";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format";
import { useAnalysis } from "@/lib/queries";
import type { Priority, ProductAnalysis, RiskLevel } from "@/lib/types";

const PRIORITY_BY_RISK: Record<RiskLevel, Priority> = {
  Critical: "CRITICAL",
  High: "HIGH",
  Medium: "MEDIUM",
  Low: "LOW",
  None: "LOW",
};

const FILTERS: { id: RiskLevel | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "Critical", label: "Critical" },
  { id: "High", label: "High" },
  { id: "Medium", label: "Medium" },
  { id: "Low", label: "Low" },
];

type SortKey = "name" | "stock" | "dailySales" | "daysRemaining" | "estimatedRevenueAtRisk";

export function RiskTable() {
  const { data, isLoading, isError, error, refetch } = useAnalysis();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<RiskLevel | "all">("all");
  const [sortKey, setSortKey] = useState<SortKey>("estimatedRevenueAtRisk");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const products = data?.analysis?.products ?? [];

  const rows = useMemo(() => {
    let list = [...products];
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
    if (filter !== "all") list = list.filter((p) => p.riskLevel === filter);
    list.sort((a, b) => {
      const av = sortValue(a, sortKey);
      const bv = sortValue(b, sortKey);
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return list;
  }, [products, search, filter, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "name" ? "asc" : "desc");
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          <div className="h-28 animate-pulse rounded-xl bg-muted" />
          <div className="h-28 animate-pulse rounded-xl bg-muted" />
          <div className="h-28 animate-pulse rounded-xl bg-muted" />
        </div>
        <TableSkeleton />
      </div>
    );
  }

  if (isError) {
    return (
      <EmptyState
        icon={ShieldAlert}
        title="Could not load your analysis"
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
        description="Import your catalog to see which products put revenue at risk."
        action={
          <Button asChild>
            <Link href="/upload">Upload data</Link>
          </Button>
        }
      />
    );
  }

  const totalAtRisk = products.reduce((s, p) => s + p.estimatedRevenueAtRisk, 0);
  const criticalCount = products.filter((p) => p.riskLevel === "Critical").length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <KpiCard
          label="Total Revenue at Risk"
          value={formatCurrency(totalAtRisk)}
          icon={TrendingDown}
          accent="red"
          hint="Next 30 days"
        />
        <KpiCard
          label="Critical Products"
          value={String(criticalCount)}
          icon={ShieldAlert}
          accent="amber"
          hint="Stock out < 3 days"
        />
        <KpiCard
          label="Products Tracked"
          value={String(products.length)}
          icon={Package}
          accent="teal"
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

      <Card className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <SortHeader label="Product" active={sortKey === "name"} dir={sortDir} onClick={() => toggleSort("name")} />
              <SortHeader label="Current Stock" align="right" active={sortKey === "stock"} dir={sortDir} onClick={() => toggleSort("stock")} />
              <SortHeader label="Daily Sales" align="right" active={sortKey === "dailySales"} dir={sortDir} onClick={() => toggleSort("dailySales")} />
              <SortHeader label="Days Remaining" align="right" active={sortKey === "daysRemaining"} dir={sortDir} onClick={() => toggleSort("daysRemaining")} />
              <SortHeader label="Revenue at Risk" align="right" active={sortKey === "estimatedRevenueAtRisk"} dir={sortDir} onClick={() => toggleSort("estimatedRevenueAtRisk")} />
              <TableHead className="text-center">Priority</TableHead>
              <TableHead>Suggested</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((p) => {
              const critical = p.riskLevel === "Critical";
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
                    <div className="text-xs text-muted-foreground">
                      {p.sku ? `${p.sku} · ` : ""}
                      {p.category}
                    </div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{p.stock}</TableCell>
                  <TableCell className="text-right tabular-nums">{p.dailySales}</TableCell>
                  <TableCell
                    className={cn(
                      "text-right font-semibold tabular-nums",
                      critical
                        ? "text-red-600 dark:text-red-400"
                        : p.riskLevel === "High"
                        ? "text-amber-600 dark:text-amber-400"
                        : "text-foreground"
                    )}
                  >
                    {Number.isFinite(p.daysRemaining) ? `${p.daysRemaining.toFixed(1)}d` : "—"}
                  </TableCell>
                  <TableCell
                    className={cn(
                      "text-right font-semibold tabular-nums",
                      p.estimatedRevenueAtRisk > 0 ? "text-red-600 dark:text-red-400" : "text-muted-foreground"
                    )}
                  >
                    {formatCurrency(p.estimatedRevenueAtRisk)}
                  </TableCell>
                  <TableCell className="text-center">
                    {p.riskLevel === "None" ? (
                      <span className="text-xs text-muted-foreground">No sales</span>
                    ) : (
                      <PriorityBadge priority={PRIORITY_BY_RISK[p.riskLevel]} />
                    )}
                  </TableCell>
                  <TableCell>
                    <RecommendationChip recommendation={p.recommendation} />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        {rows.length === 0 && (
          <div className="px-4 py-10 text-center text-sm text-muted-foreground">
            {filter === "all" && !search ? (
              <NoRiskEmptyState />
            ) : (
              "No products match this filter."
            )}
          </div>
        )}
      </Card>
    </div>
  );
}

function sortValue(p: ProductAnalysis, key: SortKey): number | string {
  if (key === "name") return p.name.toLowerCase();
  if (key === "daysRemaining") return Number.isFinite(p.daysRemaining) ? p.daysRemaining : 9e9;
  return p[key];
}

function SortHeader({
  label,
  active,
  dir,
  onClick,
  align = "left",
}: {
  label: string;
  active: boolean;
  dir: "asc" | "desc";
  onClick: () => void;
  align?: "left" | "right";
}) {
  return (
    <TableHead className={align === "right" ? "text-right" : undefined}>
      <button
        onClick={onClick}
        className={cn(
          "inline-flex items-center gap-1 text-xs font-medium hover:text-foreground",
          align === "right" && "flex-row-reverse",
          active ? "text-foreground" : "text-muted-foreground"
        )}
      >
        {label}
        {active ? (
          dir === "asc" ? (
            <ArrowUp className="size-3.5" />
          ) : (
            <ArrowDown className="size-3.5" />
          )
        ) : (
          <ChevronsUpDown className="size-3.5 opacity-50" />
        )}
      </button>
    </TableHead>
  );
}
