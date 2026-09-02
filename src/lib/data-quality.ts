// Inventra AI — feature gating from what the user actually imported.
// Pure. Decides which views can run and which must show "data required"
// instead of a KPI derived from a value we would otherwise have fabricated.

import type { DataQuality } from "./types";

export type GatedFeature = "procurement" | "cashflow" | "risk" | "simulator" | "brief";

export function dataAvailability(
  dq: DataQuality | undefined,
  feature: GatedFeature
): { available: boolean; title: string; description: string } {
  // Unknown quality (e.g. a snapshot from before this field existed) → don't block.
  if (!dq) return { available: true, title: "", description: "" };

  // Every gated feature is sales-derived.
  if (!dq.hasSalesData) {
    return {
      available: false,
      title: "Daily sales data required",
      description:
        "Your import had no daily-sales figures. Inventory analysis and stock levels still work, but this view needs sales data — and Inventra will not estimate it.",
    };
  }
  if (feature === "cashflow" && !dq.hasCostData) {
    return {
      available: false,
      title: "Cost price required",
      description:
        "Your import had no cost prices. Cash-flow analysis depends on them, and Inventra will not assume a margin to fill the gap.",
    };
  }
  return { available: true, title: "", description: "" };
}
