"use client";

import { useState } from "react";
import { ChevronDown, PackageCheck } from "lucide-react";
import { ConfidenceMeter } from "@/components/shared/badges";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format";
import { t } from "@/lib/i18n";
import type { CopilotLanguage, CopilotReorderItem, EvidenceConfidence } from "@/lib/types";

const CONF_CLS: Record<EvidenceConfidence, string> = {
  High: "bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300",
  Medium: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  Low: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300",
};

export function ReorderRecommendations({
  items,
  language,
}: {
  items: CopilotReorderItem[];
  language: CopilotLanguage;
}) {
  if (!items.length) return null;
  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex items-center gap-2 border-b border-border bg-muted/40 px-4 py-2.5">
        <PackageCheck className="size-4 text-teal-600" />
        <p className="text-sm font-semibold">{t(language, "reorder.title")}</p>
      </div>
      <ul className="divide-y divide-border">
        {items.map((r, i) => (
          <ReorderRow key={`${r.product}-${i}`} item={r} index={i} language={language} />
        ))}
      </ul>
    </div>
  );
}

function ReorderRow({
  item: r,
  index: i,
  language,
}: {
  item: CopilotReorderItem;
  index: number;
  language: CopilotLanguage;
}) {
  const [open, setOpen] = useState(false);
  const hasEvidence = (r.evidence?.length ?? 0) > 0 || !!r.rule || !!r.formula;
  return (
    <li className="p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="font-medium">
          {i + 1}. {r.product}
        </p>
        <span className="shrink-0 text-sm font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
          +{formatCurrency(r.revenueProtection)}
        </span>
      </div>
      {r.reason && <p className="mt-1 text-sm text-muted-foreground">{r.reason}</p>}
      <div className="mt-2.5 grid grid-cols-2 gap-x-4 gap-y-2 text-xs sm:grid-cols-3">
        <Field label={t(language, "reorder.qty")} value={`${r.suggestedQuantity}`} />
        <Field label={t(language, "reorder.protection")} value={formatCurrency(r.revenueProtection)} />
        <div>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
            {t(language, "reorder.confidence")}
          </p>
          <div className="mt-1 flex items-center gap-1.5">
            <ConfidenceMeter value={Math.round(r.confidence)} size="sm" />
            {r.confidenceLabel && (
              <span className={cn("rounded px-1 py-0.5 text-[10px] font-medium", CONF_CLS[r.confidenceLabel])}>
                {r.confidenceLabel}
              </span>
            )}
          </div>
        </div>
      </div>
      {hasEvidence && (
        <>
          <button
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-teal-700 hover:text-teal-900 dark:text-teal-400"
          >
            <ChevronDown className={cn("size-3 transition-transform", open && "rotate-180")} />
            {open ? "Hide evidence" : "What supports this?"}
          </button>
          {open && (
            <div className="mt-1.5 space-y-1 rounded-md bg-muted/50 p-2.5 text-[11px] text-muted-foreground">
              {r.evidence && r.evidence.length > 0 && (
                <div>
                  <span className="font-semibold text-foreground">DATA</span>
                  <ul className="mt-0.5 list-disc pl-4">
                    {r.evidence.map((d) => (
                      <li key={d}>{d}</li>
                    ))}
                  </ul>
                </div>
              )}
              {r.rule && (
                <p>
                  <span className="font-semibold text-foreground">RULE</span> — {r.rule}
                </p>
              )}
              {r.formula && (
                <p className="font-mono text-foreground">{r.formula}</p>
              )}
            </div>
          )}
        </>
      )}
    </li>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-semibold tabular-nums">{value}</p>
    </div>
  );
}
