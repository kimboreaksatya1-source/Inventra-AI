"use client";

import { AlertTriangle, GaugeCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { EvidenceConfidence, ForecastEvidence } from "@/lib/types";

const CONF_CLS: Record<EvidenceConfidence, string> = {
  High: "bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300",
  Medium: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  Low: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300",
};

/** Trust context for one recommendation: confidence, sensitivity, assumptions, invalidation. */
export function ForecastReliability({
  fe,
  recommended,
}: {
  fe: ForecastEvidence;
  /** the recommendation's headline number, shown alongside the sensitivity band */
  recommended?: number;
}) {
  return (
    <div className="mt-3 rounded-lg border border-border bg-background p-3 text-xs">
      <p className="flex items-center gap-1.5 font-semibold uppercase tracking-wide text-muted-foreground">
        <GaugeCircle className="size-3.5" />
        Forecast reliability
      </p>

      <p className="mt-2">
        <span className="font-medium text-foreground">Confidence </span>
        <span className={cn("rounded px-1 py-0.5 font-medium", CONF_CLS[fe.confidence])}>{fe.confidence}</span>
      </p>
      <p className="mt-1 text-muted-foreground">{fe.confidenceReason}</p>
      {fe.salesStability && fe.salesStability.band !== "unknown" && (
        <p className="mt-0.5 text-muted-foreground">{fe.salesStability.note}</p>
      )}

      {fe.sensitivity.length > 0 && (
        <div className="mt-2.5">
          <p className="font-medium text-foreground">Sensitivity to demand</p>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 tabular-nums">
            {recommended !== undefined && (
              <span>
                As recommended: <span className="font-semibold">{recommended.toLocaleString()}</span> units
              </span>
            )}
            {fe.sensitivity.map((s) => (
              <span key={s.factorLabel} className="text-muted-foreground">
                {s.factorLabel} → <span className="font-semibold text-foreground">{s.suggestedQuantity.toLocaleString()}</span>
              </span>
            ))}
          </div>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Same formula at ±20% daily sales — shown for robustness, not a change to the recommendation.
          </p>
        </div>
      )}

      <div className="mt-2.5">
        <p className="font-medium text-foreground">Assumptions</p>
        <ul className="mt-0.5 list-disc pl-4 text-muted-foreground">
          {fe.assumptions.map((a) => (
            <li key={a}>{a}</li>
          ))}
        </ul>
      </div>

      <div className="mt-2.5">
        <p className="flex items-center gap-1 font-medium text-amber-700 dark:text-amber-300">
          <AlertTriangle className="size-3" />
          Could be wrong if
        </p>
        <ul className="mt-0.5 list-disc pl-4 text-muted-foreground">
          {fe.reliabilityFactors.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
