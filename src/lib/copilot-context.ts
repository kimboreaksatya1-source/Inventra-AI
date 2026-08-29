// Inventra AI — Copilot Context Engine.
// Assembles the owner's real business data into (a) a structured object for the
// right-hand panel and (b) a compact plaintext block injected into every AI request.

import { loadAnalysisInputs } from "./data";
import { analyzeInventory } from "./analysis";
import { buildDeterministicBrief } from "./brief";
import type { CopilotContext } from "./types";

const OVERSTOCK_DAYS = 45;

function usd(n: number): string {
  return `$${Math.round(n).toLocaleString()}`;
}

function days(n: number): string {
  return Number.isFinite(n) ? `${n.toFixed(1)}` : "30+";
}

export async function buildCopilotContext(): Promise<{
  context: CopilotContext;
  promptBlock: string;
}> {
  const { business, products } = await loadAnalysisInputs();

  if (products.length === 0) {
    const empty: CopilotContext = {
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
    };
    return {
      context: empty,
      promptBlock: `BUSINESS SUMMARY — ${business}\nNo product data has been imported yet.`,
    };
  }

  const analysis = analyzeInventory(products, business);
  const brief = buildDeterministicBrief(analysis);

  const criticalProducts = analysis.products
    .filter((p) => p.riskLevel === "Critical" || p.riskLevel === "High")
    .slice(0, 8)
    .map((p) => ({
      name: p.name,
      daysRemaining: Number.isFinite(p.daysRemaining)
        ? Math.round(p.daysRemaining * 10) / 10
        : 0,
      revenueAtRisk: Math.round(p.estimatedRevenueAtRisk),
    }));

  const overstockProducts = analysis.products
    .filter(
      (p) =>
        (Number.isFinite(p.daysRemaining) && p.daysRemaining > OVERSTOCK_DAYS) ||
        (p.dailySales === 0 && p.stock > 0)
    )
    .sort((a, b) => b.inventoryValue - a.inventoryValue)
    .slice(0, 6)
    .map((p) => ({
      name: p.name,
      daysRemaining: Number.isFinite(p.daysRemaining) ? Math.round(p.daysRemaining) : 999,
      inventoryValue: Math.round(p.inventoryValue),
    }));

  const topSellers = [...analysis.products]
    .filter((p) => p.dailySales > 0)
    .sort((a, b) => b.dailySales * b.sellingPrice - a.dailySales * a.sellingPrice)
    .slice(0, 5)
    .map((p) => ({
      name: p.name,
      dailySales: p.dailySales,
      weeklyRevenue: Math.round(p.dailySales * 7 * p.sellingPrice),
    }));

  const opportunities = brief.revenueOpportunities.map((o) => ({
    title: o.title,
    expectedRevenueImpact: Math.round(o.expectedRevenueImpact),
  }));

  const context: CopilotContext = {
    business,
    hasData: true,
    productCount: analysis.products.length,
    healthScore: analysis.healthScore,
    healthLabel: analysis.summary.healthLabel,
    revenueAtRisk: Math.round(analysis.summary.totalRevenueAtRisk),
    inventoryValue: Math.round(analysis.summary.totalInventoryValue),
    criticalProducts,
    overstockProducts,
    recommendedActions: brief.recommendedActions,
    opportunities,
    topSellers,
  };

  const promptBlock = [
    `BUSINESS SUMMARY — ${business}`,
    `Inventory Health: ${context.healthScore}/100 (${context.healthLabel})`,
    `Revenue at Risk (next 30 days): ${usd(context.revenueAtRisk)}`,
    `Inventory Value on hand: ${usd(context.inventoryValue)}`,
    `Products tracked: ${context.productCount}`,
    ``,
    `CRITICAL / HIGH-RISK PRODUCTS (stockout risk):`,
    criticalProducts.length
      ? criticalProducts
          .map(
            (p) =>
              `- ${p.name} — ${days(p.daysRemaining)} days of stock left, ${usd(
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
              `- ${p.name} — ${
                p.daysRemaining === 999 ? "no recent sales" : `${p.daysRemaining} days cover`
              }, ${usd(p.inventoryValue)} tied up`
          )
          .join("\n")
      : "- none",
    ``,
    `TOP SELLERS: ${
      topSellers.map((p) => `${p.name} (${usd(p.weeklyRevenue)}/wk)`).join(", ") || "n/a"
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
