"use client";

import { Check, GitCompare, Play, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { cn } from "@/lib/utils";
import { formatCurrency, relativeTime } from "@/lib/format";
import { useDeleteScenario, useScenarios } from "@/lib/queries/simulator";
import { describeParams } from "./describe-params";
import type { SavedScenario } from "@/lib/types";

export function ScenarioList({
  selectedIds,
  onToggleSelect,
  onLoad,
  onCompare,
}: {
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  onLoad: (s: SavedScenario) => void;
  onCompare: () => void;
}) {
  const { data: scenarios, isLoading } = useScenarios();
  const del = useDeleteScenario();

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-20 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
    );
  }

  if (!scenarios || scenarios.length === 0) {
    return (
      <EmptyState
        icon={GitCompare}
        tone="teal"
        title="No saved scenarios yet"
        description="Model a what-if on the Simulate tab and hit “Save scenario” to keep it here."
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {selectedIds.length} selected {selectedIds.length > 3 && "(max 3 compared)"}
        </p>
        <Button size="sm" onClick={onCompare} disabled={selectedIds.length < 2}>
          <GitCompare className="size-4" />
          Compare {selectedIds.length >= 2 ? `(${Math.min(selectedIds.length, 3)})` : ""}
        </Button>
      </div>

      <ul className="space-y-2">
        {scenarios.map((s) => {
          const selected = selectedIds.includes(s.id);
          const rev = s.result?.deltas?.revenueImpact ?? 0;
          return (
            <li key={s.id}>
              <Card className={cn("flex-row items-center gap-3 p-4", selected && "ring-1 ring-teal-500")}>
                <Checkbox
                  checked={selected}
                  onCheckedChange={() => onToggleSelect(s.id)}
                  aria-label={`Select ${s.name}`}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{s.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {describeParams(s.params) || "Baseline"} · {relativeTime(s.createdAt)}
                  </p>
                </div>
                <span
                  className={cn(
                    "shrink-0 text-sm font-semibold tabular-nums",
                    rev > 0 ? "text-emerald-600 dark:text-emerald-400" : rev < 0 ? "text-red-600 dark:text-red-400" : "text-muted-foreground"
                  )}
                >
                  {rev > 0 ? "+" : rev < 0 ? "−" : ""}
                  {formatCurrency(Math.abs(rev))}
                </span>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    onClick={() => onLoad(s)}
                    className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-teal-600"
                    aria-label="Load scenario"
                  >
                    <Play className="size-4" />
                  </button>
                  <button
                    onClick={() => del.mutate(s.id)}
                    className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-red-600"
                    aria-label="Delete scenario"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </Card>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
