// Inventra AI — Business Brief generator (Feature 3).
// Builds an executive consulting brief from the analysis. Uses DeepSeek when a
// key is configured; always falls back to a deterministic brief.

import { money } from "./format";
import { AI_MODEL, getAIClient, isAIConfigured } from "./ai";
import { healthLabel } from "./analysis";
import { contextLabel, shortLabel } from "./product-label";
import type {
  BusinessBrief,
  CriticalRisk,
  InventoryAnalysis,
  Priority,
  ProductAnalysis,
  RecommendedAction,
  RevenueOpportunity,
  RiskLevel,
} from "./types";

const PRIORITY_BY_RISK: Record<RiskLevel, Priority> = {
  Critical: "CRITICAL",
  High: "HIGH",
  Medium: "MEDIUM",
  Low: "LOW",
  None: "LOW",
};

function usd(n: number): string {
  return money(n);
}

function roundDays(n: number): number {
  return Number.isFinite(n) ? Math.max(0, Math.round(n * 10) / 10) : 0;
}

/* ----------------------------- deterministic ----------------------------- */

export function buildDeterministicBrief(analysis: InventoryAnalysis): BusinessBrief {
  const { products, summary, healthScore } = analysis;
  const atRisk = products.filter(
    (p) => p.riskLevel === "Critical" || p.riskLevel === "High"
  );

  const executiveSummary = buildExecutiveSummary(analysis);

  const criticalRisks: CriticalRisk[] = atRisk
    .slice(0, 6)
    .map((p) => ({
      product: shortLabel(p),
      daysRemaining: roundDays(p.daysRemaining),
      revenueAtRisk: Math.round(p.estimatedRevenueAtRisk),
      priority: PRIORITY_BY_RISK[p.riskLevel],
    }));

  const revenueOpportunities = buildOpportunities(products);

  const recommendedActions: RecommendedAction[] = [
    ...atRisk.slice(0, 5).map<RecommendedAction>((p) => ({
      priority: PRIORITY_BY_RISK[p.riskLevel],
      action: `Reorder ${shortLabel(p)}`,
      reason:
        p.riskLevel === "Critical"
          ? `Stockout expected within ${roundDays(p.daysRemaining)} days at ${p.dailySales}/day.`
          : `Only ${roundDays(p.daysRemaining)} days of cover left at current sales velocity.`,
      expectedImpact: `Protect ${usd(p.estimatedRevenueAtRisk)} of revenue.`,
    })),
    ...products
      .filter((p) => p.dailySales === 0 && p.inventoryValue > 0)
      .sort((a, b) => b.inventoryValue - a.inventoryValue)
      .slice(0, 2)
      .map<RecommendedAction>((p) => ({
        priority: "LOW",
        action: `Discount or bundle ${shortLabel(p)}`,
        reason: `No recent sales — ${usd(p.inventoryValue)} of capital is tied up in dead stock.`,
        expectedImpact: `Free up ${usd(p.inventoryValue)} in working capital.`,
      })),
  ];

  if (recommendedActions.length === 0) {
    recommendedActions.push({
      priority: "LOW",
      action: "Maintain current ordering cadence",
      reason: "No products are at risk of stocking out and inventory is well balanced.",
      expectedImpact: "Sustain current revenue with no added holding cost.",
    });
  }

  return {
    generatedAt: new Date().toISOString(),
    source: "deterministic",
    executiveSummary,
    criticalRisks,
    revenueOpportunities,
    recommendedActions,
    healthScore,
    healthLabel: healthLabel(healthScore),
    healthExplanation: summary.explanation,
  };
}

