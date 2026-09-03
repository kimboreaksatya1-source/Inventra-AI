"use client";

import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format";
import type { BusinessAction } from "@/lib/types";

const DOT: Record<string, string> = {
  CRITICAL: "text-red-500",
  HIGH: "text-amber-500",
  MEDIUM: "text-teal-500",
  LOW: "text-slate-400",
};

/** Replaces the "Today's briefing" paragraph — the 3 highest-impact open actions, at a glance. */
export function ActionHighlights({ actions }: { actions: BusinessAction[] }) {
  const top = [...actions].sort((a, b) => b.impactValue - a.impactValue).slice(0, 3);
  if (top.length === 0) return null;

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Top 3 highlights
      </p>
      <ul className="mt-2 divide-y divide-border">
        {top.map((a) => {
          const opp = a.category === "opportunity";
          return (
            <li key={a.key} className="flex items-center gap-3 py-2.5 first:pt-1 last:pb-1">
              <AlertTriangle className={cn("size-4 shrink-0", DOT[a.priority] ?? DOT.LOW)} />
              <span
                className="min-w-0 flex-1 truncate text-sm font-medium"
                title={a.recommendation}
              >
                {a.recommendation}
              </span>
              <span
                className={cn(
                  "shrink-0 text-sm font-semibold tabular-nums",
                  opp
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-teal-700 dark:text-teal-300"
                )}
              >
                {opp ? "+" : ""}
                {formatCurrency(Math.abs(a.impactValue))}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
