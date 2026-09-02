// Inventra AI — forecast reliability layer. Pure.
// Adds trust context to recommendations WITHOUT changing a single quantity,
// threshold or formula. Everything here is derived read-only from the analysis,
// the procurement result and (when it exists) sales-history variability.

import { LEAD_TIME_DAYS } from "./fmcg-rules";
import { shortLabel } from "./product-label";
import type {
  DataQuality,
  EvidenceConfidence,
  ForecastEvidence,
  ForecastSensitivity,
  InventoryAnalysis,
  ProcurementResult,
  ProcurementRow,
  SalesStability,
  SalesStat,
} from "./types";

const usd = (n: number) => `$${Math.round(n).toLocaleString()}`;
const r2 = (n: number) => Math.round(n * 100) / 100;

/* ------------------------------ stability ------------------------------ */

/** CV < 0.35 → stable · < 0.7 → moderate · ≥ 0.7 → volatile · no history → unknown. */
export function salesStability(dailySales: number, stat?: SalesStat): SalesStability {
  if (dailySales <= 0) {
    return { band: "unknown", note: "No sales recorded, so day-to-day stability can't be assessed." };
  }
  if (!stat || stat.cv === undefined) {
    return {
      band: "unknown",
      days: stat?.days ?? 0,
      note:
        "You imported a single daily-sales figure with no day-by-day history, so its stability can't be checked. Confidence is capped at Medium.",
    };
  }
  const cv = r2(stat.cv);
  if (cv < 0.35)
    return { band: "stable", coefficientOfVariation: cv, days: stat.days, note: `Daily sales varied little over ${stat.days} days (variation ${Math.round(cv * 100)}%).` };
  if (cv < 0.7)
    return { band: "moderate", coefficientOfVariation: cv, days: stat.days, note: `Daily sales varied moderately over ${stat.days} days (variation ${Math.round(cv * 100)}%).` };
  return { band: "volatile", coefficientOfVariation: cv, days: stat.days, note: `Daily sales were volatile over ${stat.days} days (variation ${Math.round(cv * 100)}%) — the recommendation is more uncertain.` };
}

/* ------------------------------ sensitivity ---------------------------- */

/** Recompute the suggested quantity at ±20% demand using the SAME formula.
 *  Display only — it never becomes the recommendation. */
export function reorderSensitivity(row: Pick<ProcurementRow, "targetCoverageDays" | "dailySales" | "stock">): ForecastSensitivity[] {
  const at = (f: number) => Math.max(0, Math.round(row.targetCoverageDays * row.dailySales * f - row.stock));
  return [
    { factorLabel: "Demand −20%", dailySales: r2(row.dailySales * 0.8), suggestedQuantity: at(0.8) },
    { factorLabel: "Demand +20%", dailySales: r2(row.dailySales * 1.2), suggestedQuantity: at(1.2) },
  ];
}

/* ------------------------------ confidence ---------------------------- */

const RANK: Record<EvidenceConfidence, number> = { High: 3, Medium: 2, Low: 1 };
const cap = (a: EvidenceConfidence, b: EvidenceConfidence): EvidenceConfidence =>
  RANK[a] <= RANK[b] ? a : b;

function reorderConfidence(
  row: ProcurementRow,
  stab: SalesStability,
  dq: DataQuality | undefined,
  catalogSize: number
): { confidence: EvidenceConfidence; reason: string } {
  const reasons: string[] = [];
  let c: EvidenceConfidence;

  if (stab.band === "stable") {
    c = "High";
    reasons.push("day-to-day sales have been stable");
  } else if (stab.band === "moderate") {
    c = "Medium";
    reasons.push("day-to-day sales vary moderately");
  } else if (stab.band === "volatile") {
    c = "Low";
    reasons.push("day-to-day sales are volatile");
  } else {
    c = "Medium";
    reasons.push("only a single daily-sales figure was imported (no history to check stability)");
  }

  // The quantity formula uses stock + sales only — cost missing doesn't lower it,
  // but the *purchase cost* figure is then unavailable.
  if (row.costPrice <= 0) reasons.push("no cost price imported, so the purchase-cost figure is unavailable");

  if (row.dailySales > 0 && row.dailySales < 0.5) {
    c = cap(c, "Medium");
    reasons.push("sales are under 0.5 units/day, so a small change moves the answer a lot");
  }

  // Velocity assigned by catalogue percentile (not the absolute ≥5 / <0.3 rule) in a small catalogue
  const absoluteBand = row.dailySales >= 5 || row.dailySales < 0.3;
  if (!absoluteBand && catalogSize < 8) {
    c = cap(c, "Medium");
    reasons.push("the velocity class comes from ranking against a small catalogue");
  }

  if (dq && dq.hasSalesData && dq.productsWithoutSales > 0 && !absoluteBand) {
    // percentile ranking is skewed when many products have zero sales
    reasons.push("some products have no sales, which can skew the velocity ranking");
  }

  return {
    confidence: c,
    reason: `Confidence ${c} — ${reasons.join("; ")}.`,
  };
}

/* ----------------------------- assumptions ---------------------------- */

const REORDER_INVALIDATION = [
  "sales rise or fall by more than ~20% (see the sensitivity figures)",
  "the supplier lead time changes",
  "a promotion or seasonal event shifts demand during the coverage window",
  "the imported stock or daily-sales figures are inaccurate",
];

const REVENUE_AT_RISK_ASSUMPTIONS = [
  "sales continue at the current daily rate",
  "the exposure is measured over a 30-day horizon",
  "no restock arrives before the product would run out",
];
const REVENUE_AT_RISK_INVALIDATION = [
  "sales slow down (this overstates the risk)",
  "sales speed up (this understates the risk)",
  "you reorder in time to avoid the stockout",
  "the imported stock figure is wrong",
];

