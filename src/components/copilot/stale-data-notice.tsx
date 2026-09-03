"use client";

import { useState } from "react";
import { AlertTriangle, X } from "lucide-react";

/**
 * Interim safeguard: shown above the composer when the open conversation was
 * started before the user's most recent inventory import. It warns (it does not
 * block) — the full dataset-lifecycle feature adds hard isolation.
 */
export function StaleDataNotice({
  sessionId,
  onStartFresh,
}: {
  sessionId: string;
  onStartFresh: () => void;
}) {
  const [dismissed, setDismissed] = useState<string | null>(null);
  if (dismissed === sessionId) return null;

  return (
    <div className="px-4">
      <div className="mx-auto mb-2 flex max-w-4xl items-start gap-2.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
        <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
        <p className="flex-1">
          This conversation started before your latest inventory import. New answers here reflect
          your <strong>current</strong> data, not the data in the messages above.{" "}
          <button
            type="button"
            onClick={onStartFresh}
            className="font-semibold underline underline-offset-2 hover:no-underline"
          >
            Start a fresh analysis
          </button>
          .
        </p>
        <button
          type="button"
          aria-label="Dismiss"
          onClick={() => setDismissed(sessionId)}
          className="shrink-0 rounded p-0.5 hover:bg-amber-100 dark:hover:bg-amber-900/40"
        >
          <X className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
