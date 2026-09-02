import { ArrowUpRight, Info } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { opportunityEvidence } from "@/lib/forecast-evidence";
import type { RevenueOpportunity } from "@/lib/types";

export function RevenueOpportunities({ items }: { items: RevenueOpportunity[] }) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No standout growth opportunities in this dataset yet — revisit after a few more weeks of sales.
      </p>
    );
  }
  const fe = opportunityEvidence();
  return (
    <div className="space-y-5">
      <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50/60 px-3 py-2 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
        <Info className="mt-0.5 size-3.5 shrink-0" />
        <div>
          <p>
            <span className="font-semibold">Modelled — {fe.confidence} confidence.</span>{" "}
            {fe.confidenceReason.replace(/^Confidence \w+ — /, "")}
          </p>
          <p className="mt-1">
            Assumes: {fe.assumptions.join("; ")}. May not hold if {fe.reliabilityFactors[0]}.
          </p>
        </div>
      </div>
      {items.map((o, i) => (
        <div key={`${o.title}-${i}`} className="border-l-2 border-teal-500 pl-4">
          <p className="font-semibold">{o.title}</p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{o.observation}</p>
          <div className="mt-2 space-y-1 text-sm">
            <p>
              <span className="font-medium text-foreground">Recommended action: </span>
              {o.recommendedAction}
            </p>
            <p
              className="inline-flex items-center gap-1 font-medium text-teal-600 dark:text-teal-400"
              title="Projection — assumes ~25% more orders on this line: extra weekly units × unit margin × 4 weeks. A modelled opportunity, not expected revenue."
            >
              <ArrowUpRight className="size-4" />
              Modelled margin upside (~25% more orders): {formatCurrency(o.expectedRevenueImpact)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
