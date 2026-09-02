// Inventra AI — Copilot Context Engine.
// Assembles the owner's real business data into (a) a structured object for the
// right-hand panel and (b) a compact plaintext block injected into every AI request.

import { loadProductsLite } from "./data";
import { analyzeInventory } from "./analysis";
import { buildDeterministicBrief } from "./brief";
import { buildProcurement } from "./procurement";
import { buildCashflow } from "./cashflow";
import { buildEvidence, evidenceForPrompt } from "./copilot-evidence";
import { buildForecastEvidence, forecastEvidenceForPrompt } from "./forecast-evidence";
import { contextLabel, shortLabel } from "./product-label";
import type { BusinessBrief, CopilotContext, InventoryAnalysis } from "./types";

function usd(n: number): string {
  return `$${Math.round(n).toLocaleString()}`;
}

function days(n: number): string {
  return Number.isFinite(n) ? `${n.toFixed(1)}` : "30+";
}

/** DB-loading wrapper — kept as a fallback; hot routes use buildCopilotContextFrom + the snapshot. */
export async function buildCopilotContext(): Promise<{
  context: CopilotContext;
  promptBlock: string;
}> {
  const { business, products } = await loadProductsLite();
  if (products.length === 0) return emptyContext(business);
  const analysis = analyzeInventory(products, business);
  const brief = buildDeterministicBrief(analysis);
  return buildCopilotContextFrom(analysis, brief, business);
}

function emptyContext(business: string): { context: CopilotContext; promptBlock: string } {
  return {
    context: {
      business,
      hasData: false,
      productCount: 0,
      healthScore: 0,
      healthLabel: "No Data",
      revenueAtRisk: 0,
      inventoryValue: 0,
      criticalProducts: [],
      overstockProducts: [],
      recommendedActions: [],
      opportunities: [],
      topSellers: [],
    },
    promptBlock: `BUSINESS SUMMARY — ${business}\nNo product data has been imported yet.`,
  };
}

