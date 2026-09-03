import { ArrowUpRight, Info } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { opportunityEvidence } from "@/lib/forecast-evidence";
import type { RevenueOpportunity } from "@/lib/types";

/** Top 3 opportunities as cards — the upside number and a confidence chip, no essay. */
export function RevenueOpportunities({ items }: { items: RevenueOpportunity[] }) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No standout growth opportunities in this dataset yet.
      </p>
    );
  }
  const fe = opportunityEvidence();
  const top = items.slice(0, 3);
  const totalUpside = top.reduce((s, o) => s + o.expectedRevenueImpact, 0);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2 py-1 font-semibold text-teal-700 dark:bg-teal-950/40 dark:text-teal-300">
          <ArrowUpRight className="size-3.5" />
          {formatCurrency(totalUpside)} / mo modelled upside
        </span>
        <span
          className="inline-flex items-center gap-1 text-muted-foreground"
          title={`${fe.confidenceReason} Assumes: ${fe.assumptions.join("; ")}.`}
        >
          <Info className="size-3.5" />
          Modelled · {fe.confidence} confidence
        </span>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {top.map((o, i) => (
          <div
            key={`${o.title}-${i}`}
            className="rounded-xl border border-l-4 border-border border-l-teal-500 bg-card p-3.5"
          >
            <p className="text-sm font-semibold leading-snug">{o.title}</p>
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{o.recommendedAction}</p>
            <p className="mt-3 text-lg font-bold tabular-nums text-teal-600 dark:text-teal-400">
              +{formatCurrency(o.expectedRevenueImpact)}
              <span className="ml-1 text-xs font-medium text-muted-foreground">/ mo</span>
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
