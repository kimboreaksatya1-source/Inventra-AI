"use client";

import { RotateCcw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { ProductAnalysis, ProductRecommendation, RiskLevel } from "@/lib/types";

export type DaysBucket = "all" | "lt3" | "3to7" | "7to14" | "gte14";
export type PriorityFilter = RiskLevel | "all";
export type ActionFilter = ProductRecommendation | "all";

export interface RiskFilterState {
  search: string;
  priority: PriorityFilter;
  days: DaysBucket;
  action: ActionFilter;
  category: string; // "all" or an exact category
}

export const DEFAULT_RISK_FILTERS: RiskFilterState = {
  search: "",
  priority: "all",
  days: "all",
  action: "all",
  category: "all",
};

export function isFiltered(f: RiskFilterState): boolean {
  return (
    f.search.trim() !== "" ||
    f.priority !== "all" ||
    f.days !== "all" ||
    f.action !== "all" ||
    f.category !== "all"
  );
}

/** One product against the full filter set — all conditions AND together. */
export function matchesFilters(p: ProductAnalysis, f: RiskFilterState): boolean {
  const q = f.search.trim().toLowerCase();
  if (
    q &&
    !`${p.name} ${p.category} ${p.brand ?? ""} ${p.sku ?? ""}`.toLowerCase().includes(q)
  )
    return false;

  if (f.priority !== "all" && p.riskLevel !== f.priority) return false;
  if (f.action !== "all" && p.recommendation !== f.action) return false;
  if (f.category !== "all" && p.category !== f.category) return false;

  if (f.days !== "all") {
    const d = p.daysRemaining;
    const fin = Number.isFinite(d);
    if (f.days === "lt3" && !(fin && d < 3)) return false;
    if (f.days === "3to7" && !(fin && d >= 3 && d < 7)) return false;
    if (f.days === "7to14" && !(fin && d >= 7 && d < 14)) return false;
    if (f.days === "gte14" && !(!fin || d >= 14)) return false;
  }
  return true;
}

const PRIORITY_OPTS: { id: PriorityFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "Critical", label: "Critical" },
  { id: "High", label: "High" },
  { id: "Medium", label: "Medium" },
  { id: "Low", label: "Low" },
];

const DAYS_OPTS: { id: DaysBucket; label: string }[] = [
  { id: "all", label: "All" },
  { id: "lt3", label: "< 3d" },
  { id: "3to7", label: "3–7d" },
  { id: "7to14", label: "7–14d" },
  { id: "gte14", label: "14d+" },
];

const ACTION_OPTS: { id: ActionFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "Reorder", label: "Reorder" },
  { id: "Monitor", label: "Monitor" },
  { id: "Reduce", label: "Reduce Stock" },
];

function Pill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
        active
          ? "bg-teal-600 text-white"
          : "bg-muted text-muted-foreground hover:bg-teal-50 hover:text-teal-700 dark:hover:bg-teal-950/40"
      )}
    >
      {children}
    </button>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
      <span className="w-16 shrink-0 text-xs font-medium text-muted-foreground sm:w-20">
        {label}
      </span>
      {/* flex-1 + min-w-0 so a `w-full` child (the Category select) can resolve
          against the remaining row width instead of shrink-wrapping. Pills are
          flex-wrap, so widening the container changes nothing visible for them. */}
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">{children}</div>
    </div>
  );
}

export function RiskFilters({
  value,
  onChange,
  categories,
  shown,
  total,
}: {
  value: RiskFilterState;
  onChange: (next: RiskFilterState) => void;
  categories: string[];
  shown: number;
  total: number;
}) {
  const set = <K extends keyof RiskFilterState>(k: K, v: RiskFilterState[K]) =>
    onChange({ ...value, [k]: v });

  return (
    <div className="space-y-3 rounded-xl border border-border bg-card p-4">
      <div className="relative sm:max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search products, SKU or category"
          value={value.search}
          onChange={(e) => set("search", e.target.value)}
          className="pl-9"
          aria-label="Search products"
        />
      </div>

      <Row label="Priority">
        {PRIORITY_OPTS.map((o) => (
          <Pill key={o.id} active={value.priority === o.id} onClick={() => set("priority", o.id)}>
            {o.label}
          </Pill>
        ))}
      </Row>

      <Row label="Days left">
        {DAYS_OPTS.map((o) => (
          <Pill key={o.id} active={value.days === o.id} onClick={() => set("days", o.id)}>
            {o.label}
          </Pill>
        ))}
      </Row>

      <Row label="Action">
        {ACTION_OPTS.map((o) => (
          <Pill key={o.id} active={value.action === o.id} onClick={() => set("action", o.id)}>
            {o.label}
          </Pill>
        ))}
      </Row>

      <Row label="Category">
        <div className="w-full sm:w-56">
          <Select value={value.category} onValueChange={(v) => set("category", v)}>
            <SelectTrigger className="h-8 w-full text-xs" aria-label="Filter by category">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Row>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
        <p className="text-xs text-muted-foreground">
          Showing <span className="font-semibold text-foreground tabular-nums">{shown}</span> of{" "}
          <span className="tabular-nums">{total}</span> products
        </p>
        <Button
          variant="ghost"
          size="sm"
          disabled={!isFiltered(value)}
          onClick={() => onChange(DEFAULT_RISK_FILTERS)}
          className="text-muted-foreground"
        >
          <RotateCcw className="size-3.5" />
          Clear filters
        </Button>
      </div>
    </div>
  );
}