function buildExecutiveSummary(analysis: InventoryAnalysis): string {
  const { summary, products } = analysis;
  if (summary.totalProducts === 0) {
    return "No product data has been imported yet. Upload your catalog to receive a business brief.";
  }
  const health =
    analysis.healthScore >= 70
      ? "Your inventory is generally healthy"
      : analysis.healthScore >= 55
      ? "Your inventory is holding up but needs attention"
      : "Your inventory is carrying significant risk";

  if (summary.atRiskWithinWeek === 0) {
    return `${health}. None of your ${summary.totalProducts} products are projected to run out within the next week, and about ${usd(
      summary.totalInventoryValue
    )} of stock is on hand. Focus this week on the growth opportunities below rather than firefighting.`;
  }

  const topNames = products
    .filter((p) => p.riskLevel === "Critical" || p.riskLevel === "High")
    .slice(0, 3)
    .map((p) => shortLabel(p));
  const namePhrase =
    topNames.length > 0 ? ` — most urgently ${topNames.join(", ")}` : "";

  return `${health}, but ${summary.atRiskWithinWeek} product${
    summary.atRiskWithinWeek > 1 ? "s are" : " is"
  } projected to run out within the next week${namePhrase}, placing approximately ${usd(
    summary.totalRevenueAtRisk
  )} of revenue at risk. Acting on the reorders below protects that revenue; the opportunities section shows where to grow once the risks are covered.`;
}

function buildOpportunities(products: ProductAnalysis[]): RevenueOpportunity[] {
  const healthyMovers = products
    .filter(
      (p) =>
        p.dailySales > 0 &&
        p.unitMargin > 0 &&
        (p.riskLevel === "Low" || p.riskLevel === "Medium")
    )
    .sort((a, b) => b.dailySales * b.unitMargin - a.dailySales * a.unitMargin)
    .slice(0, 3);

  return healthyMovers.map((p) => {
    const weeklyUnits = Math.round(p.dailySales * 7);
    const upliftUnits = Math.max(1, Math.round(weeklyUnits * 0.25));
    const impact = Math.round(upliftUnits * p.unitMargin * 4); // ~monthly margin uplift
    return {
      title: `Grow ${shortLabel(p)}`,
      observation: `${shortLabel(p)} sells ${p.dailySales}/day at a ${usd(p.unitMargin)} unit margin and is not at stockout risk — demand is steady and under-served.`,
      recommendedAction: `Increase order quantity by ~25% (about ${upliftUnits} more units/week) and give it more shelf space.`,
      expectedRevenueImpact: impact,
    };
  });
}

/* --------------------------------- AI ---------------------------------- */

const BRIEF_SYSTEM = `You are Inventra AI, an inventory advisor for an FMCG business (distributor / mini-mart / retail grocery).
You are handed a computed inventory analysis where each product has a velocity class (fast / medium / slow mover)
and a rule-based action (Reorder · Reduce · Monitor · Opportunity). Write a concise, confident consulting brief
that uses those signals — protect fast movers, clear slow movers, note category patterns, talk in days of cover
and units/cartons.
Return ONLY a strict JSON object (no markdown, no code fences) of this exact shape:
{
  "executiveSummary": string (2-4 sentences, reference real product names and dollar figures),
  "criticalRisks": [ { "product": string, "daysRemaining": number, "revenueAtRisk": number, "priority": "CRITICAL"|"HIGH"|"MEDIUM"|"LOW" } ],
  "revenueOpportunities": [ { "title": string, "observation": string, "recommendedAction": string, "expectedRevenueImpact": number } ],
  "recommendedActions": [ { "priority": "CRITICAL"|"HIGH"|"MEDIUM"|"LOW", "action": string, "reason": string, "expectedImpact": string } ]
}
Base every number on the data provided. Keep 1-6 items per array. Do not invent products.
Products show the owner's ORIGINAL name then a [canonical: …] English name. Reason on the canonical
name, but write the ORIGINAL name + SKU in every field, e.g. "កូកាកូឡា 330ml (SKU BEV-001)". Never translate it.`;

function buildContext(analysis: InventoryAnalysis): string {
  const lines = analysis.products
    .slice(0, 40)
    .map(
      (p) =>
        `- ${contextLabel(p)} (${p.category}) | stock ${p.stock} | ${p.dailySales}/day | price ${usd(
          p.sellingPrice
        )} cost ${usd(p.costPrice)} | days left ${
          Number.isFinite(p.daysRemaining) ? p.daysRemaining.toFixed(1) : "30+"
        } | risk ${p.riskLevel} | revenue at risk ${usd(p.estimatedRevenueAtRisk)}`
    )
    .join("\n");

  return `BUSINESS: ${analysis.business}
HEALTH SCORE: ${analysis.healthScore}/100 (${analysis.summary.healthLabel})
SUMMARY: ${analysis.summary.totalProducts} products, ${analysis.summary.criticalCount} critical, ${analysis.summary.atRiskWithinWeek} at risk within a week, ${usd(
    analysis.summary.totalRevenueAtRisk
  )} total revenue at risk, ${usd(analysis.summary.totalInventoryValue)} inventory value.
PRODUCTS:
${lines}`;
}

