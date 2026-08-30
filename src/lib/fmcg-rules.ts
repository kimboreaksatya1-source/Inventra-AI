// Inventra AI — FMCG business rules: velocity classification + contextual recommendations.
// Pure. Layered on top of the base analysis (analysis.ts).

export type ProductVelocity = "Fast" | "Medium" | "Slow" | "None";
export type ProductRecommendation = "Reorder" | "Reduce" | "Monitor" | "Opportunity";
export type RevenueImpact = "High" | "Medium" | "Low";
export type UrgencyLevel = "Critical" | "High" | "Medium" | "Low";

/** FMCG replenishment lead time (days). */
export const LEAD_TIME_DAYS = 7;

interface VProduct {
  id: string;
  dailySales: number;
}

/** Classify every product Fast / Medium / Slow, relative to this catalog + absolute backstops. */
export function classifyVelocities<T extends VProduct>(products: T[]): Map<string, ProductVelocity> {
  const out = new Map<string, ProductVelocity>();
  const active = products.filter((p) => p.dailySales > 0);
  if (active.length === 0) {
    for (const p of products) out.set(p.id, "None");
    return out;
  }

  const sorted = [...active].sort((a, b) => a.dailySales - b.dailySales);
  const rankOf = new Map(sorted.map((p, i) => [p.id, i]));
  const n = sorted.length;

  for (const p of products) {
    if (p.dailySales <= 0) {
      out.set(p.id, "None");
      continue;
    }
    if (p.dailySales >= 5) {
      out.set(p.id, "Fast");
      continue;
    }
    if (p.dailySales < 0.3) {
      out.set(p.id, "Slow");
      continue;
    }
    const pct = n <= 1 ? 1 : (rankOf.get(p.id)! + 1) / n;
    out.set(p.id, pct >= 0.7 ? "Fast" : pct >= 0.35 ? "Medium" : "Slow");
  }
  return out;
}

export function overstockThresholdDays(v: ProductVelocity): number {
  switch (v) {
    case "Fast":
      return 21;
    case "Medium":
      return 45;
    case "Slow":
      return 90;
    default:
      return Infinity;
  }
}

interface RiskProduct {
  daysRemaining: number; // Infinity allowed
  dailySales: number;
  stock: number;
}

export function overstockRisk(p: RiskProduct, v: ProductVelocity): RevenueImpact {
  if (p.dailySales <= 0 && p.stock > 0) return "High"; // dead stock
  const t = overstockThresholdDays(v);
  if (!Number.isFinite(p.daysRemaining) || !Number.isFinite(t)) return "Low";
  if (p.daysRemaining > t * 1.6) return "High";
  if (p.daysRemaining > t) return "Medium";
  return "Low";
}

interface ImpactProduct {
  dailySales: number;
  sellingPrice: number;
}

export function weeklyRevenueOf(p: ImpactProduct): number {
  return Math.round(p.dailySales * 7 * p.sellingPrice * 100) / 100;
}

/**
 * Revenue-impact tier: share of total weekly revenue, or membership in the top-5 sellers.
 */
export function revenueImpactTier(
  weeklyRevenue: number,
  totalWeeklyRevenue: number,
  isTop5: boolean
): RevenueImpact {
  if (isTop5) return "High";
  const share = totalWeeklyRevenue > 0 ? weeklyRevenue / totalWeeklyRevenue : 0;
  if (share >= 0.08) return "High";
  if (share >= 0.025) return "Medium";
  return "Low";
}

const VEL_URGENCY: Record<ProductVelocity, number> = { Fast: 15, Medium: 6, Slow: 0, None: 0 };
const IMPACT_URGENCY: Record<RevenueImpact, number> = { High: 15, Medium: 7, Low: 0 };

export function reorderUrgency(
  p: RiskProduct,
  v: ProductVelocity,
  impact: RevenueImpact
): { score: number; level: UrgencyLevel } {
  if (p.dailySales <= 0) return { score: 0, level: "Low" };
  const window = LEAD_TIME_DAYS * 2;
  const cover = Number.isFinite(p.daysRemaining) ? p.daysRemaining : window * 2;
  let score = ((window - cover) / window) * 100;
  score += VEL_URGENCY[v] + IMPACT_URGENCY[impact];
  score = Math.max(0, Math.min(100, Math.round(score)));
  const level: UrgencyLevel =
    score >= 75 ? "Critical" : score >= 50 ? "High" : score >= 25 ? "Medium" : "Low";
  return { score, level };
}

interface RecProduct extends RiskProduct {
  unitMargin: number;
  inventoryValue: number;
}

/** One contextual recommendation per product. First match wins. */
export function recommendationFor(
  p: RecProduct,
  v: ProductVelocity,
  overstock: RevenueImpact,
  urgencyScore: number,
  impact: RevenueImpact,
  inventoryValueTopQuartile: number
): ProductRecommendation {
  if (p.dailySales > 0 && urgencyScore >= 50) return "Reorder";
  if (overstock !== "Low") return "Reduce";
  // slow mover genuinely sitting on cash (expensive AND weeks of cover it doesn't need)
  const t = overstockThresholdDays(v);
  const sittingOnStock = Number.isFinite(t) && p.daysRemaining > t * 0.6;
  if (
    (v === "Slow" || v === "None") &&
    p.inventoryValue >= inventoryValueTopQuartile &&
    p.inventoryValue > 0 &&
    sittingOnStock
  ) {
    return "Reduce";
  }
  if (
    v === "Fast" &&
    impact === "High" &&
    overstock === "Low" &&
    urgencyScore < 50 &&
    p.unitMargin > 0
  ) {
    return "Opportunity";
  }
  return "Monitor";
}

/** p-th percentile of a numeric array (0..1). */
export function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const s = [...values].sort((a, b) => a - b);
  const idx = Math.min(s.length - 1, Math.max(0, Math.floor(p * (s.length - 1))));
  return s[idx];
}
