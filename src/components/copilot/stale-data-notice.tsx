"use client";

import { Archive } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Shown above the composer when the open conversation is bound to an older
 * inventory dataset. The conversation is read-only — the chat API refuses new
 * messages (409 STALE_DATASET) so its answers can never mix with current data.
 */
export function StaleDataNotice({
  datasetName,
  onStartFresh,
  pending,
}: {
  datasetName: string | null;
  onStartFresh: () => void;
  pending?: boolean;
}) {
  return (
    <div className="px-4">
      <div className="mx-auto mb-2 flex max-w-4xl flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2.5 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
        <Archive className="size-4 shrink-0" />
        <p className="min-w-48 flex-1">
          Read-only — this conversation is based on{" "}
          <strong>{datasetName ?? "an earlier inventory"}</strong>. Your catalog has changed since.
        </p>
        <Button size="sm" onClick={onStartFresh} disabled={pending} className="shrink-0">
          Start a new analysis
        </Button>
      </div>
    </div>
  );
}
