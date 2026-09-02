// Inventra AI — Scenario Simulator engine (Phase 3).
// Pure functions, shared by client (instant what-if) and server (AI explanation).
// Runs a hypothetical scenario against the owner's real products.

import { money } from "./format";
import type { AnalysisInput } from "./analysis";
import { contextLabel, shortLabel } from "./product-label";
import type {
  ScenarioParams,
  SimProductResult,
  SimulationResult,
  SimulationSnapshot,
} from "./types";

export const DEFAULT_PARAMS: ScenarioParams = {
  demandGrowthPct: 0,
  salesIncreasePct: 0,
  seasonalMultiplier: 1,
  supplierDelayDays: 0,
  reorderQuantity: 0,
};

export const PARAM_BOUNDS = {
  demandGrowthPct: { min: -50, max: 200, step: 5, neutral: 0 },
  salesIncreasePct: { min: 0, max: 200, step: 5, neutral: 0 },
  seasonalMultiplier: { min: 0.25, max: 3, step: 0.05, neutral: 1 },
  supplierDelayDays: { min: 0, max: 30, step: 1, neutral: 0 },
  reorderQuantity: { min: 0, max: 500, step: 10, neutral: 0 },
} as const;

const BASE_LEAD_DAYS = 7;
const HORIZON_DAYS = 30;
const COVER_CAP = 999; // stand-in for "effectively infinite" days of cover

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}
function round(n: number, dp = 0): number {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
}

export function isDefaultParams(p: ScenarioParams): boolean {
  return (
    p.demandGrowthPct === 0 &&
    p.salesIncreasePct === 0 &&
    p.seasonalMultiplier === 1 &&
    p.supplierDelayDays === 0 &&
    p.reorderQuantity === 0
  );
}

export function normalizeParams(raw: Partial<ScenarioParams> | null | undefined): ScenarioParams {
  const p = { ...DEFAULT_PARAMS, ...(raw ?? {}) };
  return {
    demandGrowthPct: clamp(Number(p.demandGrowthPct) || 0, -90, 500),
    salesIncreasePct: clamp(Number(p.salesIncreasePct) || 0, 0, 500),
    seasonalMultiplier: clamp(Number(p.seasonalMultiplier) || 1, 0.1, 5),
    supplierDelayDays: clamp(Math.round(Number(p.supplierDelayDays) || 0), 0, 90),
    reorderQuantity: clamp(Math.round(Number(p.reorderQuantity) || 0), 0, 5000),
  };
}

function cover(stock: number, daily: number): number {
  if (daily <= 0) return COVER_CAP;
  return Math.min(COVER_CAP, stock / daily);
}

function stockoutProbability(coverDays: number, daily: number, leadTime: number, volBump: number): number {
  if (daily <= 0) return 0;
  const base = ((leadTime - Math.min(coverDays, leadTime)) / leadTime) * 100;
  return round(clamp(base + volBump, 0, 99));
}

/** Lost-sales value over the reorder window when cover runs short. */
function lostSalesValue(coverDays: number, daily: number, price: number, leadTime: number): number {
  const uncoveredDays = Math.max(0, leadTime - Math.min(coverDays, leadTime));
  return daily * uncoveredDays * price;
}

