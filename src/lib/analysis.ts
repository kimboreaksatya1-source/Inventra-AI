// Inventra AI — Inventory Analysis Engine (Feature 2) + FMCG knowledge layer.
// Pure, server-side. Reads Product.dailySales directly; layers velocity + rules on top.

import {
  LEAD_TIME_DAYS,
  classifyVelocities,
  overstockRisk,
  percentile,
  recommendationFor,
  reorderUrgency,
  revenueImpactTier,
  weeklyRevenueOf,
} from "./fmcg-rules";
import type {
  AnalysisSummary,
  CategoryRollup,
  DataQuality,
  InventoryAnalysis,
  ProductAnalysis,
  RiskLevel,
} from "./types";

export interface AnalysisInput {
  id: string;
  name: string; // originalName
  canonicalName?: string | null;
  category: string;
  stock: number;
  dailySales: number;
  sellingPrice: number;
  costPrice: number;
  brand?: string | null;
  sku?: string | null;
}

const RISK_HORIZON_DAYS = 30;

/**
 * What the user actually gave us. Detected from the values, never assumed.
 * A whole catalog with zero sales / zero cost means the column wasn't provided —
 * we surface that and let the UI disable the affected features rather than
 * inventing numbers to fill the gap.
 */
export function detectDataQuality(
  products: { dailySales: number; costPrice: number }[]
): DataQuality {
  return {
    hasSalesData: products.some((p) => p.dailySales > 0),
    hasCostData: products.some((p) => p.costPrice > 0),
    productsWithoutSales: products.filter((p) => !(p.dailySales > 0)).length,
    productsMissingCost: products.filter((p) => !(p.costPrice > 0)).length,
    totalProducts: products.length,
  };
}

export function daysRemaining(stock: number, dailySales: number): number {
  return dailySales > 0 ? stock / dailySales : Infinity;
}

export function riskLevelFor(days: number, dailySales: number): RiskLevel {
  if (dailySales <= 0) return "None";
  if (days < 3) return "Critical";
  if (days < 7) return "High";
  if (days < 14) return "Medium";
  return "Low";
}

/** Base per-product metrics — no cross-catalog context yet. */
type BaseAnalysis = Omit<
  ProductAnalysis,
  | "velocity"
  | "weeklyRevenue"
  | "revenueImpact"
  | "overstockRisk"
  | "reorderUrgency"
  | "reorderUrgencyLevel"
  | "recommendation"
>;

export function analyzeProduct(p: AnalysisInput): BaseAnalysis {
  const days = daysRemaining(p.stock, p.dailySales);
  const daysUntilStockout = Number.isFinite(days) ? Math.min(days, RISK_HORIZON_DAYS) : 0;
  const riskLevel = riskLevelFor(days, p.dailySales);
  const estimatedRevenueAtRisk =
    Math.round(daysUntilStockout * p.dailySales * p.sellingPrice * 100) / 100;

  return {
    id: p.id,
    name: p.name,
    canonicalName: p.canonicalName ?? null,
    brand: p.brand ?? null,
    sku: p.sku ?? null,
    category: p.category,
    stock: p.stock,
    dailySales: p.dailySales,
    sellingPrice: p.sellingPrice,
    costPrice: p.costPrice,
    unitMargin: Math.round((p.sellingPrice - p.costPrice) * 100) / 100,
    daysRemaining: days,
    daysUntilStockout: Math.round(daysUntilStockout * 10) / 10,
    riskLevel,
    estimatedRevenueAtRisk,
    inventoryValue: Math.round(p.stock * p.costPrice * 100) / 100,
  };
}

