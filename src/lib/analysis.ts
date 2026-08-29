// Inventra AI — Inventory Analysis Engine (Feature 2)
// Pure, server-side. Reads Product.dailySales directly (spec formulas),
// independent of the sales-history math in inventory.ts.

import type {
  AnalysisSummary,
  InventoryAnalysis,
  ProductAnalysis,
  RiskLevel,
} from "./types";

export interface AnalysisInput {
  id: string;
  name: string;
  category: string;
  stock: number;
  dailySales: number;
  sellingPrice: number;
  costPrice: number;
  brand?: string | null;
  sku?: string | null;
}

/** Bounded horizon (days) used for revenue-at-risk projections. */
const RISK_HORIZON_DAYS = 30;
const OVERSTOCK_DAYS = 45;

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

export function analyzeProduct(p: AnalysisInput): ProductAnalysis {
  const days = daysRemaining(p.stock, p.dailySales);
  const daysUntilStockout = Number.isFinite(days)
    ? Math.min(days, RISK_HORIZON_DAYS)
    : 0;
  const riskLevel = riskLevelFor(days, p.dailySales);

  // spec: estimatedRevenueAtRisk = daysUntilStockout * dailySales * sellingPrice
  const estimatedRevenueAtRisk =
    Math.round(daysUntilStockout * p.dailySales * p.sellingPrice * 100) / 100;

  return {
    id: p.id,
    name: p.name,
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

  // 1. Stockout risk (40%) — penalise Critical/High share, weighted by severity.
  const critical = active.filter((p) => p.riskLevel === "Critical").length;
  const high = active.filter((p) => p.riskLevel === "High").length;
  const medium = active.filter((p) => p.riskLevel === "Medium").length;
  const riskPenalty = (critical * 1 + high * 0.55 + medium * 0.2) / n;
  const stockoutRisk = clamp(100 - riskPenalty * 130);

  // 2. Inventory balance (30%) — penalise overstock and dead stock.
  const overstock = products.filter(
    (p) => Number.isFinite(p.daysRemaining) && p.daysRemaining > OVERSTOCK_DAYS
  ).length;
  const deadStock = products.filter((p) => p.dailySales === 0 && p.stock > 0).length;
  const balancePenalty = (overstock * 0.7 + deadStock * 1) / n;
  const inventoryBalance = clamp(100 - balancePenalty * 120);

  // 3. Product health (30%) — share of products that are profitable and not in danger.
  const healthy = products.filter(
    (p) => p.riskLevel !== "Critical" && p.riskLevel !== "High" && p.unitMargin > 0
  ).length;
  const productHealth = clamp((healthy / n) * 100);

  const score = Math.round(
    stockoutRisk * 0.4 + inventoryBalance * 0.3 + productHealth * 0.3
  );

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
  if (score >= 85) return "Excellent";
  if (score >= 70) return "Healthy";
  if (score >= 55) return "Needs Attention";
  if (score > 0) return "At Risk";
  return "No Data";
}

function buildExplanation(summary: Omit<AnalysisSummary, "explanation">, score: number): string {
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
    parts.push(
      `${summary.atRiskWithinWeek} will run out within a week if demand holds`
    );
  }
  if (parts.length === 0) {
    parts.push("no products are at immediate risk of stocking out");
  }
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
  return `${verdict} ${capitalize(parts.join("; "))}.${money}`;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function analyzeInventory(
  products: AnalysisInput[],
  business = "Your Business"
): InventoryAnalysis {
  const analyzed = products
    .map(analyzeProduct)
    .sort((a, b) => b.estimatedRevenueAtRisk - a.estimatedRevenueAtRisk);

  const { score, breakdown } = computeHealthScore(analyzed);

  const criticalCount = analyzed.filter((p) => p.riskLevel === "Critical").length;
  const highCount = analyzed.filter((p) => p.riskLevel === "High").length;
  const atRiskWithinWeek = analyzed.filter(
    (p) => p.riskLevel === "Critical" || p.riskLevel === "High"
  ).length;
  const totalRevenueAtRisk =
    Math.round(analyzed.reduce((s, p) => s + p.estimatedRevenueAtRisk, 0) * 100) / 100;
  const totalInventoryValue =
    Math.round(analyzed.reduce((s, p) => s + p.inventoryValue, 0) * 100) / 100;

  const summaryBase = {
    totalProducts: analyzed.length,
    criticalCount,
    highCount,
    atRiskWithinWeek,
    totalRevenueAtRisk,
    totalInventoryValue,
    healthLabel: healthLabel(score),
  };

  const summary: AnalysisSummary = {
    ...summaryBase,
    explanation: buildExplanation(summaryBase, score),
  };

  return {
    generatedAt: new Date().toISOString(),
    business,
    products: analyzed,
    summary,
    healthScore: score,
    healthBreakdown: breakdown,
  };
}
