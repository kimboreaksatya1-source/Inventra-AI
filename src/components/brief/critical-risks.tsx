import { PriorityBadge } from "@/components/shared/badges";
import { formatCurrency } from "@/lib/format";
import type { CriticalRisk } from "@/lib/types";

export function CriticalRisks({ risks }: { risks: CriticalRisk[] }) {
  if (risks.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No products are projected to stock out within the next week. Focus on the opportunities below.
      </p>
    );
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {risks.map((r, i) => (
        <div
          key={`${r.product}-${i}`}
          className="rounded-xl border border-border bg-card p-4"
        >
          <div className="flex items-start justify-between gap-2">
            <p className="font-semibold">{r.product}</p>
            <PriorityBadge priority={r.priority} />
          </div>
          <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">Days Remaining</dt>
              <dd className="font-medium tabular-nums">
                {r.daysRemaining > 0 ? `${r.daysRemaining}` : "Out now"}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">Revenue at Risk</dt>
              <dd className="font-medium tabular-nums text-red-600 dark:text-red-400">
                {formatCurrency(r.revenueAtRisk)}
              </dd>
            </div>
          </dl>
        </div>
      ))}
    </div>
  );
}
