// Inventra AI — Copilot evidence model. Pure.
// Turns the analysis + procurement output into DATA → RULE → CONCLUSION blocks.
// Every Copilot recommendation must trace to one of these; nothing here is
// invented — every value comes from the imported data or a documented formula.

import { shortLabel } from "./product-label";
import type {
  EvidenceBlock,
  EvidenceConfidence,
  InventoryAnalysis,
  ProcurementResult,
  ProcurementRow,
  ProductAnalysis,
  ProductVelocity,
} from "./types";

const usd = (n: number) => `$${Math.round(n).toLocaleString()}`;
const cover = (n: number) => (Number.isFinite(n) ? `${Math.round(n * 10) / 10} days` : "30+ days (no recent sales)");

const TOPIC_RANK: Record<EvidenceBlock["topic"], number> = {
  reorder: 0,
  critical: 1,
  overstock: 2,
  opportunity: 3,
  healthy: 4,
};

function velocityRule(v: ProductVelocity): string {
  if (v === "Fast")
    return "Fast mover (sells ≥5 units/day, or in the top 30% of your catalogue by sales rate). Coverage target 21 days.";
  if (v === "Medium")
    return "Medium mover (between the fast and slow bands by sales rate). Coverage target 30 days.";
  if (v === "Slow")
    return "Slow mover (under 0.3 units/day, or in the bottom 35% by sales rate). Coverage target 45 days.";
  return "No sales recorded in the analysis window, so it has no velocity class.";
}

function reorderBlock(row: ProcurementRow): EvidenceBlock {
  const e = row.explanation;
  const data = [
    `Current stock: ${row.stock}`,
    `Daily sales: ${e.dailySales}/day`,
    `Days of cover: ${e.daysRemainingLabel}${Number.isFinite(row.daysRemaining) ? " days" : "+ days"}`,
    `Velocity: ${e.velocityLabel}`,
    `Revenue impact: ${row.revenueImpact}`,
    row.costPrice > 0 ? `Unit cost: ${usd(row.costPrice)}` : `Unit cost: not provided`,
    `Revenue at risk if it stocks out: ${usd(row.revenueProtected)}`,
  ];
  const conclusion =
    row.suggestedQuantity > 0
      ? `Order ${row.suggestedQuantity} units${row.costPrice > 0 ? ` (~${usd(row.estimatedCost)})` : ""}. Priority ${row.priority}. Protects ${usd(
          row.revenueProtected
        )} of revenue.`
      : `No order needed — stock already covers the ${row.targetCoverageDays}-day target.`;
  return {
    productId: row.id,
    subject: shortLabel(row),
    topic: "reorder",
    data,
    rule: `${velocityRule(row.velocity)} ${e.priorityReason}`,
    conclusion,
    formula: e.formula,
    confidence: "High",
    confidenceReason:
      "Quantity = (coverage target × daily sales) − current stock, from imported stock and sales figures.",
  };
}

function criticalBlock(p: ProductAnalysis): EvidenceBlock {
  const data = [
    `Current stock: ${p.stock}`,
    `Daily sales: ${Math.round(p.dailySales * 100) / 100}/day`,
    `Days of cover: ${cover(p.daysRemaining)}`,
    `Risk level: ${p.riskLevel}`,
    `Revenue exposed over 30 days: ${usd(p.estimatedRevenueAtRisk)}`,
    `Reorder-urgency score: ${p.reorderUrgency}/100`,
  ];
  return {
    productId: p.id,
    subject: shortLabel(p),
    topic: "critical",
    data,
    rule: `Days of cover = stock ÷ daily sales = ${p.stock} ÷ ${Math.round(p.dailySales * 100) / 100} = ${
      Number.isFinite(p.daysRemaining) ? (Math.round(p.daysRemaining * 10) / 10).toString() : "∞"
    }. Under 3 days → Critical; under 7 → High. Revenue exposed = days of cover (capped at 30) × daily sales × price.`,
    conclusion: `${p.riskLevel} stockout risk — reorder now to protect ${usd(p.estimatedRevenueAtRisk)} of sales over the next 30 days.`,
    confidence: "High",
    confidenceReason: "Days of cover and revenue-at-risk are direct calculations from imported stock, sales and price.",
  };
}

