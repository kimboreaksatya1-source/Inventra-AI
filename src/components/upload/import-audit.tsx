"use client";

import { useState } from "react";
import { AlertTriangle, ChevronDown, CheckCircle2, Layers, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { reasonLabel, statusLabel } from "@/lib/import/audit";
import type { ImportAudit, ImportRowStatus } from "@/lib/types";

function Stat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className={cn("text-lg font-semibold tabular-nums", tone)}>{value.toLocaleString()}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

/** Headline counts — always visible after an upload. Everything adds up. */
export function ImportSummaryBar({ audit }: { audit: ImportAudit }) {
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-lg border border-border bg-muted/40 px-4 py-3">
      <Stat label="uploaded" value={audit.uploadedRows} tone="text-foreground" />
      <span className="text-muted-foreground">→</span>
      <Stat label="imported" value={audit.importedRows} tone="text-teal-600 dark:text-teal-400" />
      {audit.warningRows > 0 && (
        <Stat label="with warnings" value={audit.warningRows} tone="text-amber-600 dark:text-amber-400" />
      )}
      {audit.mergedRows > 0 && (
        <Stat label="merged duplicates" value={audit.mergedRows} tone="text-slate-600 dark:text-slate-300" />
      )}
      {audit.skippedRows > 0 && (
        <Stat label="skipped" value={audit.skippedRows} tone="text-red-600 dark:text-red-400" />
      )}
    </div>
  );
}

const ICON: Record<ImportRowStatus, React.ComponentType<{ className?: string }>> = {
  imported: CheckCircle2,
  warning: AlertTriangle,
  merged: Layers,
  skipped: XCircle,
};

const TONE: Record<ImportRowStatus, string> = {
  imported: "text-teal-600 dark:text-teal-400",
  warning: "text-amber-600 dark:text-amber-400",
  merged: "text-slate-500 dark:text-slate-400",
  skipped: "text-red-600 dark:text-red-400",
};

/** Per-row breakdown of everything that wasn't a clean import. */
export function ImportDetails({ audit, defaultOpen = false }: { audit: ImportAudit; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  if (audit.rows.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        Every one of the {audit.uploadedRows.toLocaleString()} uploaded rows imported cleanly.
      </p>
    );
  }

  return (
    <div className="rounded-lg border border-border">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between px-4 py-2.5 text-sm font-medium hover:bg-muted/50"
      >
        <span>
          Import details — {audit.rows.length.toLocaleString()} row
          {audit.rows.length === 1 ? "" : "s"} need a note
        </span>
        <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <ul className="max-h-80 divide-y divide-border overflow-y-auto border-t border-border">
          {audit.rows.map((r, i) => {
            const Icon = ICON[r.status];
            return (
              <li key={`${r.row}-${i}`} className="flex items-start gap-3 px-4 py-2.5 text-sm">
                <Icon className={cn("mt-0.5 size-4 shrink-0", TONE[r.status])} />
                <div className="min-w-0">
                  <p className="font-medium">
                    Row {r.row}
                    {r.name ? <span className="font-normal text-muted-foreground"> · {r.name}</span> : null}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    <span className={TONE[r.status]}>{statusLabel(r.status)}</span> — {reasonLabel(r.reason)}. {r.detail}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