/** Pure — assemble the context object + prompt block from already-computed analysis + brief. */
export function buildCopilotContextFrom(
  analysis: InventoryAnalysis,
  brief: BusinessBrief,
  business: string
): { context: CopilotContext; promptBlock: string } {
  if (analysis.products.length === 0) return emptyContext(business);

  const criticalProducts = analysis.products
    .filter((p) => p.riskLevel === "Critical" || p.riskLevel === "High")
    .slice(0, 8)
    .map((p) => ({
      name: shortLabel(p),
      contextName: contextLabel(p),
      daysRemaining: Number.isFinite(p.daysRemaining)
        ? Math.round(p.daysRemaining * 10) / 10
        : 0,
      revenueAtRisk: Math.round(p.estimatedRevenueAtRisk),
    }));

  const overstockProducts = analysis.products
    .filter((p) => p.overstockRisk !== "Low" || p.recommendation === "Reduce")
    .sort((a, b) => b.inventoryValue - a.inventoryValue)
    .slice(0, 6)
    .map((p) => ({
      name: shortLabel(p),
      contextName: contextLabel(p),
      daysRemaining: Number.isFinite(p.daysRemaining) ? Math.round(p.daysRemaining) : 999,
      inventoryValue: Math.round(p.inventoryValue),
    }));

  const topSellers = [...analysis.products]
    .filter((p) => p.dailySales > 0)
    .sort((a, b) => b.dailySales * b.sellingPrice - a.dailySales * a.sellingPrice)
    .slice(0, 5)
    .map((p) => ({
      name: shortLabel(p),
      contextName: contextLabel(p),
      dailySales: p.dailySales,
      weeklyRevenue: Math.round(p.dailySales * 7 * p.sellingPrice),
    }));

  const opportunities = brief.revenueOpportunities.map((o) => ({
    title: o.title,
    expectedRevenueImpact: Math.round(o.expectedRevenueImpact),
  }));

  const s = analysis.summary;
  const proc = buildProcurement(analysis);
  const cash = buildCashflow(analysis);
  const dq = analysis.dataQuality;
  // Full set for the deterministic engine's "why <product>" lookups; the prompt
  // gets the top slice to stay within a sane token budget.
  const evidence = buildEvidence(analysis, proc, 30);
  const context: CopilotContext = {
    business,
    hasData: true,
    productCount: analysis.products.length,
    healthScore: analysis.healthScore,
    healthLabel: s.healthLabel,
    revenueAtRisk: Math.round(s.totalRevenueAtRisk),
    inventoryValue: Math.round(s.totalInventoryValue),
    dataQuality: dq,
    criticalProducts,
    overstockProducts,
    recommendedActions: brief.recommendedActions,
    opportunities,
    topSellers,
    velocityMix: { fast: s.fastMovers, medium: s.mediumMovers, slow: s.slowMovers },
    recommendationMix: {
      reorder: s.reorderCount,
      reduce: s.reduceCount,
      monitor: s.monitorCount,
      opportunity: s.opportunityCount,
    },
    categoryMix: analysis.categoryRollup
      .slice(0, 6)
      .map((c) => ({ category: c.category, weeklyRevenue: c.weeklyRevenue, atRisk: c.atRisk })),
    evidence,
    procurement: {
      productsToReorder: proc.kpis.productsToReorder,
      estimatedPurchaseCost: proc.kpis.estimatedPurchaseCost,
      revenueProtected: proc.kpis.revenueProtected,
    },
    cashflow: {
      totalInventoryValue: cash.kpis.totalInventoryValue,
      cashLocked: cash.kpis.cashLocked,
      cashLockedPct: cash.kpis.cashLockedPct,
      workingCapitalHealth: cash.kpis.workingCapitalHealth,
    },
  };

  const velLabel = (v: string) =>
    v === "Fast" ? "fast mover" : v === "Slow" ? "slow mover" : v === "None" ? "no sales" : "medium mover";
  const productLines = analysis.products
    .slice(0, 40)
    .map(
      (p) =>
        `- ${contextLabel(p)} | ${p.category} | ${velLabel(p.velocity)} | ${days(p.daysRemaining)}d cover | rule: ${p.recommendation} | ${p.revenueImpact} revenue impact`
    )
    .join("\n");

  const dataQualityLine = !dq
    ? null
    : !dq.hasSalesData
    ? `DATA QUALITY: No daily-sales data was imported. Days-of-cover, stockout risk, revenue-at-risk, velocity, the purchase plan and cash-flow risk CANNOT be computed — tell the owner to import a daily-sales column rather than guessing.`
    : !dq.hasCostData
    ? `DATA QUALITY: No cost-price data was imported. Inventory value, margins, purchase cost and all cash-flow figures are unavailable — do not estimate them.`
    : dq.productsMissingCost > 0
    ? `DATA QUALITY: ${dq.productsMissingCost} of ${dq.totalProducts} products have no cost price; inventory-value, margin and purchase-cost figures exclude them.`
    : null;

  const promptBlock = [
    `BUSINESS SUMMARY — ${business} (FMCG inventory)`,
    `Inventory Health: ${context.healthScore}/100 (${context.healthLabel})`,
    `Revenue at Risk (next 30 days): ${usd(context.revenueAtRisk)}`,
    `Inventory Value on hand: ${usd(context.inventoryValue)}`,
    `Weekly revenue run-rate: ${usd(s.totalWeeklyRevenue)}`,
    `Products tracked: ${context.productCount}`,
    ...(dataQualityLine ? [``, dataQualityLine] : []),
    ``,
    `WHAT THE RULES SAY: ${s.reorderCount} to reorder, ${s.reduceCount} to reduce/clear, ${s.opportunityCount} opportunities, ${s.monitorCount} to monitor. Velocity: ${s.fastMovers} fast / ${s.mediumMovers} medium / ${s.slowMovers} slow movers.`,
    ``,
    `PURCHASE PLAN (coverage targets: fast 21d / medium 30d / slow 45d): ${proc.kpis.productsToReorder} products to order, ${proc.kpis.criticalOrders} critical, est. cost ${usd(proc.kpis.estimatedPurchaseCost)}, protecting ${usd(proc.kpis.revenueProtected)} of revenue.`,
    `HOW EACH ORDER QUANTITY IS DERIVED: suggested qty = (coverage target × daily sales) − current stock, never below 0. When the owner asks WHY a quantity, priority or velocity, walk them through these numbers in plain language — don't just restate the figure.`,
    ``,
    `EVIDENCE (cite one of these for EVERY recommendation — DATA are real values, do not add figures that aren't here):`,
    evidenceForPrompt(evidence.slice(0, 16)),
    proc.plan
      .slice(0, 12)
      .map(
        (r) =>
          `  - ${contextLabel(r)} — order ${r.suggestedQuantity} units (~${usd(r.estimatedCost)}), ${r.priority}. stock ${r.stock}, ${r.explanation.dailySales}/day, ${r.explanation.daysRemainingLabel}d cover, ${r.velocity} / ${r.revenueImpact} impact, target ${r.targetCoverageDays}d → ${r.explanation.formula}. ${r.explanation.priorityReason}`
      )
      .join("\n") || "  - nothing needs ordering",
    ``,
    ``,
    `FORECAST RELIABILITY (reorder quantities assume sales stay near the current daily rate — they are NOT a trend forecast):`,
    forecastEvidenceForPrompt(buildForecastEvidence(analysis, proc, new Map()), analysis),
    `When the owner asks how reliable / how sensitive a recommendation is, quote these: the ±20% sensitivity, and that confidence is Medium unless day-to-day sales history is available.`,
    ``,
    `VELOCITY MODEL: Fast = sells ≥5 units/day, or in the top 30% of selling products by sales rate. Slow = under 0.3/day, or in the bottom 35%. Medium = in between. No sales = nothing sold in the window.`,
    `REORDER URGENCY MODEL: a 0-100 score from how far current cover sits inside the ${
      2 * 7
    }-day reorder window (7-day lead time + buffer), plus weight for Fast velocity and High revenue impact. ≥75 → Critical, ≥50 → High, ≥25 → Medium. Anything with under 3 days of cover is forced to at least High.`,
    ``,
    `CASH POSITION: inventory value ${usd(cash.kpis.totalInventoryValue)}; cash locked in slow/dead stock ${usd(cash.kpis.cashLocked)} (${Math.round(cash.kpis.cashLockedPct * 100)}%); working-capital health ${cash.kpis.workingCapitalHealth}/100. Top capital consumers: ${
      cash.topConsumers
        .slice(0, 5)
        .map((c) => `${c.name} ${usd(c.inventoryValue)} (${c.velocity})`)
        .join(", ") || "n/a"
    }.`,
    ``,
    `PRODUCT NAMING: each product shows the owner's ORIGINAL name, then in [brackets] its canonical`,
    `English name + brand. Match and reason using the canonical name, but ALWAYS write the ORIGINAL`,
    `name back to the owner — never translate or replace it.`,
    ``,
    `PRODUCT LINES (velocity | days of cover | rule-based action | revenue impact):`,
    productLines || "- none",
    ``,
    `CATEGORY MIX (by weekly revenue): ${
      analysis.categoryRollup
        .slice(0, 6)
        .map((c) => `${c.category} ${usd(c.weeklyRevenue)}/wk (${c.atRisk} at risk)`)
        .join(", ") || "n/a"
    }`,
    ``,
    `CRITICAL / HIGH-RISK PRODUCTS (stockout risk):`,
    criticalProducts.length
      ? criticalProducts
          .map(
            (p) =>
              `- ${p.contextName ?? p.name} — ${days(p.daysRemaining)} days of stock left, ${usd(
                p.revenueAtRisk
              )} at risk`
          )
          .join("\n")
      : "- none",
    ``,
    `OVERSTOCKED / DEAD STOCK (cash tied up):`,
    overstockProducts.length
      ? overstockProducts
          .map(
            (p) =>
              `- ${p.contextName ?? p.name} — ${
                p.daysRemaining === 999 ? "no recent sales" : `${p.daysRemaining} days cover`
              }, ${usd(p.inventoryValue)} tied up`
          )
          .join("\n")
      : "- none",
    ``,
    `TOP SELLERS: ${
      topSellers.map((p) => `${p.contextName ?? p.name} (${usd(p.weeklyRevenue)}/wk)`).join(", ") || "n/a"
    }`,
    ``,
    `CURRENT RECOMMENDED ACTIONS (from the analysis engine):`,
    context.recommendedActions
      .map((a) => `- [${a.priority}] ${a.action} — ${a.reason} — ${a.expectedImpact}`)
      .join("\n"),
    ``,
    `GROWTH OPPORTUNITIES:`,
    opportunities.length
      ? opportunities
          .map((o) => `- ${o.title} — expected impact ${usd(o.expectedRevenueImpact)}`)
          .join("\n")
      : "- none identified yet",
  ].join("\n");

  return { context, promptBlock };
}
