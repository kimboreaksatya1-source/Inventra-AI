import type { ScenarioParams } from "@/lib/types";

/** Human label for a set of scenario params, e.g. "Demand +20%, Reorder 150u". */
export function describeParams(p: ScenarioParams): string {
  const parts: string[] = [];
  if (p.demandGrowthPct !== 0) parts.push(`Demand ${p.demandGrowthPct > 0 ? "+" : ""}${p.demandGrowthPct}%`);
  if (p.salesIncreasePct !== 0) parts.push(`Sales +${p.salesIncreasePct}%`);
  if (p.seasonalMultiplier !== 1) parts.push(`Seasonal ×${p.seasonalMultiplier}`);
  if (p.supplierDelayDays !== 0) parts.push(`Delay ${p.supplierDelayDays}d`);
  if (p.reorderQuantity !== 0) parts.push(`Reorder ${p.reorderQuantity}u`);
  return parts.join(", ");
}
