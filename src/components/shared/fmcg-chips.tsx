"use client";

import { ArrowDownCircle, Eye, RefreshCw, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProductRecommendation, ProductVelocity } from "@/lib/types";

const VELOCITY: Record<ProductVelocity, { label: string; cls: string }> = {
  Fast: { label: "Fast", cls: "bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300" },
  Medium: { label: "Medium", cls: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300" },
  Slow: { label: "Slow", cls: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300" },
  None: { label: "No sales", cls: "bg-muted text-muted-foreground" },
};

export function VelocityChip({ velocity, className }: { velocity: ProductVelocity; className?: string }) {
  const v = VELOCITY[velocity];
  return (
    <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-medium", v.cls, className)}>
      {v.label}
    </span>
  );
}

const REC: Record<
  ProductRecommendation,
  { label: string; cls: string; icon: React.ComponentType<{ className?: string }> }
> = {
  Reorder: {
    label: "Reorder",
    cls: "border-teal-300 bg-teal-50 text-teal-700 dark:border-teal-800 dark:bg-teal-950/40 dark:text-teal-300",
    icon: RefreshCw,
  },
  Reduce: {
    label: "Reduce stock",
    cls: "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
    icon: ArrowDownCircle,
  },
  Opportunity: {
    label: "Opportunity",
    cls: "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
    icon: Sparkles,
  },
  Monitor: {
    label: "Monitor",
    cls: "border-border bg-muted text-muted-foreground",
    icon: Eye,
  },
};

export function RecommendationChip({
  recommendation,
  className,
}: {
  recommendation: ProductRecommendation;
  className?: string;
}) {
  const r = REC[recommendation];
  const Icon = r.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-medium",
        r.cls,
        className
      )}
    >
      <Icon className="size-3" />
      {r.label}
    </span>
  );
}
