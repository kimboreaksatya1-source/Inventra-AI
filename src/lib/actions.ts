// Inventra AI — AI Action Center aggregation engine (Phase 4).
// Pure. Merges the outputs of the Analysis, Revenue Risk, Brief and Simulator
// engines into one de-duplicated, prioritized action list. No new analysis here.

import type { AnalysisInput } from "./analysis";
import { suggestedOrderQuantity } from "./inventory";
import { shortLabel } from "./product-label";
import { simulateScenario } from "./simulator";
import type {
  BusinessAction,
  BusinessBrief,
  InventoryAnalysis,
  Priority,
} from "./types";

const PRIORITY_RANK: Record<Priority, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

const usd = (n: number) => `$${Math.round(n).toLocaleString()}`;

function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

type Draft = Omit<BusinessAction, "status" | "note">;

export interface GenerateActionsInput {
  products: AnalysisInput[];
  analysis: InventoryAnalysis;
  brief: BusinessBrief;
}

export function generateActions({ products, analysis, brief }: GenerateActionsInput): Draft[] {
  const drafts: Draft[] = [];

  /* 1 — reorder / stockout risk (Analysis + Revenue Risk) */
  for (const p of analysis.products) {
    if (p.riskLevel !== "Critical" && p.riskLevel !== "High") {
      if (!(p.riskLevel === "Medium" && p.estimatedRevenueAtRisk >= 25)) continue;
    }
    const qty = suggestedOrderQuantity(p.dailySales, p.stock);
    const priority: Priority =
      p.riskLevel === "Critical" ? "CRITICAL" : p.riskLevel === "High" ? "HIGH" : "MEDIUM";
    const days = Number.isFinite(p.daysRemaining) ? p.daysRemaining.toFixed(1) : "30+";
    drafts.push({
      key: `reorder:${p.id}`,
      priority,
      category: "reorder",
      recommendation: `Reorder ${shortLabel(p)}${qty > 0 ? ` — ${qty} units` : ""}`,
      reason: `${days} days of stock left at ${p.dailySales}/day. ${usd(p.estimatedRevenueAtRisk)} of sales is exposed if it runs out.`,
      expectedImpact: `Protect ${usd(p.estimatedRevenueAtRisk)} of revenue`,
      impactValue: Math.round(p.estimatedRevenueAtRisk),
      confidence: priority === "CRITICAL" ? 92 : priority === "HIGH" ? 85 : 72,
      source: ["Analysis", "Revenue Risk"],
      productId: p.id,
    });
  }

  /* 2 — revenue opportunities (Business Brief) */
  for (const o of brief.revenueOpportunities) {
    const impact = Math.round(o.expectedRevenueImpact);
    drafts.push({
      key: `opportunity:${slug(o.title)}`,
      priority: impact >= 50 ? "MEDIUM" : "LOW",
      category: "opportunity",
      recommendation: o.recommendedAction || o.title,
      reason: o.observation,
      expectedImpact: `Capture ${usd(impact)} of additional revenue`,
      impactValue: impact,
      confidence: 65,
      source: ["Business Brief"],
    });
  }

  /* 3 — cash flow: dead / overstock capital (Analysis) */
  const deadStock = analysis.products
    .filter(
      (p) =>
        (p.dailySales === 0 && p.stock > 0) ||
        (Number.isFinite(p.daysRemaining) && p.daysRemaining > 45)
    )
    .sort((a, b) => b.inventoryValue - a.inventoryValue)
    .slice(0, 2);
  for (const p of deadStock) {
    drafts.push({
      key: `cashflow:${p.id}`,
      priority: "LOW",
      category: "cashflow",
      recommendation: `Discount or bundle ${shortLabel(p)}`,
      reason:
        p.dailySales === 0
          ? `No recent sales — ${usd(p.inventoryValue)} of capital is tied up in ${shortLabel(p)}.`
          : `${Math.round(p.daysRemaining)} days of cover — ${usd(p.inventoryValue)} of capital is sitting idle.`,
      expectedImpact: `Free up ${usd(p.inventoryValue)} of working capital`,
      impactValue: Math.round(p.inventoryValue),
      confidence: 60,
      source: ["Analysis"],
      productId: p.id,
    });
  }

  /* 4 — forward-looking scenarios (Simulator) */
  const criticalIds = new Set(
    drafts.filter((d) => d.priority === "CRITICAL" && d.productId).map((d) => d.productId!)
  );

  const growth = simulateScenario(products, { demandGrowthPct: 20 });
  const growthTop = growth.productsAtRisk.filter((r) => !criticalIds.has(r.id)).slice(0, 2);
  for (const r of growthTop) {
    const atRisk = Math.abs(r.revenueImpact) || 40;
    drafts.push({
      key: `scenario:demand:${r.id}`,
      priority: r.stockoutProbability >= 60 ? "HIGH" : "MEDIUM",
      category: "scenario",
      recommendation: `Pre-order ${shortLabel(r)} before demand climbs`,
      reason: `If demand rises 20%, ${shortLabel(r)}'s stockout probability jumps to ${r.stockoutProbability}% and cover drops to ${r.coverAfter} days. Roughly ${usd(atRisk)} of sales would be at risk.`,
      expectedImpact: `Protect ${usd(atRisk)} against a demand spike`,
      impactValue: Math.round(atRisk),
      confidence: 58,
      source: ["Simulator"],
      productId: r.id,
    });
  }

  const delay = simulateScenario(products, { supplierDelayDays: 10 });
  const delayTop = delay.productsAtRisk
    .filter((r) => !criticalIds.has(r.id) && !growthTop.some((g) => g.id === r.id))
    .slice(0, 1);
  for (const r of delayTop) {
    const atRisk = Math.abs(r.revenueImpact) || 40;
    drafts.push({
      key: `scenario:delay:${r.id}`,
      priority: "MEDIUM",
      category: "scenario",
      recommendation: `Bring the ${shortLabel(r)} order forward ~10 days`,
      reason: `A 10-day supplier delay would leave ${shortLabel(r)} short — stockout probability ${r.stockoutProbability}%. Order early or line up a backup supplier.`,
      expectedImpact: `Protect ${usd(atRisk)} from supply disruption`,
      impactValue: Math.round(atRisk),
      confidence: 55,
      source: ["Simulator"],
      productId: r.id,
    });
  }

  return dedupe(drafts).sort(
    (a, b) =>
      PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] ||
      b.impactValue - a.impactValue ||
      b.confidence - a.confidence
  );
}

