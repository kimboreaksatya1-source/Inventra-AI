"use client";

import { VelocityChip } from "@/components/shared/fmcg-chips";
import { PriorityBadge } from "@/components/shared/badges";
import type { Priority, ProcurementRow } from "@/lib/types";

const PRIORITY_MAP: Record<ProcurementRow["priority"], Priority> = {
  Critical: "CRITICAL",
  High: "HIGH",
  Medium: "MEDIUM",
  Low: "LOW",
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm font-semibold tabular-nums">{children}</dd>
    </div>
  );
}

/** Full "Why?" breakdown for one procurement recommendation. */
export function ExplanationPanel({ row }: { row: ProcurementRow }) {
  const e = row.explanation;
  return (
    <div className="rounded-lg border border-border bg-muted/30 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Suggested Quantity
          </span>
          <p className="text-2xl font-bold tabular-nums">
            {e.suggestedQuantity.toLocaleString()}{" "}
            <span className="text-base font-medium text-muted-foreground">units</span>
          </p>
        </div>
        {row.suggestedQuantity > 0 && <PriorityBadge priority={PRIORITY_MAP[row.priority]} />}
      </div>

      <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-teal-700 dark:text-teal-400">
        Why?
      </p>
      <dl className="mt-2 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
        <Field label="Current Stock">{e.currentStock.toLocaleString()}</Field>
        <Field label="Daily Sales">{e.dailySales}</Field>
        <Field label="Days Remaining">{e.daysRemainingLabel}</Field>
        <Field label="Velocity">
          <span className="inline-flex items-center gap-1.5">
            {e.velocityLabel}
            <VelocityChip velocity={e.velocity} />
          </span>
        </Field>
        <Field label="Revenue Impact">{e.revenueImpact}</Field>
        <Field label="Target Coverage">{e.targetCoverageDays} days</Field>
      </dl>

      <div className="mt-4">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          Calculation
        </p>
        <p className="mt-1 rounded-md bg-background px-3 py-2 font-mono text-sm">{e.formula}</p>
        <p className="mt-1 text-[11px] text-muted-foreground">
          (target coverage days × daily sales) − current stock, never below zero
        </p>
      </div>

      <div className="mt-4 space-y-2 text-sm leading-relaxed text-muted-foreground">
        <p>
          <span className="font-medium text-foreground">Explanation. </span>
          {e.reason}
        </p>
        <p>
          <span className="font-medium text-foreground">Priority. </span>
          {e.priorityReason}
        </p>
        <p>
          <span className="font-medium text-foreground">Velocity. </span>
          {e.velocityReason}
        </p>
      </div>
    </div>
  );
}
