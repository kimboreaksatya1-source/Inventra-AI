// Inventra AI — Procurement Intelligence. Pure derivation of the analysis snapshot.
// "What should I buy next, how much, and why." Every quantity is fully explainable.

import { LEAD_TIME_DAYS } from "./fmcg-rules";
import type {
  InventoryAnalysis,
  ProcurementExplanation,
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

/** Reorder window used by the urgency model (lead time, doubled for a safety buffer). */
const REORDER_WINDOW_DAYS = LEAD_TIME_DAYS * 2;

const PRIORITY_RANK = { Critical: 0, High: 1, Medium: 2, Low: 3 } as const;

const round1 = (n: number) => Math.round(n * 10) / 10;
const round2 = (n: number) => Math.round(n * 100) / 100;

function velLabel(v: ProductVelocity): string {
  return v === "Fast"
    ? "Fast-moving"
    : v === "Slow"
    ? "Slow-moving"
    : v === "None"
    ? "No-sales"
    : "Medium-moving";
}

function velocityLabel(v: ProductVelocity): string {
  return v === "Fast"
    ? "Fast Moving"
    : v === "Slow"
    ? "Slow Moving"
    : v === "None"
    ? "No Sales"
    : "Medium Moving";
}

function coverLabel(days: number): string {
  return Number.isFinite(days) ? `${round1(days)}` : "30+";
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

/** Percentile (0-1) of each product among products that are actually selling, by sales rate. */
function salesPercentiles(products: ProductAnalysis[]): Map<string, number> {
  const active = products.filter((p) => p.dailySales > 0).sort((a, b) => a.dailySales - b.dailySales);
  const out = new Map<string, number>();
  const n = active.length;
  active.forEach((p, i) => out.set(p.id, n <= 1 ? 1 : (i + 1) / n));
  return out;
}

function velocityReasonFor(p: ProductAnalysis, pct: number | undefined): string {
  const rate = round2(p.dailySales);
  if (p.velocity === "None" || p.dailySales <= 0) {
    return "No sales were recorded in the analysis window, so it has no velocity class.";
  }
  const u = rate === 1 ? "unit" : "units";
  if (p.dailySales >= 5) {
    return `Sells about ${rate} ${u}/day — at or above the 5-units/day fast-mover threshold.`;
  }
  if (p.dailySales < 0.3) {
    return `Sells under 0.3 units/day — below the absolute slow-mover threshold.`;
  }
  const band =
    pct === undefined
      ? ""
      : ` — placing it in the ${
          pct >= 0.7 ? "top 30%" : pct >= 0.35 ? "middle band" : "bottom 35%"
        } of products that are selling`;
  return `Sells about ${rate} ${u}/day${band}. Inventra ranks the top 30% by sales rate as Fast, the bottom 35% as Slow, the rest Medium.`;
}

function priorityReasonFor(
  p: ProductAnalysis,
  priority: ProcurementRow["priority"]
): string {
  if (p.dailySales <= 0) {
    return "No sales, so there is no reorder urgency — review it for clearance instead.";
  }
  const cover = Number.isFinite(p.daysRemaining) ? round1(p.daysRemaining) : REORDER_WINDOW_DAYS * 2;
  const forced =
    Number.isFinite(p.daysRemaining) &&
    p.daysRemaining < 3 &&
    p.reorderUrgencyLevel !== "Critical" &&
    p.reorderUrgencyLevel !== "High";
  const parts = [
    `Reorder-urgency score ${p.reorderUrgency}/100 → ${priority}.`,
    `Current cover is ${coverLabel(cover)} day${cover === 1 ? "" : "s"} against a ${REORDER_WINDOW_DAYS}-day reorder window (${LEAD_TIME_DAYS}-day lead time plus buffer);`,
    `${velLabel(p.velocity).toLowerCase()} velocity and ${p.revenueImpact.toLowerCase()} revenue impact add weight.`,
  ];
  if (forced) {
    parts.push("Raised to at least High because stock runs out in under 3 days.");
  }
  return parts.join(" ");
}

function buildExplanation(
  p: ProductAnalysis,
  target: number,
  suggestedQuantity: number,
  priority: ProcurementRow["priority"],
  pct: number | undefined
): ProcurementExplanation {
  const ds = round2(p.dailySales);
  const raw = target * p.dailySales - p.stock;
  const formula =
    p.dailySales <= 0
      ? `No sales → no coverage target → 0 units`
      : raw <= 0
      ? `(${target} × ${ds}) − ${p.stock} = ${round1(raw)} → 0 (stock already covers the ${target}-day target)`
      : `(${target} × ${ds}) − ${p.stock} = ${suggestedQuantity}`;

  const cover = Number.isFinite(p.daysRemaining) ? Math.round(p.daysRemaining) : null;
  let reason: string;
  if (p.dailySales <= 0) {
    reason = `${p.name} has had no sales in the analysis window, so no reorder is recommended. Review it for clearance or discontinuation instead.`;
  } else if (suggestedQuantity <= 0) {
    reason = `${p.name} already holds ${coverLabel(p.daysRemaining)} days of cover, at or above its ${target}-day target for a ${velLabel(
      p.velocity
    ).toLowerCase()} product, so no order is recommended right now.`;
  } else {
    const scarce = cover === null || cover < target * 0.5;
    reason = `${p.name} is a ${velLabel(p.velocity).toLowerCase()}, ${p.revenueImpact.toLowerCase()}-revenue product. Current inventory ${
      scarce ? "covers only" : "covers about"
    } ${cover ?? "a few"} day${cover === 1 ? "" : "s"} of demand. To maintain the target inventory coverage of ${target} days, Inventra recommends ordering ${suggestedQuantity} additional units.`;
  }

  return {
    currentStock: p.stock,
    dailySales: ds,
    daysRemaining: p.daysRemaining,
    daysRemainingLabel: coverLabel(p.daysRemaining),
    velocity: p.velocity,
    velocityLabel: velocityLabel(p.velocity),
    revenueImpact: p.revenueImpact,
    targetCoverageDays: target,
    formula,
    suggestedQuantity,
    reason,
    priorityReason: priorityReasonFor(p, priority),
    velocityReason: velocityReasonFor(p, pct),
  };
}

export function buildProcurement(analysis: InventoryAnalysis): ProcurementResult {
  const pctByProduct = salesPercentiles(analysis.products);

  const rows: ProcurementRow[] = analysis.products.map((p) => {
    const target = PROCUREMENT_COVERAGE[p.velocity];
    const suggestedQuantity = Math.max(0, Math.round(target * p.dailySales - p.stock));
    const estimatedCost = Math.round(suggestedQuantity * p.costPrice * 100) / 100;
    const priority = priorityFor(p);
    return {
      id: p.id,
      name: p.name,
      canonicalName: p.canonicalName ?? null,
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
      priority,
      reason: reasonFor(p, target),
      revenueProtected: Math.round(p.estimatedRevenueAtRisk),
      explanation: buildExplanation(p, target, suggestedQuantity, priority, pctByProduct.get(p.id)),
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
        } | ${p.velocity} / ${p.revenueImpact} impact | target ${p.targetCoverageDays}d | ${p.explanation.formula} | ${p.priority} | ${p.reason}`
    )
    .join("\n");
  return [
    `PURCHASE PLAN — ${r.kpis.productsToReorder} products to reorder, ${r.kpis.criticalOrders} critical.`,
    `Estimated purchase cost ${usd(r.kpis.estimatedPurchaseCost)} for ${r.kpis.estimatedPurchaseUnits} units, protecting ${usd(r.kpis.revenueProtected)} of revenue.`,
    `Every quantity = (coverage target × daily sales) − current stock, floored at 0. Coverage targets: fast movers 21 days, medium 30, slow 45.`,
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
  } Each quantity is (coverage target × daily sales) − current stock: fast movers to 21 days of cover, medium to 30, slow to 45.`;
}