function overstockBlock(p: ProductAnalysis): EvidenceBlock {
  const hasCost = p.costPrice > 0;
  const data = [
    `Current stock: ${p.stock}`,
    `Daily sales: ${Math.round(p.dailySales * 100) / 100}/day`,
    `Days of cover: ${cover(p.daysRemaining)}`,
    `Velocity: ${p.velocity === "None" ? "No sales" : p.velocity}`,
    hasCost ? `Unit cost: ${usd(p.costPrice)}` : `Unit cost: not provided`,
    hasCost ? `Capital tied up: ${usd(p.inventoryValue)}` : `Capital tied up: unknown (no cost price)`,
  ];
  const target = p.velocity === "Fast" ? 21 : p.velocity === "Medium" ? 45 : p.velocity === "Slow" ? 90 : null;
  const rule =
    p.dailySales <= 0 && p.stock > 0
      ? "No sales but stock on hand → dead stock: 100% of its value is frozen."
      : target
      ? `Cover of ${cover(p.daysRemaining)} is past the ${target}-day overstock threshold for a ${p.velocity.toLowerCase()} mover.`
      : "Flagged Reduce by the recommendation engine.";
  const conclusion = hasCost
    ? `Discount, bundle or return stock to free up ${usd(p.inventoryValue)} of working capital.`
    : `Discount or bundle to move the stock — import a cost price to see how much capital it frees.`;
  return {
    productId: p.id,
    subject: shortLabel(p),
    topic: "overstock",
    data,
    rule,
    conclusion,
    confidence: hasCost ? "High" : "Low",
    confidenceReason: hasCost
      ? "Capital tied up = stock × imported unit cost."
      : "No cost price imported, so the capital figure can't be computed.",
  };
}

function opportunityBlock(p: ProductAnalysis): EvidenceBlock {
  const weeklyUnits = Math.round(p.dailySales * 7);
  const uplift = Math.max(1, Math.round(weeklyUnits * 0.25));
  const data = [
    `Daily sales: ${Math.round(p.dailySales * 100) / 100}/day (${weeklyUnits}/week)`,
    `Days of cover: ${cover(p.daysRemaining)}`,
    `Unit margin: ${p.costPrice > 0 ? usd(p.unitMargin) : "not available (no cost price)"}`,
    `Velocity: ${p.velocity}, revenue impact: ${p.revenueImpact}`,
  ];
  return {
    productId: p.id,
    subject: shortLabel(p),
    topic: "opportunity",
    data,
    rule: `Fast mover, ${p.revenueImpact} revenue impact, not at stockout risk and healthy margin → room to sell more.`,
    conclusion:
      p.costPrice > 0
        ? `Raise orders ~25% (about ${uplift} more units/week) — roughly ${usd(uplift * p.unitMargin * 4)} of extra monthly margin.`
        : `Raise orders ~25% (about ${uplift} more units/week) — import a cost price to size the margin gain.`,
    confidence: "Medium",
    confidenceReason: "The +25% uplift is a modelled assumption, not a measured figure.",
  };
}

function monitorBlock(p: ProductAnalysis): EvidenceBlock {
  const hasCost = p.costPrice > 0;
  const data = [
    `Current stock: ${p.stock}`,
    `Daily sales: ${Math.round(p.dailySales * 100) / 100}/day`,
    `Days of cover: ${cover(p.daysRemaining)}`,
    `Velocity: ${p.velocity === "None" ? "No sales" : p.velocity}`,
    hasCost ? `Unit cost: ${usd(p.costPrice)} · capital: ${usd(p.inventoryValue)}` : `Unit cost: not provided`,
    `Rule-based action: ${p.recommendation}`,
  ];
  return {
    productId: p.id,
    subject: shortLabel(p),
    topic: "healthy",
    data,
    rule: `${velocityRule(p.velocity)} Not at stockout risk and not overstocked, so the engine flags it "${p.recommendation}".`,
    conclusion:
      p.recommendation === "Monitor"
        ? `No action needed now — keep the current ordering cadence and re-check next cycle.`
        : `Follow the "${p.recommendation}" action; nothing is urgent.`,
    confidence: p.dailySales > 0 ? "High" : "Low",
    confidenceReason:
      p.dailySales > 0
        ? "Days of cover and velocity come straight from imported stock and sales."
        : "No sales imported for this product, so its status can't be fully assessed.",
  };
}

