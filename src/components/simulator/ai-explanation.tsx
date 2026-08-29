"use client";

import { RefreshCw, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Markdown } from "@/components/copilot/markdown";
import { cn } from "@/lib/utils";
import type { SimulationExplanation } from "@/lib/types";

export function AiExplanation({
  data,
  isFetching,
  isError,
  onRegenerate,
  idle,
}: {
  data?: SimulationExplanation;
  isFetching: boolean;
  isError: boolean;
  onRegenerate: () => void;
  idle: boolean;
}) {
  return (
    <Card className="gap-3 p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-teal-600" />
          <h3 className="text-sm font-semibold">AI Explanation</h3>
          {data?.source === "deterministic" && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
              offline analysis
            </span>
          )}
        </div>
        <button
          onClick={onRegenerate}
          disabled={isFetching || idle}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-40"
        >
          <RefreshCw className={cn("size-3", isFetching && "animate-spin")} />
          Regenerate
        </button>
      </div>

      {idle && !data && (
        <p className="text-sm text-muted-foreground">
          Adjust a slider and Inventra will explain what the scenario means for your business.
        </p>
      )}

      {isFetching && !data && (
        <div className="space-y-2">
          <div className="h-3 w-11/12 animate-pulse rounded bg-muted" />
          <div className="h-3 w-full animate-pulse rounded bg-muted" />
          <div className="h-3 w-4/5 animate-pulse rounded bg-muted" />
        </div>
      )}

      {isError && !data && (
        <p className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t generate an explanation. Try Regenerate.
        </p>
      )}

      {data && (
        <div className={cn(isFetching && "opacity-60")}>
          <Markdown>{data.explanation}</Markdown>
        </div>
      )}
    </Card>
  );
}