const OPPORTUNITY_ASSUMPTIONS = [
  "ordering ~25% more of this line actually sells ~25% more",
  "there is unmet demand for the product",
  "the current unit margin holds",
];
const OPPORTUNITY_INVALIDATION = [
  "demand for the product is already saturated",
  "the extra stock sits unsold and ties up cash",
  "the supplier price or your selling price changes the margin",
];

const SIMULATOR_ASSUMPTIONS = [
  "this is a hypothetical scenario you configured — not a prediction",
  "it is modelled against your real current stock and sales",
  "stockout probability is a planning estimate from days of cover vs. lead time",
];
const SIMULATOR_INVALIDATION = [
  "real demand differs from the scenario inputs you chose",
  "the volatility allowance in the model is approximate",
  "lead time or supplier behaviour differs from the assumption",
];

/* ------------------------------- builders ---------------------------- */

export function buildForecastEvidence(
  analysis: InventoryAnalysis,
  procurement: ProcurementResult,
  stats: Map<string, SalesStat>
): Record<string, ForecastEvidence> {
  const dq = analysis.dataQuality;
  const catalogSize = analysis.products.length;
  const out: Record<string, ForecastEvidence> = {};

  for (const row of procurement.rows) {
    if (row.suggestedQuantity <= 0) continue; // only lines that carry a recommendation
    const stab = salesStability(row.dailySales, stats.get(row.id));
    const { confidence, reason } = reorderConfidence(row, stab, dq, catalogSize);

    out[row.id] = {
      recommendationType: "reorder",
      confidence,
      confidenceReason: reason,
      formula: row.explanation.formula,
      inputs: [
        `Daily sales: ${row.explanation.dailySales}/day (from your import${stab.days ? `, ${stab.days} days of history` : ", no history"})`,
        `Current stock: ${row.stock} (from your import)`,
        `Coverage target: ${row.targetCoverageDays} days (${row.velocity} mover)`,
        row.costPrice > 0 ? `Unit cost: ${usd(row.costPrice)} (from your import)` : `Unit cost: not provided`,
      ],
      assumptions: [
        `Daily sales stay near the current average of ${row.explanation.dailySales}/day`,
        `Supplier lead time stays ${LEAD_TIME_DAYS} days`,
        `No promotion or seasonal spike changes demand within the ${row.targetCoverageDays}-day window`,
        `The imported stock figure (${row.stock}) is accurate`,
      ],
      sensitivity: reorderSensitivity(row),
      reliabilityFactors: REORDER_INVALIDATION,
      salesStability: stab,
    };
  }
  return out;
}

/** Static reliability context for the non-quantity recommendation types. */
export function revenueAtRiskEvidence(analysis: InventoryAnalysis): ForecastEvidence {
  const dq = analysis.dataQuality;
  const confidence: EvidenceConfidence = !dq?.hasSalesData ? "Low" : "Medium";
  return {
    recommendationType: "revenue-at-risk",
    confidence,
    confidenceReason:
      "Confidence Medium — this is a projection that assumes the current sales rate simply continues; it is not a measured trend.",
    inputs: [
      "Per product: min(days of cover, 30) × daily sales × selling price",
      `Summed across ${analysis.summary.atRiskWithinWeek} at-risk products`,
    ],
    assumptions: REVENUE_AT_RISK_ASSUMPTIONS,
    sensitivity: [],
    reliabilityFactors: REVENUE_AT_RISK_INVALIDATION,
  };
}

export function opportunityEvidence(): ForecastEvidence {
  return {
    recommendationType: "opportunity",
    confidence: "Medium",
    confidenceReason:
      "Confidence Medium — the figure comes from a modelled +25% order uplift, not a measured trend. Treat it as an upper-bound opportunity, not a forecast.",
    inputs: [
      "extra weekly units (≈25% of current) × unit margin × 4 weeks",
    ],
    assumptions: OPPORTUNITY_ASSUMPTIONS,
    sensitivity: [],
    reliabilityFactors: OPPORTUNITY_INVALIDATION,
  };
}

export function simulatorEvidence(horizonDays: number): ForecastEvidence {
  return {
    recommendationType: "simulator",
    confidence: "Low",
    confidenceReason:
      "Not a prediction — a hypothetical scenario you configured, modelled against your real inventory. Use it to compare options, not to forecast.",
    inputs: [`Your scenario sliders, applied to real stock and sales over ${horizonDays} days`],
    assumptions: SIMULATOR_ASSUMPTIONS,
    sensitivity: [],
    reliabilityFactors: SIMULATOR_INVALIDATION,
  };
}

/** Compact block for the Copilot prompt so AI answers carry the caveat too. */
export function forecastEvidenceForPrompt(map: Record<string, ForecastEvidence>, analysis: InventoryAnalysis): string {
  const rows = Object.entries(map).slice(0, 8);
  if (rows.length === 0) return "- no reorder recommendations to qualify";
  const line = (pid: string, fe: ForecastEvidence) => {
    const p = analysis.products.find((x) => x.id === pid);
    const name = p ? shortLabel(p) : pid;
    const s = fe.sensitivity.map((x) => `${x.factorLabel} → ${x.suggestedQuantity}`).join(", ");
    return `- ${name}: forecast confidence ${fe.confidence} (${fe.salesStability?.band ?? "unknown"} sales). Sensitivity: ${s}. Key assumption: sales stay near current rate.`;
  };
  return rows.map(([pid, fe]) => line(pid, fe)).join("\n");
}

export { LEAD_TIME_DAYS };