function coercePriority(v: unknown): Priority {
  const s = String(v ?? "").toUpperCase();
  return s === "CRITICAL" || s === "HIGH" || s === "MEDIUM" || s === "LOW" ? s : "MEDIUM";
}

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function parseBriefJSON(text: string): Partial<BusinessBrief> | null {
  const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) return null;
  let obj: Record<string, unknown>;
  try {
    obj = JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    return null;
  }

  const criticalRisks: CriticalRisk[] = Array.isArray(obj.criticalRisks)
    ? (obj.criticalRisks as unknown[])
        .filter((r): r is Record<string, unknown> => !!r && typeof r === "object")
        .map((r) => ({
          product: String(r.product ?? "").trim(),
          daysRemaining: num(r.daysRemaining),
          revenueAtRisk: num(r.revenueAtRisk),
          priority: coercePriority(r.priority),
        }))
        .filter((r) => r.product)
    : [];

  const revenueOpportunities: RevenueOpportunity[] = Array.isArray(obj.revenueOpportunities)
    ? (obj.revenueOpportunities as unknown[])
        .filter((r): r is Record<string, unknown> => !!r && typeof r === "object")
        .map((r) => ({
          title: String(r.title ?? "").trim(),
          observation: String(r.observation ?? "").trim(),
          recommendedAction: String(r.recommendedAction ?? "").trim(),
          expectedRevenueImpact: num(r.expectedRevenueImpact),
        }))
        .filter((r) => r.title || r.observation)
    : [];

  const recommendedActions: RecommendedAction[] = Array.isArray(obj.recommendedActions)
    ? (obj.recommendedActions as unknown[])
        .filter((r): r is Record<string, unknown> => !!r && typeof r === "object")
        .map((r) => ({
          priority: coercePriority(r.priority),
          action: String(r.action ?? "").trim(),
          reason: String(r.reason ?? "").trim(),
          expectedImpact: String(r.expectedImpact ?? "").trim(),
        }))
        .filter((r) => r.action)
    : [];

  const executiveSummary = String(obj.executiveSummary ?? "").trim();
  if (!executiveSummary && recommendedActions.length === 0) return null;

  return { executiveSummary, criticalRisks, revenueOpportunities, recommendedActions };
}

export async function generateBrief(analysis: InventoryAnalysis): Promise<BusinessBrief> {
  const fallback = buildDeterministicBrief(analysis);
  if (!isAIConfigured() || analysis.products.length === 0) return fallback;

  try {
    const ai = getAIClient();
    const completion = await ai.chat.completions.create({
      model: AI_MODEL,
      temperature: 0.4,
      messages: [
        { role: "system", content: BRIEF_SYSTEM },
        { role: "user", content: buildContext(analysis) },
      ],
    });
    const text = completion.choices[0]?.message?.content ?? "";
    const parsed = parseBriefJSON(text);
    if (!parsed) return fallback;

    return {
      generatedAt: new Date().toISOString(),
      source: "ai",
      executiveSummary: parsed.executiveSummary || fallback.executiveSummary,
      criticalRisks:
        parsed.criticalRisks && parsed.criticalRisks.length > 0
          ? parsed.criticalRisks
          : fallback.criticalRisks,
      revenueOpportunities:
        parsed.revenueOpportunities && parsed.revenueOpportunities.length > 0
          ? parsed.revenueOpportunities
          : fallback.revenueOpportunities,
      recommendedActions:
        parsed.recommendedActions && parsed.recommendedActions.length > 0
          ? parsed.recommendedActions
          : fallback.recommendedActions,
      healthScore: analysis.healthScore,
      healthLabel: fallback.healthLabel,
      healthExplanation: fallback.healthExplanation,
    };
  } catch (err) {
    console.error("[generateBrief] AI error", err);
    return fallback;
  }
}
