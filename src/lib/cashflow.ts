// Inventra AI — Cash Flow Intelligence. Pure derivation of the analysis snapshot.
// "Where is my working capital tied up?"

import { healthLabel } from "./analysis";
import type { CapitalConsumer, CashflowResult, InventoryAnalysis } from "./types";

const usd = (n: number) => `$${Math.round(n).toLocaleString()}`;

function clamp(n: number): number {
  return Math.max(0, Math.min(100, n));
}

export function buildCashflow(analysis: InventoryAnalysis): CashflowResult {
  const products = analysis.products;
  const empty: CashflowResult = {
    hasData: products.length > 0,
    kpis: {
      totalInventoryValue: 0,
      slowMovingValue: 0,
      deadInventoryValue: 0,
      cashLocked: 0,
      cashLockedPct: 0,
      revenueAtRisk: 0,
      workingCapitalHealth: 0,
      workingCapitalLabel: "No Data",
    },
    breakdown: { healthy: 0, slowMoving: 0, dead: 0 },
    topConsumers: [],
    explanation: "Import product data to see where your capital is tied up.",
    generatedAt: analysis.generatedAt,
  };
  if (products.length === 0) return empty;

  const totalInventoryValue = round(products.reduce((s, p) => s + p.inventoryValue, 0));
  const deadInventoryValue = round(
    products.filter((p) => p.dailySales === 0 && p.stock > 0).reduce((s, p) => s + p.inventoryValue, 0)
  );
  const slowMovingValue = round(
    products
      .filter((p) => p.velocity === "Slow")
      .reduce((s, p) => s + p.inventoryValue, 0)
  );
  const cashLocked = round(slowMovingValue + deadInventoryValue);
  const cashLockedPct = totalInventoryValue > 0 ? cashLocked / totalInventoryValue : 0;
  const healthy = Math.max(0, round(totalInventoryValue - cashLocked));

  const n = products.length;
  const overstockShare = products.filter((p) => p.overstockRisk !== "Low").length / n;
  const revenueAtRisk = Math.round(analysis.summary.totalRevenueAtRisk);
  const weekly = Math.max(1, analysis.summary.totalWeeklyRevenue);

  const lockedConsumers = [...products]
    .filter((p) => p.velocity === "Slow" || (p.dailySales === 0 && p.stock > 0))
    .sort((a, b) => b.inventoryValue - a.inventoryValue);
  const concentration =
    totalInventoryValue > 0
      ? lockedConsumers.slice(0, 3).reduce((s, p) => s + p.inventoryValue, 0) / totalInventoryValue
      : 0;

  let health = 100;
  health -= cashLockedPct * 55;
  health -= overstockShare * 25;
  health -= Math.min(20, (revenueAtRisk / weekly) * 12);
  health -= concentration * 10;
  const workingCapitalHealth = Math.round(clamp(health));

  const topConsumers: CapitalConsumer[] = [...products]
    .sort((a, b) => b.inventoryValue - a.inventoryValue)
    .slice(0, 10)
    .map((p) => ({
      id: p.id,
      name: p.name,
      sku: p.sku ?? null,
      category: p.category,
      velocity: p.velocity,
      recommendation: p.recommendation,
      stock: p.stock,
      unitCost: p.costPrice,
      inventoryValue: round(p.inventoryValue),
      shareOfCapital: totalInventoryValue > 0 ? p.inventoryValue / totalInventoryValue : 0,
    }));

  const explanation = buildExplanation({
    totalInventoryValue,
    cashLocked,
    cashLockedPct,
    slowMovingValue,
    deadInventoryValue,
    revenueAtRisk,
    workingCapitalHealth,
    topConsumer: topConsumers[0],
  });

  return {
    hasData: true,
    kpis: {
      totalInventoryValue,
      slowMovingValue,
      deadInventoryValue,
      cashLocked,
      cashLockedPct: Math.round(cashLockedPct * 1000) / 1000,
      revenueAtRisk,
      workingCapitalHealth,
      workingCapitalLabel: healthLabel(workingCapitalHealth),
    },
    breakdown: { healthy, slowMoving: slowMovingValue, dead: deadInventoryValue },
    topConsumers,
    explanation,
    generatedAt: analysis.generatedAt,
  };
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

function buildExplanation(x: {
  totalInventoryValue: number;
  cashLocked: number;
  cashLockedPct: number;
  slowMovingValue: number;
  deadInventoryValue: number;
  revenueAtRisk: number;
  workingCapitalHealth: number;
  topConsumer?: CapitalConsumer;
}): string {
  const pct = Math.round(x.cashLockedPct * 100);
  const verdict =
    x.workingCapitalHealth >= 70
      ? "Your working capital is well deployed."
      : x.workingCapitalHealth >= 55
      ? "Your working capital needs some rebalancing."
      : "Too much of your capital is trapped in stock that isn't selling.";
  const parts = [`${verdict} You hold ${usd(x.totalInventoryValue)} of inventory`];
  if (x.cashLocked > 0) {
    parts.push(
      `, of which ${usd(x.cashLocked)} (${pct}%) is locked in slow-moving${
        x.deadInventoryValue > 0 ? ` and dead (${usd(x.deadInventoryValue)})` : ""
      } stock`
    );
  }
  parts.push(".");
  if (x.topConsumer && (x.topConsumer.velocity === "Slow" || x.topConsumer.velocity === "None")) {
    parts.push(
      ` ${x.topConsumer.name} alone ties up ${usd(x.topConsumer.inventoryValue)} — clear or discount it to free cash for fast movers.`
    );
  }
  if (x.revenueAtRisk > 0) {
    parts.push(` Separately, ${usd(x.revenueAtRisk)} of revenue is exposed to stockouts.`);
  }
  return parts.join("");
}

/** Compact text block for the AI /cashflow answer. */
export function summarizeCashflow(r: CashflowResult): string {
  const k = r.kpis;
  return [
    `CASH POSITION`,
    `Total inventory value: ${usd(k.totalInventoryValue)}`,
    `Cash locked in slow-moving stock: ${usd(k.slowMovingValue)}`,
    `Dead inventory value: ${usd(k.deadInventoryValue)}`,
    `Cash locked total: ${usd(k.cashLocked)} (${Math.round(k.cashLockedPct * 100)}% of inventory value)`,
    `Revenue at risk: ${usd(k.revenueAtRisk)}`,
    `Working-capital health: ${k.workingCapitalHealth}/100 (${k.workingCapitalLabel})`,
    ``,
    `TOP CAPITAL CONSUMERS:`,
    r.topConsumers
      .slice(0, 8)
      .map(
        (c) =>
          `- ${c.name}${c.sku ? ` (SKU ${c.sku})` : ""} | ${usd(c.inventoryValue)} (${Math.round(
            c.shareOfCapital * 100
          )}% of capital) | ${c.velocity} mover | rule: ${c.recommendation}`
      )
      .join("\n"),
  ].join("\n");
}