/** Inventory health score 0-100 = weighted blend of three sub-scores. */
export function computeHealthScore(products: ProductAnalysis[]): {
  score: number;
  breakdown: { stockoutRisk: number; inventoryBalance: number; productHealth: number };
} {
  if (products.length === 0) {
    return { score: 0, breakdown: { stockoutRisk: 0, inventoryBalance: 0, productHealth: 0 } };
  }
  const n = products.length;
  const active = products.filter((p) => p.dailySales > 0);

  // 1. Stockout risk (40%). Only *selling* products can be at stockout risk, so
  // the penalty is a share of the active catalog — a long tail of zero-sales SKUs
  // must not dilute a real "half your movers are about to run out" signal.
  const activeCount = Math.max(1, active.length);
  const critical = active.filter((p) => p.riskLevel === "Critical").length;
  const high = active.filter((p) => p.riskLevel === "High").length;
  const medium = active.filter((p) => p.riskLevel === "Medium").length;
  const riskPenalty = (critical * 1 + high * 0.55 + medium * 0.2) / activeCount;
  const stockoutRisk = clamp(100 - riskPenalty * 130);

  // 2. Inventory balance (30%) — velocity-aware overstock, not a fixed day count.
  const overstock = products.filter((p) => p.overstockRisk !== "Low").length;
  const deadStock = products.filter((p) => p.dailySales === 0 && p.stock > 0).length;
  const balancePenalty = (overstock * 0.55 + deadStock * 0.45) / n;
  const inventoryBalance = clamp(100 - balancePenalty * 120);

  // 3. Product health (30%)
  const healthy = products.filter(
    (p) => p.riskLevel !== "Critical" && p.riskLevel !== "High" && p.unitMargin > 0
  ).length;
  const productHealth = clamp((healthy / n) * 100);

  const score = Math.round(stockoutRisk * 0.4 + inventoryBalance * 0.3 + productHealth * 0.3);
  return {
    score: clamp(score),
    breakdown: {
      stockoutRisk: Math.round(stockoutRisk),
      inventoryBalance: Math.round(inventoryBalance),
      productHealth: Math.round(productHealth),
    },
  };
}

function clamp(n: number): number {
  return Math.max(0, Math.min(100, n));
}

export function healthLabel(score: number): string {
  if (score >= 85) return "Strong";
  if (score >= 70) return "Stable";
  if (score >= 55) return "Needs Attention";
  if (score > 0) return "At Risk";
  return "No Data";
}

