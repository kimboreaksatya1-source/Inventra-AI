"use client";

import { cn } from "@/lib/utils";
import { Sparkles, CheckCircle2, BellOff, Inbox } from "lucide-react";

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  tone = "neutral",
  className,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: React.ReactNode;
  tone?: "neutral" | "success" | "teal";
  className?: string;
}) {
  const toneCfg = {
    neutral: "bg-slate-50 text-slate-400 dark:bg-slate-800/60 dark:text-slate-500",
    success: "bg-emerald-50 text-emerald-500 dark:bg-emerald-950/40 dark:text-emerald-400",
    teal: "bg-teal-50 text-teal-500 dark:bg-teal-950/40 dark:text-teal-400",
  }[tone];
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 dark:border-slate-700 px-6 py-12 text-center",
        className
      )}
    >
      <div className={cn("flex size-14 items-center justify-center rounded-2xl mb-4", toneCfg)}>
        <Icon className="size-7" strokeWidth={1.5} />
      </div>
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-muted-foreground text-balance">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function NoRiskEmptyState() {
  return (
    <EmptyState
      icon={CheckCircle2}
      tone="success"
      title="No revenue risks detected."
      description="Your inventory decisions are on track. No urgent action required today."
    />
  );
}

export function NoAlertsEmptyState() {
  return (
    <EmptyState
      icon={BellOff}
      tone="success"
      title="You're all caught up."
      description="There are no active alerts. We'll notify you the moment something needs attention."
    />
  );
}

export function SparkleEmptyState() {
  return (
    <EmptyState
      icon={Sparkles}
      tone="teal"
      title="AI insights are loading."
      description="We're crunching your sales data to surface revenue opportunities."
    />
  );
}
