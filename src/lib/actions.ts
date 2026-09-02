// Inventra AI — AI Action Center aggregation engine (Phase 4).
// Pure. Merges the outputs of the Analysis, Revenue Risk, Brief and Simulator
// engines into one de-duplicated, prioritized action list. No new analysis here.

import { money } from "./format";
import type { AnalysisInput } from "./analysis";
import { buildProcurement } from "./procurement";
import { shortLabel } from "./product-label";
import { simulateScenario } from "./simulator";
import type {
  BusinessAction,
  BusinessBrief,
  InventoryAnalysis,
  Priority,
  ProcurementRow,
} from "./types";

const PRIORITY_RANK: Record<Priority, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

/** Procurement priority ("Critical"…) → Action Center priority ("CRITICAL"…). */
const PROC_PRIORITY: Record<ProcurementRow["priority"], Priority> = {
  Critical: "CRITICAL",
  High: "HIGH",
  Medium: "MEDIUM",
  Low: "LOW",
};

const usd = (n: number) => money(n);
const round1 = (n: number) => Math.round(n * 10) / 10;

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

  /* The Procurement Engine is the ONE source of truth for every reorder number
     (suggested quantity, priority, target coverage, explanation). This module
     only decides WHICH products surface as an action — it never recalculates a
     quantity or a priority of its own. */
  const procurement = buildProcurement(analysis);
  const procByProduct = new Map(procurement.rows.map((r) => [r.id, r]));

  /* 1 — reorder / stockout risk (Analysis + Revenue Risk + Procurement) */
  for (const p of analysis.products) {
    if (p.riskLevel !== "Critical" && p.riskLevel !== "High") {
      if (!(p.riskLevel === "Medium" && p.estimatedRevenueAtRisk >= 25)) continue;
    }
    const proc = procByProduct.get(p.id);
    const qty = proc?.suggestedQuantity ?? 0;
    // Procurement owns the priority whenever it recommends an order; otherwise
    // this is a covered-but-watch item and we keep the stockout-risk level.
    const priority: Priority =
      qty > 0 && proc
        ? PROC_PRIORITY[proc.priority]
        : p.riskLevel === "Critical"
        ? "CRITICAL"
        : p.riskLevel === "High"
        ? "HIGH"
        : "MEDIUM";
    const coverDays = Number.isFinite(p.daysRemaining) ? Math.max(0, Math.round(p.daysRemaining)) : null;
    const marginPortion = p.sellingPrice > 0 ? Math.max(0, p.unitMargin) / p.sellingPrice : 0;
    const marginImpact = Math.round(p.estimatedRevenueAtRisk * marginPortion);
    const reasons = [
      `${p.stock} units in stock`,
      `Selling ${round1(p.dailySales)}/day`,
      coverDays !== null ? `Out in ~${coverDays} day${coverDays === 1 ? "" : "s"}` : "Comfortable cover for now",
      qty > 0 ? `Suggested order: ${qty} units` : null,
    ].filter(Boolean) as string[];
    drafts.push({
      key: `reorder:${p.id}`,
      priority,
      category: "reorder",
      recommendation: `Reorder ${shortLabel(p)}${qty > 0 ? ` — ${qty} units` : ""}`,
      reason: `${coverDays ?? "30+"} days of stock left at ${round1(p.dailySales)}/day. ${usd(p.estimatedRevenueAtRisk)} of sales is exposed if it runs out.`,
      reasons,
      triggeredBy:
        p.riskLevel === "Critical"
          ? `Stock coverage (${coverDays ?? "?"}d) is below the 3-day critical threshold`
          : p.riskLevel === "High"
          ? `Stock coverage (${coverDays ?? "?"}d) is below the 7-day warning threshold`
          : `${usd(p.estimatedRevenueAtRisk)} of revenue is at risk — above the $25 attention threshold`,
      expectedImpact:
        marginImpact > 0
          ? `Protect ${usd(p.estimatedRevenueAtRisk)} sales / ~${usd(marginImpact)} margin`
          : `Protect ${usd(p.estimatedRevenueAtRisk)} of sales`,
      impactValue: Math.round(p.estimatedRevenueAtRisk),
      marginImpact,
      confidence: priority === "CRITICAL" ? 90 : priority === "HIGH" ? 80 : 68,
      source: qty > 0 ? ["Analysis", "Revenue Risk", "Procurement"] : ["Analysis", "Revenue Risk"],
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
      reasons: [o.observation, `Modelled upside ~${usd(impact)}/month`].filter(Boolean),
      triggeredBy: "A fast-moving, healthy-margin product with room to grow orders",
      expectedImpact: `Modelled margin upside ${usd(impact)} (~25% more orders)`,
      impactValue: impact,
      confidence: 60,
      source: ["Business Brief"],
    });
  }

  /* 3 — overstock / dead stock: "what should I stop ordering" (survey's #1 loss).
     Only genuinely stuck stock — a fast mover a few days over target is not a
     "stop ordering" call. Rank by capital locked × how far over target it is. */
  const overTarget = (p: (typeof analysis.products)[number]) =>
    p.velocity === "Fast" ? 21 : p.velocity === "Medium" ? 30 : 45;
  const overstock = analysis.products
    .filter(
      (p) =>
        (p.dailySales === 0 && p.stock > 0) ||
        (Number.isFinite(p.daysRemaining) && p.daysRemaining > overTarget(p) * 3)
    )
    .map((p) => ({
      p,
      severity:
        p.inventoryValue *
        (p.dailySales === 0 ? 6 : Math.min(6, p.daysRemaining / overTarget(p))),
    }))
    .sort((a, b) => b.severity - a.severity)
    .slice(0, 4)
    .map((x) => x.p);
  for (const p of overstock) {
    const dead = p.dailySales === 0;
    const coverDays = Number.isFinite(p.daysRemaining) ? Math.round(p.daysRemaining) : null;
    const target = p.velocity === "Fast" ? 21 : p.velocity === "Medium" ? 30 : 45;
    const pauseWeeks =
      dead || coverDays === null ? 8 : Math.max(3, Math.min(12, Math.round((coverDays - target) / 7)));
    const locked = Math.round(p.inventoryValue);
    const priority: Priority = locked >= 500 ? "HIGH" : locked >= 150 ? "MEDIUM" : "LOW";
    const months = coverDays !== null ? Math.round(coverDays / 30) : null;
    drafts.push({
      key: `overstock:${p.id}`,
      priority,
      category: "cashflow",
      recommendation: `Stop ordering ${shortLabel(p)}`,
      reason: dead
        ? `No recent sales — ${usd(locked)} of capital is frozen in ${shortLabel(p)}.`
        : `${coverDays} days of stock at ${round1(p.dailySales)}/day — ${usd(locked)} of capital is sitting idle.`,
      reasons: [
        dead
          ? "No sales in the imported period"
          : `${months && months >= 2 ? `~${months} months` : `${coverDays} days`} of stock on hand`,
        dead ? "Dead stock — nothing moving" : `Only selling ${round1(p.dailySales)}/day`,
        `${usd(locked)} of cash locked in it`,
      ],
      triggeredBy: dead
        ? "Zero sales with stock still on hand — flagged as dead stock"
        : `${coverDays} days of cover is more than 3× the ${target}-day target for a ${p.velocity.toLowerCase()} mover`,
      expectedImpact: `Free ${usd(locked)} of working capital · pause ordering ~${pauseWeeks} weeks`,
      impactValue: locked,
      confidence: dead ? 78 : 66,
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
    // Only surface this when the simulator produced a real dollar figure.
    const atRisk = Math.round(Math.abs(r.revenueImpact));
    if (atRisk <= 0) continue;
    drafts.push({
      key: `scenario:demand:${r.id}`,
      priority: r.stockoutProbability >= 60 ? "HIGH" : "MEDIUM",
      category: "scenario",
      recommendation: `Pre-order ${shortLabel(r)} before demand climbs`,
      reason: `If demand rises 20%, ${shortLabel(r)}'s stockout probability jumps to ${r.stockoutProbability}% and cover drops to ${r.coverAfter} days. Roughly ${usd(atRisk)} of sales would be at risk.`,
      reasons: [`Stockout probability ${r.stockoutProbability}% if demand rises 20%`, `Cover drops to ${r.coverAfter} days`],
      triggeredBy: "Demand-growth scenario (+20%) run by the Simulator",
      expectedImpact: `Protect ${usd(atRisk)} against a demand spike`,
      impactValue: atRisk,
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
    const atRisk = Math.round(Math.abs(r.revenueImpact));
    if (atRisk <= 0) continue;
    drafts.push({
      key: `scenario:delay:${r.id}`,
      priority: "MEDIUM",
      category: "scenario",
      recommendation: `Bring the ${shortLabel(r)} order forward ~10 days`,
      reason: `A 10-day supplier delay would leave ${shortLabel(r)} short — stockout probability ${r.stockoutProbability}%. Order early or line up a backup supplier.`,
      reasons: [`10-day supplier delay → stockout probability ${r.stockoutProbability}%`, "Order early or line up a backup supplier"],
      triggeredBy: "Supplier-delay scenario (10 days) run by the Simulator",
      expectedImpact: `Protect ${usd(atRisk)} from supply disruption`,
      impactValue: atRisk,
      confidence: 55,
      source: ["Simulator"],
      productId: r.id,
    });
  }

  return dedupe(drafts)
    // Speculative "what-if" actions read as unfinished — keep them out of the
    // Action Center and the dashboard. The Simulator page still runs them live.
    .filter((d) => d.category !== "scenario")
    .sort(
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
      reasons: d.reasons.length >= existing.reasons.length ? d.reasons : existing.reasons,
      triggeredBy: existing.triggeredBy || d.triggeredBy,
      marginImpact: Math.max(existing.marginImpact ?? 0, d.marginImpact ?? 0) || undefined,
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
  // Only reorder actions share a unit (projected 30-day revenue at risk).
  const totalRevenueAtStake = actions
    .filter((a) => a.category === "reorder")
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
