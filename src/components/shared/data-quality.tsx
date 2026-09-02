"use client";

import Link from "next/link";
import { AlertTriangle, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { dataAvailability, type GatedFeature } from "@/lib/data-quality";
import type { DataQuality } from "@/lib/types";

export { dataAvailability, type GatedFeature };

/** Full-page "import the missing column" state. */
export function DataRequiredState({
  dq,
  feature,
}: {
  dq: DataQuality | undefined;
  feature: GatedFeature;
}) {
  const { title, description } = dataAvailability(dq, feature);
  return (
    <EmptyState
      icon={Info}
      tone="teal"
      title={title || "Data required"}
      description={description}
      action={
        <Button asChild>
          <Link href="/upload">Import more data</Link>
        </Button>
      }
    />
  );
}

/**
 * Non-blocking amber strip for partial gaps — e.g. sales present but some
 * products have no cost price, so value/margin figures exclude them.
 */
export function DataQualityBanner({ dq }: { dq: DataQuality | undefined }) {
  if (!dq) return null;
  const notes: string[] = [];
  if (!dq.hasCostData && dq.totalProducts > 0) {
    notes.push(
      "No cost prices were imported. Inventory value, margins and purchase cost show as “n/a” — Inventra does not assume a margin. Import a cost-price column to see these figures."
    );
  } else if (dq.productsMissingCost > 0) {
    notes.push(
      `${dq.productsMissingCost} of ${dq.totalProducts} products have no cost price — their inventory value, margin and purchase cost are shown as “n/a”, never an estimated margin.`
    );
  }
  if (notes.length === 0) return null;
  return (
    <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
      <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
      <div className="space-y-0.5">
        {notes.map((n) => (
          <p key={n}>{n}</p>
        ))}
      </div>
    </div>
  );
}
