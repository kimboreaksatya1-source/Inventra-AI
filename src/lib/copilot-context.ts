// Inventra AI — Copilot Context Engine.
// Assembles the owner's real business data into (a) a structured object for the
// right-hand panel and (b) a compact plaintext block injected into every AI request.

import { loadProductsLite } from "./data";
import { analyzeInventory } from "./analysis";
import { buildDeterministicBrief } from "./brief";
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
  const context: CopilotContext = {
    business,
    hasData: true,
    productCount: analysis.products.length,
    healthScore: analysis.healthScore,
    healthLabel: s.healthLabel,
    revenueAtRisk: Math.round(s.totalRevenueAtRisk),
    inventoryValue: Math.round(s.totalInventoryValue),
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

  const promptBlock = [
    `BUSINESS SUMMARY — ${business} (FMCG inventory)`,
    `Inventory Health: ${context.healthScore}/100 (${context.healthLabel})`,
    `Revenue at Risk (next 30 days): ${usd(context.revenueAtRisk)}`,
    `Inventory Value on hand: ${usd(context.inventoryValue)}`,
    `Weekly revenue run-rate: ${usd(s.totalWeeklyRevenue)}`,
    `Products tracked: ${context.productCount}`,
    ``,
    `WHAT THE RULES SAY: ${s.reorderCount} to reorder, ${s.reduceCount} to reduce/clear, ${s.opportunityCount} opportunities, ${s.monitorCount} to monitor. Velocity: ${s.fastMovers} fast / ${s.mediumMovers} medium / ${s.slowMovers} slow movers.`,
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
