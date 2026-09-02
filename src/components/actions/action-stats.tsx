"use client";

import { CheckCircle2, Info, ListChecks, ShieldCheck, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format";
import type { ActionCenterTotals } from "@/lib/types";

export function ActionStats({ totals }: { totals: ActionCenterTotals }) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <ProgressStat
        icon={<ShieldCheck className="size-5" />}
        accent="teal"
        label="At-Risk Revenue Addressed"
        value={formatCurrency(totals.revenueProtected)}
        of={totals.revenueProtected + totals.revenueAtStake}
        done={totals.revenueProtected}
        hint={`${formatCurrency(totals.revenueAtStake)} still open · projected 30-day exposure on completed reorders`}
        note="Projection. Sum of the 30-day Revenue-at-Risk on reorder actions you have completed. Cash-flow and forecast actions are shown per-card and not added here."
      />
      <ProgressStat
        icon={<TrendingUp className="size-5" />}
        accent="emerald"
        label="Modelled Upside Captured"
        value={formatCurrency(totals.opportunitiesCaptured)}
        of={totals.opportunitiesCaptured + totals.opportunityAvailable}
        done={totals.opportunitiesCaptured}
        hint={`${formatCurrency(totals.opportunityAvailable)} available · modelled ~25%-more-orders margin`}
        note="Projection. Modelled margin upside from completed opportunity actions (assumes ~25% more orders)."
      />
      <PlainStat
        icon={<ListChecks className="size-5" />}
        accent="amber"
        label="Open Actions"
        value={String(totals.openCount)}
        hint="awaiting your call"
      />
      <PlainStat
        icon={<CheckCircle2 className="size-5" />}
        accent="charcoal"
        label="Completed"
        value={String(totals.completedCount)}
        hint={totals.dismissedCount > 0 ? `${totals.dismissedCount} dismissed` : "keep going"}
      />
    </div>
  );
}

const ACCENT = {
  teal: "bg-teal-50 text-teal-700 ring-teal-100 dark:bg-teal-950/40 dark:text-teal-300 dark:ring-teal-900",
  emerald:
    "bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900",
  amber: "bg-amber-50 text-amber-700 ring-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900",
  charcoal: "bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-800/60 dark:text-slate-200 dark:ring-slate-700",
};

function Shell({
  icon,
  accent,
  label,
  value,
  note,
  children,
}: {
  icon: React.ReactNode;
  accent: keyof typeof ACCENT;
  label: string;
  value: string;
  note?: string;
  children?: React.ReactNode;
}) {
  return (
    <Card className="gap-0 p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
            {note && (
              <span tabIndex={0} title={note} aria-label={`${label}: ${note}`} className="cursor-help text-muted-foreground/70">
                <Info className="size-3" />
              </span>
            )}
          </p>
          <p className="mt-1.5 text-2xl font-bold tracking-tight tabular-nums">{value}</p>
        </div>
        <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl ring-1", ACCENT[accent])}>
          {icon}
        </span>
      </div>
      {children}
    </Card>
  );
}

function ProgressStat({
  icon,
  accent,
  label,
  value,
  of,
  done,
  hint,
  note,
}: {
  icon: React.ReactNode;
  accent: keyof typeof ACCENT;
  label: string;
  value: string;
  of: number;
  done: number;
  hint: string;
  note?: string;
}) {
  const pct = of > 0 ? Math.round((done / of) * 100) : 0;
  return (
    <Shell icon={icon} accent={accent} label={label} value={value} note={note}>
      <div className="mt-3">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn("h-full rounded-full", accent === "emerald" ? "bg-emerald-500" : "bg-teal-500")}
            style={{ width: `${Math.max(2, pct)}%` }}
          />
        </div>
        <p className="mt-1.5 text-[11px] text-muted-foreground">{hint}</p>
      </div>
    </Shell>
  );
}

function PlainStat({
  icon,
  accent,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  accent: keyof typeof ACCENT;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <Shell icon={icon} accent={accent} label={label} value={value}>
      <p className="mt-3 text-[11px] text-muted-foreground">{hint}</p>
    </Shell>
  );
}
