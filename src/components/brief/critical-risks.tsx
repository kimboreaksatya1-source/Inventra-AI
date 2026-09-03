import { cn } from "@/lib/utils";
import { PriorityBadge } from "@/components/shared/badges";
import { formatCurrency } from "@/lib/format";
import type { CriticalRisk } from "@/lib/types";

const BORDER: Record<string, string> = {
  CRITICAL: "border-l-red-500",
  HIGH: "border-l-amber-500",
  MEDIUM: "border-l-teal-500",
  LOW: "border-l-slate-300 dark:border-l-slate-600",
};

/** Top 3 at-risk products as compact cards — product, countdown, money, badge. */
export function CriticalRisks({ risks }: { risks: CriticalRisk[] }) {
  if (risks.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Nothing is projected to stock out within the next week.
      </p>
    );
  }
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {risks.slice(0, 3).map((r, i) => (
        <div
          key={`${r.product}-${i}`}
          className={cn(
            "rounded-xl border border-l-4 border-border bg-card p-3.5",
            BORDER[r.priority] ?? BORDER.LOW
          )}
        >
          <div className="flex items-start justify-between gap-2">
            <p className="min-w-0 truncate text-sm font-semibold" title={r.product}>
              {r.product}
            </p>
            <PriorityBadge priority={r.priority} />
          </div>
          <div className="mt-3 flex items-end justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Days left</p>
              <p className="text-lg font-bold tabular-nums">
                {r.daysRemaining > 0 ? r.daysRemaining : "0"}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">At risk</p>
              <p className="text-lg font-bold tabular-nums text-red-600 dark:text-red-400">
                {formatCurrency(r.revenueAtRisk)}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
