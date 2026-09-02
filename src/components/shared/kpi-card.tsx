"use client";

import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { ArrowDownRight, ArrowUpRight, Info } from "lucide-react";

export interface KpiCardProps {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  hint?: string;
  /** Plain-language "what this number is / how it's computed" — shown on hover + as a11y text. */
  note?: string;
  trend?: number;
  trendSuffix?: string;
  trendInvert?: boolean; // when true, a down trend is good
  accent?: "teal" | "amber" | "red" | "emerald" | "charcoal";
  loading?: boolean;
}

const accentMap = {
  teal: "bg-teal-50 text-teal-700 ring-teal-100 dark:bg-teal-950/40 dark:text-teal-300 dark:ring-teal-900",
  amber: "bg-amber-50 text-amber-700 ring-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900",
  red: "bg-red-50 text-red-700 ring-red-100 dark:bg-red-950/40 dark:text-red-300 dark:ring-red-900",
  emerald: "bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900",
  charcoal: "bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-800/60 dark:text-slate-200 dark:ring-slate-700",
};

export function KpiCard({
  label,
  value,
  icon: Icon,
  hint,
  note,
  trend,
  trendSuffix = "%",
  trendInvert = false,
  accent = "teal",
  loading,
}: KpiCardProps) {
  const good = trend === undefined ? null : trendInvert ? trend <= 0 : trend >= 0;
  return (
    <Card className="relative overflow-hidden p-5 gap-0 hover:shadow-md transition-shadow group">
      <div className="flex items-start justify-between">
        <div className="space-y-2 min-w-0">
          <p className="flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
            {note && (
              <span
                tabIndex={0}
                title={note}
                aria-label={`${label}: ${note}`}
                className="cursor-help text-muted-foreground/70 hover:text-muted-foreground"
              >
                <Info className="size-3" />
              </span>
            )}
          </p>
          {loading ? (
            <div className="h-8 w-24 animate-pulse rounded-md bg-slate-200 dark:bg-slate-700" />
          ) : (
            <p className="text-2xl font-bold tracking-tight text-foreground tabular-nums">
              {value}
            </p>
          )}
          {hint && !loading && (
            <p className="text-xs text-muted-foreground">{hint}</p>
          )}
        </div>
        <div
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-xl ring-1 transition-transform group-hover:scale-105",
            accentMap[accent]
          )}
        >
          <Icon className="size-5" />
        </div>
      </div>
      {trend !== undefined && !loading && (
        <div className="mt-3 flex items-center gap-1.5">
          {good === true ? (
            <ArrowUpRight className="size-3.5 text-emerald-600" />
          ) : (
            <ArrowDownRight className="size-3.5 text-red-600" />
          )}
          <span
            className={cn(
              "text-xs font-semibold tabular-nums",
              good ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
            )}
          >
            {trend > 0 ? "+" : ""}
            {trend}
            {trendSuffix}
          </span>
          <span className="text-xs text-muted-foreground">vs last week</span>
        </div>
      )}
    </Card>
  );
}