/** Build the evidence set. Priority: reorder → critical → overstock → opportunity → everything else. */
export function buildEvidence(
  analysis: InventoryAnalysis,
  procurement: ProcurementResult,
  limit = 30
): EvidenceBlock[] {
  const seen = new Set<string>();
  const out: EvidenceBlock[] = [];

  const add = (b: EvidenceBlock) => {
    if (seen.has(b.productId)) return;
    seen.add(b.productId);
    out.push(b);
  };

  for (const row of procurement.plan) add(reorderBlock(row));

  for (const p of analysis.products) {
    if (p.riskLevel === "Critical" || p.riskLevel === "High") add(criticalBlock(p));
  }
  for (const p of [...analysis.products].sort((a, b) => b.inventoryValue - a.inventoryValue)) {
    if (p.overstockRisk !== "Low" || p.recommendation === "Reduce") add(overstockBlock(p));
  }
  for (const p of analysis.products) {
    if (p.recommendation === "Opportunity") add(opportunityBlock(p));
  }
  // remaining products so "why is <X>" can be answered for anything in the catalogue
  for (const p of [...analysis.products].sort((a, b) => b.weeklyRevenue - a.weeklyRevenue)) {
    if (!seen.has(p.id)) add(monitorBlock(p));
  }

  return out.sort((a, b) => TOPIC_RANK[a.topic] - TOPIC_RANK[b.topic]).slice(0, limit);
}

const norm = (s: string) =>
  String(s ?? "")
    .toLowerCase()
    .replace(/\(sku[^)]*\)/g, " ")
    .replace(/[^a-z0-9ក-៿]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** Resolve the product the user named in their question. */
export function findEvidence(blocks: EvidenceBlock[], query: string): EvidenceBlock | null {
  const q = norm(query);
  if (!q) return null;
  let best: { b: EvidenceBlock; score: number } | null = null;
  for (const b of blocks) {
    const subj = norm(b.subject);
    const skuMatch = /\bsku\s+([a-z]{2,4}-?\d{2,})/i.exec(query)?.[1]?.toLowerCase();
    const subjSku = /\(sku\s+([^)]+)\)/i.exec(b.subject)?.[1]?.toLowerCase().replace(/\s+/g, "");
    let score = 0;
    if (skuMatch && subjSku && (skuMatch.replace(/-/g, "") === subjSku.replace(/-/g, ""))) score = 100;
    else if (subj && q.includes(subj)) score = 90;
    else {
      const words = subj.split(" ").filter((w) => w.length >= 3);
      const hit = words.filter((w) => q.includes(w)).length;
      if (words.length && hit / words.length >= 0.5 && hit >= 1) score = 40 + hit * 10;
    }
    if (score > 0 && (!best || score > best.score)) best = { b, score };
  }
  return best ? best.b : null;
}

const CONF_KM: Record<EvidenceConfidence, string> = {
  High: "ជឿជាក់ខ្ពស់",
  Medium: "ជឿជាក់មធ្យម",
  Low: "ជឿជាក់ទាប",
};

/** Render one block as DATA / RULE / CONCLUSION markdown. */
export function renderEvidence(b: EvidenceBlock, km: boolean): string {
  const L = km
    ? { data: "ទិន្នន័យ", rule: "ក្បួន", concl: "សេចក្តីសន្និដ្ឋាន", conf: "កម្រិតជឿជាក់" }
    : { data: "DATA", rule: "RULE", concl: "CONCLUSION", conf: "Confidence" };
  const conf = km ? CONF_KM[b.confidence] : b.confidence;
  return [
    `**${b.subject}**`,
    `_${L.data}_`,
    ...b.data.map((d) => `- ${d}`),
    `_${L.rule}_ — ${b.rule}`,
    `_${L.concl}_ — ${b.conclusion}${b.formula ? `  \n\`${b.formula}\`` : ""}`,
    `_${L.conf}: ${conf}_ — ${b.confidenceReason}`,
  ].join("\n");
}

export function renderEvidenceList(blocks: EvidenceBlock[], km: boolean): string {
  return blocks.map((b) => renderEvidence(b, km)).join("\n\n");
}

/** Compact form for the AI prompt block. */
export function evidenceForPrompt(blocks: EvidenceBlock[]): string {
  if (blocks.length === 0) return "- none";
  return blocks
    .map(
      (b) =>
        `- ${b.subject} [${b.topic}]\n    DATA: ${b.data.join("; ")}\n    RULE: ${b.rule}\n    CONCLUSION: ${b.conclusion}${
          b.formula ? ` (${b.formula})` : ""
        }\n    CONFIDENCE: ${b.confidence} — ${b.confidenceReason}`
    )
    .join("\n");
}
