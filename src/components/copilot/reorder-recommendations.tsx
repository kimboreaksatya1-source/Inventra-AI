"use client";

import { PackageCheck } from "lucide-react";
import { ConfidenceMeter } from "@/components/shared/badges";
import { formatCurrency } from "@/lib/format";
import { t } from "@/lib/i18n";
import type { CopilotLanguage, CopilotReorderItem } from "@/lib/types";

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
          <li key={`${r.product}-${i}`} className="p-4">
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
                <div className="mt-1">
                  <ConfidenceMeter value={Math.round(r.confidence)} size="sm" />
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
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
