"use client";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, ArrowDownRight, ArrowUpRight, ShieldCheck } from "lucide-react";
import type { Priority } from "@/lib/types";

export const priorityConfig: Record<
  Priority,
  { label: string; className: string; dot: string }
> = {
  CRITICAL: {
    label: "Critical",
    className:
      "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900",
    dot: "bg-red-500",
  },
  HIGH: {
    label: "High",
    className:
      "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900",
    dot: "bg-amber-500",
  },
  MEDIUM: {
    label: "Medium",
    className:
      "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-900",
    dot: "bg-teal-500",
  },
  LOW: {
    label: "Low",
    className:
      "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800/60 dark:text-slate-300 dark:border-slate-700",
    dot: "bg-slate-400",
  },
};

export function PriorityBadge({
  priority,
  className,
}: {
  priority: Priority;
  className?: string;
}) {
  const cfg = priorityConfig[priority];
  return (
    <Badge
      variant="outline"
      className={cn("gap-1.5 font-medium", cfg.className, className)}
    >
      <span className={cn("size-1.5 rounded-full", cfg.dot)} />
      {cfg.label}
    </Badge>
  );
}

const statusConfig: Record<
  string,
  { label: string; dot: string; text: string }
> = {
  healthy: { label: "Healthy", dot: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400" },
  warning: { label: "Low stock", dot: "bg-amber-500", text: "text-amber-600 dark:text-amber-400" },
  critical: { label: "Critical", dot: "bg-red-500", text: "text-red-600 dark:text-red-400" },
  overstock: { label: "Overstock", dot: "bg-sky-500", text: "text-sky-600 dark:text-sky-400" },
};

export function StatusDot({ status, showLabel }: { status: string; showLabel?: boolean }) {
  const cfg = statusConfig[status] ?? statusConfig.healthy;
  return (
    <span className="inline-flex items-center gap-2 text-xs font-medium">
      <span className={cn("size-2 rounded-full", cfg.dot)} />
      {showLabel && <span className={cfg.text}>{cfg.label}</span>}
    </span>
  );
}

export function ConfidenceMeter({
  value,
  size = "md",
  showLabel = true,
}: {
  value: number;
  size?: "sm" | "md";
  showLabel?: boolean;
}) {
  const tone =
    value >= 80
      ? "text-emerald-600 dark:text-emerald-400"
      : value >= 60
      ? "text-amber-600 dark:text-amber-400"
      : "text-red-600 dark:text-red-400";
  const bar =
    value >= 80 ? "bg-emerald-500" : value >= 60 ? "bg-amber-500" : "bg-red-500";
  const h = size === "sm" ? "h-1.5" : "h-2";
  return (
    <div className="flex items-center gap-2 min-w-0">
      <div className={cn("w-full rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden", h)}>
        <div
          className={cn("h-full rounded-full transition-all", bar)}
          style={{ width: `${value}%` }}
        />
      </div>
      {showLabel && (
        <span className={cn("text-xs font-semibold tabular-nums whitespace-nowrap", tone)}>
          {value}%
        </span>
      )}
    </div>
  );
}

export function TrendPill({ value, suffix = "%" }: { value: number; suffix?: string }) {
  const up = value >= 0;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  const tone = up
    ? "text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/40"
    : "text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-950/40";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-xs font-semibold",
        tone
      )}
    >
      <Icon className="size-3" />
      {up ? "+" : ""}
      {value}
      {suffix}
    </span>
  );
}

export function RevenueImpact({
  value,
  tone = "danger",
  prefix = "-",
}: {
  value: number;
  tone?: "danger" | "success" | "warning" | "neutral";
  prefix?: string;
}) {
  const cfg = {
    danger: "text-red-600 dark:text-red-400",
    success: "text-emerald-600 dark:text-emerald-400",
    warning: "text-amber-600 dark:text-amber-400",
    neutral: "text-foreground",
  }[tone];
  const icon =
    tone === "success" ? (
      <ShieldCheck className="size-3.5" />
    ) : tone === "danger" ? (
      <AlertTriangle className="size-3.5" />
    ) : null;
  return (
    <span className={cn("inline-flex items-center gap-1 font-semibold tabular-nums", cfg)}>
      {icon}
      {prefix}
      {new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      }).format(value)}
    </span>
  );
}