function simulateProduct(p: AnalysisInput, params: ScenarioParams) {
  const growth = 1 + params.demandGrowthPct / 100;
  const promo = 1 + params.salesIncreasePct / 100;
  const effDaily = Math.max(0, p.dailySales * growth * promo * params.seasonalMultiplier);
  const leadTime = BASE_LEAD_DAYS + params.supplierDelayDays;
  const volBump = Math.min(20, (Math.abs(params.demandGrowthPct) + Math.abs(params.salesIncreasePct)) * 0.25);

  const coverBefore = cover(p.stock, p.dailySales);
  const coverAfter = cover(p.stock, effDaily);
  const coverAfterReorder = cover(p.stock + params.reorderQuantity, effDaily);

  const probAfter = stockoutProbability(coverAfter, effDaily, leadTime, volBump);
  const probMitigated =
    params.reorderQuantity > 0
      ? stockoutProbability(coverAfterReorder, effDaily, leadTime, volBump)
      : probAfter;

  const price = p.sellingPrice;
  const cost = p.costPrice;

  const extraDemandUnits = (effDaily - p.dailySales) * HORIZON_DAYS;
  const grossGain = extraDemandUnits * price;

  const lostBefore = lostSalesValue(coverBefore, effDaily, price, BASE_LEAD_DAYS);
  const lostAfter = lostSalesValue(
    params.reorderQuantity > 0 ? coverAfterReorder : coverAfter,
    effDaily,
    price,
    leadTime
  );

  const revenueImpact = grossGain - (lostAfter - lostBefore);

  // inventory value change: what you buy minus the extra stock that sells through
  const extraUnitsSold = Math.max(0, extraDemandUnits);
  const inventoryImpact = params.reorderQuantity * cost - extraUnitsSold * cost;

  const cashOutlay = params.reorderQuantity * cost;
  const protectedRevenue = Math.max(0, lostBefore - lostAfter);

  const atRisk = probAfter >= 40 || (probAfter > 0 && probAfter > 15 + volBump);

  const result: SimProductResult = {
    id: p.id,
    name: p.name,
    canonicalName: p.canonicalName ?? null,
    sku: p.sku ?? null,
    brand: p.brand ?? null,
    category: p.category,
    effectiveDailySales: round(effDaily, 2),
    coverBefore: round(coverBefore, 1),
    coverAfter: round(coverAfter, 1),
    coverAfterReorder: round(coverAfterReorder, 1),
    stockoutProbability: probAfter,
    mitigatedProbability: probMitigated,
    revenueImpact: round(revenueImpact),
    atRisk,
  };

  return {
    result,
    revenue30dBefore: p.dailySales * HORIZON_DAYS * price - lostSalesValue(coverBefore, p.dailySales, price, BASE_LEAD_DAYS),
    revenue30dAfter: effDaily * HORIZON_DAYS * price - lostAfter,
    invValueBefore: p.stock * cost,
    // stock you'd hold after buying `reorderQuantity` and selling through faster demand,
    // floored at 0 (running out is captured by the stockout / lost-sales math above)
    invValueAfter: Math.max(0, (p.stock + params.reorderQuantity - extraUnitsSold) * cost),
    probBefore: stockoutProbability(coverBefore, p.dailySales, BASE_LEAD_DAYS, 0),
    probAfter: params.reorderQuantity > 0 ? probMitigated : probAfter,
    cashOutlay,
    protectedRevenue,
  };
}

