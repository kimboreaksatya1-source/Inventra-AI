"use client";

import { Bookmark, Check, RotateCcw, X } from "lucide-react";
import { PriorityBadge, ConfidenceMeter } from "@/components/shared/badges";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format";
import type { ActionCategory, ActionStatus, BusinessAction } from "@/lib/types";

const CATEGORY_LABEL: Record<ActionCategory, string> = {
  reorder: "Reorder",
  opportunity: "Opportunity",
  cashflow: "Cash Flow",
  risk: "Risk",
  scenario: "Forecast",
};

export function ActionCard({
  action,
  onSetStatus,
  pending,
}: {
  action: BusinessAction;
  onSetStatus: (status: ActionStatus) => void;
  pending?: boolean;
}) {
  const saved = action.status === "saved";
  const isOpportunity = action.category === "opportunity";

  return (
    <div
      className={cn(
        "rounded-xl border bg-card p-4 transition-opacity",
        saved ? "border-amber-300 dark:border-amber-800" : "border-border",
        pending && "opacity-50"
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <PriorityBadge priority={action.priority} />
        <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          {CATEGORY_LABEL[action.category]}
        </span>
        {action.source.map((s) => (
          <span
            key={s}
            className="rounded-md border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground"
          >
            {s}
          </span>
        ))}
        {saved && (
          <span className="ml-auto inline-flex items-center gap-1 text-[10px] font-medium text-amber-600 dark:text-amber-400">
            <Bookmark className="size-3 fill-current" />
            Saved
          </span>
        )}
      </div>

      <div className="mt-2.5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="font-semibold">{action.recommendation}</p>
          {action.reasons?.length ? (
            <ul className="mt-1.5 space-y-0.5 text-sm text-muted-foreground">
              {action.reasons.map((r, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <span className="mt-1.5 size-1 shrink-0 rounded-full bg-muted-foreground/50" />
                  {r}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">{action.reason}</p>
          )}
          {action.triggeredBy && (
            <p className="mt-1.5 text-[11px] text-muted-foreground/80">
              <span className="font-medium">Why you&apos;re seeing this:</span> {action.triggeredBy}
            </p>
          )}
        </div>
        <div className="shrink-0 sm:w-40 sm:text-right">
          <p
            className={cn(
              "text-sm font-bold tabular-nums",
              isOpportunity ? "text-emerald-600 dark:text-emerald-400" : "text-teal-700 dark:text-teal-300"
            )}
          >
            {isOpportunity ? "+" : ""}
            {formatCurrency(Math.abs(action.impactValue))}
          </p>
          <p className="text-[11px] text-muted-foreground">{action.expectedImpact}</p>
          <div className="mt-2 sm:ml-auto sm:max-w-[150px]">
            <ConfidenceMeter value={action.confidence} size="sm" />
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          onClick={() => onSetStatus("completed")}
          disabled={pending}
          className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-teal-700 disabled:opacity-50"
        >
          <Check className="size-3.5" />
          Mark complete
        </button>
        <button
          onClick={() => onSetStatus(saved ? "open" : "saved")}
          disabled={pending}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium disabled:opacity-50",
            saved
              ? "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
              : "border-border hover:bg-muted"
          )}
        >
          <Bookmark className={cn("size-3.5", saved && "fill-current")} />
          {saved ? "Unsave" : "Save"}
        </button>
        <button
          onClick={() => onSetStatus("dismissed")}
          disabled={pending}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
        >
          <X className="size-3.5" />
          Dismiss
        </button>
      </div>
    </div>
  );
}

export function ResolvedRow({
  recommendation,
  status,
  impactValue,
  category,
  onRestore,
}: {
  recommendation: string;
  status: ActionStatus;
  impactValue: number;
  category: ActionCategory;
  onRestore: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-3 py-2">
      <div className="flex min-w-0 items-center gap-2">
        {status === "completed" ? (
          <Check className="size-3.5 shrink-0 text-teal-600" />
        ) : (
          <X className="size-3.5 shrink-0 text-muted-foreground" />
        )}
        <span
          className={cn(
            "truncate text-sm",
            status === "completed" ? "text-muted-foreground line-through" : "text-muted-foreground"
          )}
        >
          {recommendation}
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        {status === "completed" && (
          <span className="text-xs font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
            {category === "opportunity" ? "+" : ""}
            {formatCurrency(Math.abs(impactValue))}
          </span>
        )}
        <button
          onClick={onRestore}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <RotateCcw className="size-3" />
          Restore
        </button>
      </div>
    </div>
  );
}