function buildExplanation(
  summary: Omit<AnalysisSummary, "explanation">,
  score: number
): string {
  if (summary.totalProducts === 0) {
    return "Import your product data to generate an inventory health score.";
  }
  const parts: string[] = [];
  if (summary.criticalCount > 0) {
    parts.push(
      `${summary.criticalCount} product${summary.criticalCount > 1 ? "s are" : " is"} projected to stock out within 3 days`
    );
  }
  if (summary.atRiskWithinWeek > summary.criticalCount) {
    parts.push(`${summary.atRiskWithinWeek} will run out within a week if demand holds`);
  }
  if (parts.length === 0) parts.push("no products are at immediate risk of stocking out");
  const balance =
    summary.reduceCount > 0
      ? ` ${summary.reduceCount} slow-moving or overstocked line${summary.reduceCount > 1 ? "s are" : " is"} tying up cash.`
      : "";
  const money =
    summary.totalRevenueAtRisk > 0
      ? ` Roughly $${Math.round(summary.totalRevenueAtRisk).toLocaleString()} of revenue is exposed over the next 30 days.`
      : "";
  const verdict =
    score >= 70
      ? "Overall your inventory is in good shape."
      : score >= 55
      ? "Your inventory needs attention in a few places."
      : "Your inventory is carrying meaningful risk right now.";
  return `${verdict} ${capitalize(parts.join("; "))}.${balance}${money}`;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function analyzeInventory(
  products: AnalysisInput[],
  business = "Your Business"
): InventoryAnalysis {
  const base = products.map(analyzeProduct);

  /* --- FMCG layer --- */
  const velocities = classifyVelocities(base);
  const weekly = new Map(base.map((p) => [p.id, weeklyRevenueOf(p)]));
  const totalWeekly = [...weekly.values()].reduce((s, v) => s + v, 0);
  const top5 = new Set(
    [...base].sort((a, b) => weekly.get(b.id)! - weekly.get(a.id)!).slice(0, 5).map((p) => p.id)
  );
  const invValueQ3 = percentile(
    base.map((p) => p.inventoryValue),
    0.75
  );

  const analyzed: ProductAnalysis[] = base.map((p) => {
    const velocity = velocities.get(p.id) ?? "None";
    const weeklyRevenue = weekly.get(p.id) ?? 0;
    const revenueImpact = revenueImpactTier(weeklyRevenue, totalWeekly, top5.has(p.id));
    const ovr = overstockRisk(p, velocity);
    const { score: reorderUrg, level: reorderUrgencyLevel } = reorderUrgency(
      p,
      velocity,
      revenueImpact
    );
    const recommendation = recommendationFor(
      p,
      velocity,
      ovr,
      reorderUrg,
      revenueImpact,
      invValueQ3
    );
    return {
      ...p,
      velocity,
      weeklyRevenue,
      revenueImpact,
      overstockRisk: ovr,
      reorderUrgency: reorderUrg,
      reorderUrgencyLevel,
      recommendation,
    };
  });

  analyzed.sort(
    (a, b) =>
      b.estimatedRevenueAtRisk - a.estimatedRevenueAtRisk || b.reorderUrgency - a.reorderUrgency
  );

  const { score, breakdown } = computeHealthScore(analyzed);

  const count = (fn: (p: ProductAnalysis) => boolean) => analyzed.filter(fn).length;
  const criticalCount = count((p) => p.riskLevel === "Critical");
  const highCount = count((p) => p.riskLevel === "High");
  const atRiskWithinWeek = count((p) => p.riskLevel === "Critical" || p.riskLevel === "High");
  const totalRevenueAtRisk =
    Math.round(analyzed.reduce((s, p) => s + p.estimatedRevenueAtRisk, 0) * 100) / 100;
  const totalInventoryValue =
    Math.round(analyzed.reduce((s, p) => s + p.inventoryValue, 0) * 100) / 100;
  const dailyGrossMargin =
    Math.round(analyzed.reduce((s, p) => s + Math.max(0, p.unitMargin) * p.dailySales, 0) * 100) / 100;
  const weeklyGrossMargin = dailyGrossMargin * 7;
  const grossMarginPct =
    totalWeekly > 0 ? Math.round((weeklyGrossMargin / totalWeekly) * 100) : 0;

  const summaryBase = {
    totalProducts: analyzed.length,
    criticalCount,
    highCount,
    atRiskWithinWeek,
    totalRevenueAtRisk,
    totalInventoryValue,
    healthLabel: healthLabel(score),
    fastMovers: count((p) => p.velocity === "Fast"),
    mediumMovers: count((p) => p.velocity === "Medium"),
    slowMovers: count((p) => p.velocity === "Slow"),
    reorderCount: count((p) => p.recommendation === "Reorder"),
    reduceCount: count((p) => p.recommendation === "Reduce"),
    monitorCount: count((p) => p.recommendation === "Monitor"),
    opportunityCount: count((p) => p.recommendation === "Opportunity"),
    totalWeeklyRevenue: Math.round(totalWeekly),
    dailyGrossMargin,
    grossMarginPct,
  };

  const summary: AnalysisSummary = {
    ...summaryBase,
    explanation: buildExplanation(summaryBase, score),
  };

  const catMap = new Map<string, CategoryRollup>();
  for (const p of analyzed) {
    const c = catMap.get(p.category) ?? {
      category: p.category,
      products: 0,
      weeklyRevenue: 0,
      atRisk: 0,
      slowMovers: 0,
    };
    c.products += 1;
    c.weeklyRevenue += p.weeklyRevenue;
    if (p.riskLevel === "Critical" || p.riskLevel === "High") c.atRisk += 1;
    if (p.velocity === "Slow" || p.velocity === "None") c.slowMovers += 1;
    catMap.set(p.category, c);
  }
  const categoryRollup = [...catMap.values()]
    .map((c) => ({ ...c, weeklyRevenue: Math.round(c.weeklyRevenue) }))
    .sort((a, b) => b.weeklyRevenue - a.weeklyRevenue);

  return {
    generatedAt: new Date().toISOString(),
    business,
    products: analyzed,
    summary,
    categoryRollup,
    dataQuality: detectDataQuality(products),
    healthScore: score,
    healthBreakdown: breakdown,
  };
}

export { LEAD_TIME_DAYS };