export function simulateScenario(
  products: AnalysisInput[],
  rawParams: Partial<ScenarioParams>
): SimulationResult {
  const params = normalizeParams(rawParams);
  const rows = products.map((p) => simulateProduct(p, params));

  const sum = (f: (r: (typeof rows)[number]) => number) => rows.reduce((s, r) => s + f(r), 0);
  const avg = (f: (r: (typeof rows)[number]) => number) =>
    rows.length ? sum(f) / rows.length : 0;

  const before: SimulationSnapshot = {
    revenue30d: Math.round(sum((r) => r.revenue30dBefore)),
    inventoryValue: Math.round(sum((r) => r.invValueBefore)),
    avgStockoutProbability: Math.round(avg((r) => r.probBefore)),
    productsAtRisk: rows.filter((r) => r.probBefore >= 40).length,
  };
  const after: SimulationSnapshot = {
    revenue30d: Math.round(sum((r) => r.revenue30dAfter)),
    inventoryValue: Math.round(sum((r) => r.invValueAfter)),
    avgStockoutProbability: Math.round(avg((r) => r.probAfter)),
    productsAtRisk: rows.filter((r) => r.result.atRisk).length,
  };

  const revenueImpact = Math.round(sum((r) => r.result.revenueImpact));
  const inventoryImpact = after.inventoryValue - before.inventoryValue;
  const cashOutlay = Math.round(sum((r) => r.cashOutlay));
  const protectedRevenue = Math.round(sum((r) => r.protectedRevenue));

  const productsAtRisk = rows
    .filter((r) => r.result.atRisk)
    .map((r) => r.result)
    .sort((a, b) => b.stockoutProbability - a.stockoutProbability);

  const topOpportunities = rows
    .map((r) => ({ name: r.result.name, revenueImpact: r.result.revenueImpact }))
    .filter((o) => o.revenueImpact > 0)
    .sort((a, b) => b.revenueImpact - a.revenueImpact)
    .slice(0, 3);

  const leadTime = BASE_LEAD_DAYS + params.supplierDelayDays;
  const maxAtRiskDaily = Math.max(0, ...productsAtRisk.map((r) => r.effectiveDailySales));
  const suggestedReorderQuantity = Math.ceil(maxAtRiskDaily * leadTime * 1.2);

  let recommendedAction: SimulationResult["recommendedAction"];
  if (productsAtRisk.length > 0 && params.reorderQuantity < suggestedReorderQuantity) {
    recommendedAction = {
      headline: `Increase reorder quantity to ${suggestedReorderQuantity} units`,
      detail: `${productsAtRisk.length} product${productsAtRisk.length > 1 ? "s" : ""} would run short before a new order arrives (${leadTime}-day lead time). ${suggestedReorderQuantity} units covers the gap with a safety buffer.`,
      suggestedReorderQuantity,
    };
  } else if (params.supplierDelayDays >= 7) {
    recommendedAction = {
      headline: `Order ${params.supplierDelayDays} days earlier or line up a backup supplier`,
      detail: `A ${params.supplierDelayDays}-day supplier delay pushes your lead time to ${leadTime} days. Bring orders forward or split them across two suppliers to stay covered.`,
      suggestedReorderQuantity,
    };
  } else if (revenueImpact > 0 && productsAtRisk.length === 0) {
    recommendedAction = {
      headline: `Raise orders ~25% to capture +${formatUsd(revenueImpact)}`,
      detail: `Demand is up and nothing is at stockout risk in this scenario. Scaling your next order lets you meet the extra demand instead of leaving it on the table.`,
      suggestedReorderQuantity,
    };
  } else {
    recommendedAction = {
      headline: "Hold the current plan — this scenario is low-impact",
      detail: "The changes you modelled don't move revenue, risk or cash flow enough to act on. Keep your current ordering cadence.",
      suggestedReorderQuantity,
    };
  }

  return {
    generatedAt: new Date().toISOString(),
    horizonDays: HORIZON_DAYS,
    params,
    before,
    after,
    deltas: {
      revenueImpact,
      inventoryImpact,
      cashOutlay,
      protectedRevenue,
      netCashFlowImpact: protectedRevenue - cashOutlay,
    },
    productsAtRisk,
    topOpportunities,
    recommendedAction,
  };
}

function formatUsd(n: number): string {
  return money(n);
}

/** Compact scenario summary for the AI explanation prompt. */
export function summarizeForPrompt(result: SimulationResult): string {
  const p = result.params;
  const knobs = [
    p.demandGrowthPct !== 0 && `demand growth ${p.demandGrowthPct > 0 ? "+" : ""}${p.demandGrowthPct}%`,
    p.salesIncreasePct !== 0 && `sales uplift +${p.salesIncreasePct}%`,
    p.seasonalMultiplier !== 1 && `seasonal ×${p.seasonalMultiplier}`,
    p.supplierDelayDays !== 0 && `supplier delay ${p.supplierDelayDays}d`,
    p.reorderQuantity !== 0 && `reorder ${p.reorderQuantity} units/product`,
  ].filter(Boolean);

  return [
    `SCENARIO: ${knobs.length ? knobs.join(", ") : "no changes"}`,
    `Horizon: ${result.horizonDays} days`,
    `Revenue (30d): ${formatUsd(result.before.revenue30d)} → ${formatUsd(result.after.revenue30d)} (impact ${formatUsd(result.deltas.revenueImpact)})`,
    `Inventory value: ${formatUsd(result.before.inventoryValue)} → ${formatUsd(result.after.inventoryValue)}`,
    `Avg stockout probability: ${result.before.avgStockoutProbability}% → ${result.after.avgStockoutProbability}%`,
    `Products at risk: ${result.after.productsAtRisk}`,
    `Cash outlay: ${formatUsd(result.deltas.cashOutlay)}; protected revenue: ${formatUsd(result.deltas.protectedRevenue)}; net cash-flow impact: ${formatUsd(result.deltas.netCashFlowImpact)}`,
    result.productsAtRisk.length
      ? `AT-RISK PRODUCTS:\n${result.productsAtRisk
          .map(
            (r) =>
              `- ${contextLabel(r)}: cover ${r.coverBefore}d → ${r.coverAfter}d, stockout probability ${r.stockoutProbability}%${
                r.mitigatedProbability !== r.stockoutProbability ? ` (mitigated to ${r.mitigatedProbability}% with reorder)` : ""
              }`
          )
          .join("\n")}`
      : "AT-RISK PRODUCTS: none",
    `ENGINE RECOMMENDATION: ${result.recommendedAction.headline} — ${result.recommendedAction.detail}`,
  ].join("\n");
}

