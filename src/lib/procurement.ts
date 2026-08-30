// Inventra AI — Procurement Intelligence. Pure derivation of the analysis snapshot.
// "What should I buy next, how much, and why."

import type {
  InventoryAnalysis,
  ProcurementResult,
  ProcurementRow,
  ProductAnalysis,
  ProductVelocity,
} from "./types";

/** Days of cover a purchase should top each velocity class up to. */
export const PROCUREMENT_COVERAGE: Record<ProductVelocity, number> = {
  Fast: 21,
  Medium: 30,
  Slow: 45,
  None: 30,
};

const PRIORITY_RANK = { Critical: 0, High: 1, Medium: 2, Low: 3 } as const;

function velLabel(v: ProductVelocity): string {
  return v === "Fast" ? "Fast-moving" : v === "Slow" ? "Slow-moving" : v === "None" ? "No-sales" : "Medium-moving";
}

function reasonFor(p: ProductAnalysis, target: number): string {
  const cover = Number.isFinite(p.daysRemaining) ? Math.round(p.daysRemaining) : null;
  if (p.dailySales <= 0) return `${velLabel(p.velocity)} with no recent sales — no order needed.`;
  if (cover !== null && cover < target * 0.4) {
    return `${velLabel(p.velocity)} product with only ${cover} day${cover === 1 ? "" : "s"} of stock remaining.`;
  }
  if (cover !== null && cover < target) {
    return `${velLabel(p.velocity)} product with ${cover} days of cover — topping up to the ${target}-day target.`;
  }
  return `${velLabel(p.velocity)} product — bringing coverage up to the ${target}-day target.`;
}

function priorityFor(p: ProductAnalysis): ProcurementRow["priority"] {
  const lvl = p.reorderUrgencyLevel;
  if (Number.isFinite(p.daysRemaining) && p.daysRemaining < 3 && p.dailySales > 0) {
    return lvl === "Low" || lvl === "Medium" ? "High" : lvl;
  }
  return lvl;
}

export function buildProcurement(analysis: InventoryAnalysis): ProcurementResult {
  const rows: ProcurementRow[] = analysis.products.map((p) => {
    const target = PROCUREMENT_COVERAGE[p.velocity];
    const suggestedQuantity = Math.max(0, Math.round(target * p.dailySales - p.stock));
    const estimatedCost = Math.round(suggestedQuantity * p.costPrice * 100) / 100;
    return {
      id: p.id,
      name: p.name,
      sku: p.sku ?? null,
      category: p.category,
      brand: p.brand ?? null,
      stock: p.stock,
      dailySales: p.dailySales,
      daysRemaining: Number.isFinite(p.daysRemaining) ? Math.round(p.daysRemaining * 10) / 10 : Infinity,
      velocity: p.velocity,
      revenueImpact: p.revenueImpact,
      reorderUrgency: p.reorderUrgency,
      costPrice: p.costPrice,
      targetCoverageDays: target,
      suggestedQuantity,
      estimatedCost,
      priority: priorityFor(p),
      reason: reasonFor(p, target),
      revenueProtected: Math.round(p.estimatedRevenueAtRisk),
    };
  });

  rows.sort((a, b) => {
    const aNeeds = a.suggestedQuantity > 0 ? 0 : 1;
    const bNeeds = b.suggestedQuantity > 0 ? 0 : 1;
    if (aNeeds !== bNeeds) return aNeeds - bNeeds;
    return (
      PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] ||
      b.reorderUrgency - a.reorderUrgency ||
      b.revenueProtected - a.revenueProtected
    );
  });

  const plan = rows.filter((r) => r.suggestedQuantity > 0);

  return {
    rows,
    plan,
    kpis: {
      productsToReorder: plan.length,
      criticalOrders: plan.filter((r) => r.priority === "Critical").length,
      estimatedPurchaseUnits: plan.reduce((s, r) => s + r.suggestedQuantity, 0),
      estimatedPurchaseCost: Math.round(plan.reduce((s, r) => s + r.estimatedCost, 0)),
      revenueProtected: Math.round(plan.reduce((s, r) => s + r.revenueProtected, 0)),
    },
    generatedAt: analysis.generatedAt,
  };
}

const usd = (n: number) => `$${Math.round(n).toLocaleString()}`;

/** Compact text block for the AI purchase-plan narration + deterministic fallback. */
export function summarizeProcurement(r: ProcurementResult): string {
  if (r.plan.length === 0) {
    return "No products need reordering this week — every line is above its coverage target.";
  }
  const lines = r.plan
    .slice(0, 15)
    .map(
      (p) =>
        `- ${p.name}${p.sku ? ` (SKU ${p.sku})` : ""} | stock ${p.stock}, ${p.dailySales}/day, ${
          Number.isFinite(p.daysRemaining) ? `${p.daysRemaining}d cover` : "30d+ cover"
        } | order ${p.suggestedQuantity} units (~${usd(p.estimatedCost)}) | ${p.priority} | ${p.reason}`
    )
    .join("\n");
  return [
    `PURCHASE PLAN — ${r.kpis.productsToReorder} products to reorder, ${r.kpis.criticalOrders} critical.`,
    `Estimated purchase cost ${usd(r.kpis.estimatedPurchaseCost)} for ${r.kpis.estimatedPurchaseUnits} units, protecting ${usd(r.kpis.revenueProtected)} of revenue.`,
    `Coverage targets: fast movers 21 days, medium 30, slow 45.`,
    ``,
    lines,
  ].join("\n");
}

export function buildDeterministicPurchaseSummary(r: ProcurementResult): string {
  if (r.plan.length === 0) {
    return "**Purchase plan:** nothing to order this week — every product is above its coverage target. Keep your current cadence and re-check in a few days.";
  }
  const top = r.plan.slice(0, 3).map((p) => `${p.name} (${p.suggestedQuantity} units)`).join(", ");
  return `**Purchase plan:** order **${r.kpis.productsToReorder} products** this week — an estimated **${usd(
    r.kpis.estimatedPurchaseCost
  )}** for ${r.kpis.estimatedPurchaseUnits} units, protecting **${usd(r.kpis.revenueProtected)}** of revenue. ${
    r.kpis.criticalOrders > 0
      ? `${r.kpis.criticalOrders} order${r.kpis.criticalOrders > 1 ? "s are" : " is"} critical — place ${top} first.`
      : `Start with ${top}.`
  } Fast movers are ordered to 21 days of cover, medium to 30, slow to 45.`;
}
