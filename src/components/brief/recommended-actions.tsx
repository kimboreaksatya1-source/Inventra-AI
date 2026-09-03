import { PriorityBadge } from "@/components/shared/badges";
import type { RecommendedAction } from "@/lib/types";

const RANK = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 } as const;

export function RecommendedActions({ actions }: { actions: RecommendedAction[] }) {
  const ordered = [...actions].sort((a, b) => RANK[a.priority] - RANK[b.priority]);
  return (
    <ol className="space-y-3">
      {ordered.map((a, i) => (
        <li key={i} className="rounded-xl border border-border bg-card p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <p className="min-w-0 flex-1 font-semibold break-words">{a.action}</p>
            <PriorityBadge priority={a.priority} />
          </div>
          <p className="mt-2 text-sm text-muted-foreground break-words">{a.reason}</p>
          <p className="mt-2 text-sm break-words">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Expected impact:{" "}
            </span>
            <span className="font-medium">{a.expectedImpact}</span>
          </p>
        </li>
      ))}
    </ol>
  );
}