/** Plain-language explanation built from the numbers — used when the AI is unavailable. */
export function buildDeterministicExplanation(result: SimulationResult): string {
  const d = result.deltas;
  const knobs = summarizeForPrompt(result).split("\n")[0].replace("SCENARIO: ", "");
  const lines: string[] = [];

  lines.push(`**Scenario: ${knobs}**`);
  lines.push("");

  if (d.revenueImpact !== 0) {
    lines.push(
      d.revenueImpact > 0
        ? `Over the next ${result.horizonDays} days this scenario adds about **${formatUsd(d.revenueImpact)}** of revenue, moving you from ${formatUsd(result.before.revenue30d)} to ${formatUsd(result.after.revenue30d)}.`
        : `Over the next ${result.horizonDays} days this scenario costs you about **${formatUsd(Math.abs(d.revenueImpact))}** in revenue, mostly from sales lost to stockouts.`
    );
  } else {
    lines.push(`Revenue barely moves in this scenario (${formatUsd(result.before.revenue30d)} over ${result.horizonDays} days either way).`);
  }

  if (result.productsAtRisk.length) {
    lines.push(
      `Stockout risk rises: average probability goes from ${result.before.avgStockoutProbability}% to ${result.after.avgStockoutProbability}%, with **${result.productsAtRisk
        .slice(0, 3)
        .map((r) => shortLabel(r))
        .join(", ")}** most exposed${
        result.params.reorderQuantity > 0
          ? `. Your ${result.params.reorderQuantity}-unit reorder pulls those back down to roughly ${Math.round(
              result.productsAtRisk.reduce((s, r) => s + r.mitigatedProbability, 0) / result.productsAtRisk.length
            )}%.`
          : " and no reorder is modelled yet."
      }`
    );
  } else {
    lines.push(`No products hit a meaningful stockout risk in this scenario.`);
  }

  if (d.cashOutlay > 0) {
    lines.push(
      `Cash flow: buying the extra stock costs **${formatUsd(d.cashOutlay)}** up front and protects **${formatUsd(d.protectedRevenue)}** of revenue — a net ${d.netCashFlowImpact >= 0 ? "gain" : "cost"} of ${formatUsd(Math.abs(d.netCashFlowImpact))} in the first cycle.`
    );
  }

  lines.push("");
  lines.push(`**Recommended Next Action:** ${result.recommendedAction.headline}. ${result.recommendedAction.detail}`);
  lines.push(
    `**Expected Business Impact:** ${
      d.revenueImpact >= 0
        ? `protect and grow roughly ${formatUsd(Math.max(d.revenueImpact, d.protectedRevenue))} of revenue`
        : `avoid losing ${formatUsd(Math.abs(d.revenueImpact))} of revenue`
    }${d.cashOutlay > 0 ? ` for a ${formatUsd(d.cashOutlay)} stock investment` : ""}.`
  );

  return lines.join("\n");
}

export { COVER_CAP, BASE_LEAD_DAYS, HORIZON_DAYS };
