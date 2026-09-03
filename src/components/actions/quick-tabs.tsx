"use client";

import { cn } from "@/lib/utils";
import type { ActionView } from "./action-filters";

const TABS: { key: ActionView; label: string }[] = [
  { key: "all", label: "All Actions" },
  { key: "CRITICAL", label: "Critical" },
  { key: "HIGH", label: "High" },
  { key: "MEDIUM", label: "Medium" },
  { key: "completed", label: "Completed" },
];

export function QuickTabs({
  value,
  onChange,
  counts,
}: {
  value: ActionView;
  onChange: (v: ActionView) => void;
  counts: Record<ActionView, number>;
}) {
  return (
    <div
      role="tablist"
      aria-label="Action groups"
      className="flex gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {TABS.map((t) => {
        const active = value === t.key;
        return (
          <button
            key={t.key}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(t.key)}
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
              active
                ? "bg-teal-600 text-white"
                : "bg-muted text-muted-foreground hover:bg-teal-50 hover:text-teal-700 dark:hover:bg-teal-950/40"
            )}
          >
            {t.label}
            <span
              className={cn(
                "rounded-full px-1.5 text-[10px] tabular-nums",
                active ? "bg-white/20 text-white" : "bg-background text-muted-foreground"
              )}
            >
              {counts[t.key] ?? 0}
            </span>
          </button>
        );
      })}
    </div>
  );
}
