import { PriorityBadge } from "@/components/shared/badges";
import type { RecommendedAction } from "@/lib/types";

const RANK = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 } as const;

/** Top 3 actions — compact rows, impact as a chip, no rationale paragraph. */
export function RecommendedActions({ actions }: { actions: RecommendedAction[] }) {
  const ordered = [...actions]
    .sort((a, b) => RANK[a.priority] - RANK[b.priority])
    .slice(0, 3);

  return (
    <ol className="grid gap-3 sm:grid-cols-3">
      {ordered.map((a, i) => (
        <li key={i} className="flex flex-col rounded-xl border border-border bg-card p-3.5">
          <div className="flex items-start justify-between gap-2">
            <span className="flex size-5 shrink-0 items-center justify-center rounded-md bg-teal-600 text-[11px] font-semibold text-white">
              {i + 1}
            </span>
            <PriorityBadge priority={a.priority} />
          </div>
          <p className="mt-2 flex-1 text-sm font-semibold leading-snug break-words">{a.action}</p>
          <p className="mt-2 rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
            {a.expectedImpact}
          </p>
        </li>
      ))}
    </ol>
  );
}