function dedupe(drafts: Draft[]): Draft[] {
  const byKey = new Map<string, Draft>();
  for (const d of drafts) {
    const existing = byKey.get(d.key);
    if (!existing) {
      byKey.set(d.key, d);
      continue;
    }
    byKey.set(d.key, {
      ...existing,
      priority:
        PRIORITY_RANK[d.priority] < PRIORITY_RANK[existing.priority] ? d.priority : existing.priority,
      confidence: Math.max(existing.confidence, d.confidence),
      impactValue:
        Math.abs(d.impactValue) > Math.abs(existing.impactValue)
          ? d.impactValue
          : existing.impactValue,
      reason: d.reason.length > existing.reason.length ? d.reason : existing.reason,
      source: Array.from(new Set([...existing.source, ...d.source])),
    });
  }
  return [...byKey.values()];
}

/** Aggregate counts + a compact text block for the AI briefing prompt. */
export function summarizeActions(actions: Draft[]) {
  const by = (p: Priority) => actions.filter((a) => a.priority === p);
  const critical = by("CRITICAL");
  const high = by("HIGH");
  const totalRevenueAtStake = actions
    .filter((a) => a.category !== "opportunity")
    .reduce((s, a) => s + a.impactValue, 0);
  const totalOpportunity = actions
    .filter((a) => a.category === "opportunity")
    .reduce((s, a) => s + a.impactValue, 0);

  const lines = [
    `ACTION LIST: ${critical.length} critical, ${high.length} high, ${by("MEDIUM").length} medium, ${by("LOW").length} low.`,
    `Revenue at stake across open risks: ${usd(totalRevenueAtStake)}. Growth opportunities on the table: ${usd(totalOpportunity)}.`,
    "TOP ACTIONS:",
    ...actions.slice(0, 6).map((a) => `- [${a.priority}] ${a.recommendation} — ${a.reason}`),
  ];
  return {
    critical: critical.length,
    high: high.length,
    medium: by("MEDIUM").length,
    low: by("LOW").length,
    totalRevenueAtStake: Math.round(totalRevenueAtStake),
    totalOpportunity: Math.round(totalOpportunity),
    text: lines.join("\n"),
  };
}

export function buildDeterministicBriefing(summary: ReturnType<typeof summarizeActions>): string {
  if (summary.critical + summary.high + summary.medium + summary.low === 0) {
    return "Nothing urgent today. Your inventory is balanced and no products are at stockout risk — a good week to focus on growth rather than firefighting.";
  }
  const lead =
    summary.critical > 0
      ? `${summary.critical} critical action${summary.critical > 1 ? "s" : ""} that need${summary.critical > 1 ? "" : "s"} attention today`
      : summary.high > 0
      ? `${summary.high} high-priority action${summary.high > 1 ? "s" : ""} to work through`
      : `a handful of medium-priority moves to consider`;
  return `You have ${lead}. About ${usd(summary.totalRevenueAtStake)} of revenue is exposed across open risks${
    summary.totalOpportunity > 0 ? `, with roughly ${usd(summary.totalOpportunity)} of growth opportunity alongside it` : ""
  }. Start at the top of the list — the critical items protect the most revenue for the least effort.`;
}
