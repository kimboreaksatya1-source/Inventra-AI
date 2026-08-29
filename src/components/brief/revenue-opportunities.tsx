import { ArrowUpRight } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import type { RevenueOpportunity } from "@/lib/types";

export function RevenueOpportunities({ items }: { items: RevenueOpportunity[] }) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No standout growth opportunities in this dataset yet — revisit after a few more weeks of sales.
      </p>
    );
  }
  return (
    <div className="space-y-5">
      {items.map((o, i) => (
        <div key={`${o.title}-${i}`} className="border-l-2 border-teal-500 pl-4">
          <p className="font-semibold">{o.title}</p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{o.observation}</p>
          <div className="mt-2 space-y-1 text-sm">
            <p>
              <span className="font-medium text-foreground">Recommended action: </span>
              {o.recommendedAction}
            </p>
            <p className="inline-flex items-center gap-1 font-medium text-teal-600 dark:text-teal-400">
              <ArrowUpRight className="size-4" />
              Expected revenue impact: {formatCurrency(o.expectedRevenueImpact)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
