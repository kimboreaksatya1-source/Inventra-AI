"use client";

import { Lightbulb } from "lucide-react";
import type { SimulationRecommendedAction } from "@/lib/types";

export function RecommendedAction({
  action,
  onApplyReorder,
}: {
  action: SimulationRecommendedAction;
  onApplyReorder?: (qty: number) => void;
}) {
  return (
    <div className="rounded-xl border border-teal-200 bg-teal-50/60 p-5 dark:border-teal-900 dark:bg-teal-950/30">
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-teal-600 text-white">
          <Lightbulb className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-wide text-teal-700 dark:text-teal-300">
            Recommended Action
          </p>
          <p className="mt-0.5 font-semibold">{action.headline}</p>
          <p className="mt-1 text-sm text-muted-foreground">{action.detail}</p>
          {onApplyReorder && action.suggestedReorderQuantity > 0 && (
            <button
              onClick={() => onApplyReorder(action.suggestedReorderQuantity)}
              className="mt-2.5 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-teal-700"
            >
              Apply {action.suggestedReorderQuantity} units to the simulation
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
