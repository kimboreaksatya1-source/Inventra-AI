// Inventra AI — server-side AI helper wrapping z-ai-web-dev-sdk
// All AI calls happen on the server (never client-side).

import ZAI from "z-ai-web-dev-sdk";
import type {
  AdvisorInsight,
  AdvisorInsightItem,
  BusinessInsightsReport,
} from "./types";
import type { LoadedData } from "./data";
import { computeProductMetrics, generateRecommendations, suggestedOrderQuantity } from "./inventory";

let zaiPromise: Promise<Awaited<ReturnType<typeof ZAI.create>>> | null = null;
async function getAI() {
  if (!zaiPromise) zaiPromise = ZAI.create();
  return zaiPromise;
}

/** Build a compact inventory context string for the LLM. */
export function buildInventoryContext(data: LoadedData): string {
  const { user, products, sales } = data;
  const metrics = products
    .map((p) => {
      const m = computeProductMetrics({ product: p, sales });
      return `- ${p.name} (${p.category}) | stock ${p.stockQuantity} ${p.unit}s @ $${p.sellingPrice} (cost $${p.costPrice}) | avg daily sales ${m.averageDailySales} | days remaining ${Number.isFinite(m.daysRemaining) ? m.daysRemaining.toFixed(1) : "30+"} | weekly revenue $${m.weeklyRevenue} | WoW growth ${m.weeklyGrowth}% | revenue at risk $${m.revenueAtRisk} | status ${m.status}`;
    })
    .join("\n");

  const recs = generateRecommendations(products, sales)
    .slice(0, 8)
    .map(
      (r) =>
        `- ${r.productName} | priority ${r.priority} | suggested order ${r.suggestedOrderQuantity} | revenue at risk $${r.revenueAtRisk} | confidence ${r.confidenceScore}%`
    )
    .join("\n");

  return `STORE: ${user.businessName} (owner ${user.name})
PRODUCTS (${products.length}):
${metrics}

CURRENT RECOMMENDATIONS:
${recs}`;
}

const ADVISOR_SYSTEM = `You are Inventra AI, an AI business copilot for a Cambodian SME minimart owner. You help them make smarter inventory decisions: prevent stockouts, protect revenue, reduce overstock, and optimize cash flow.

You answer in clear, confident, business-grade English. Be concise but specific. Use the inventory context provided. When recommending reorders, reference exact stock levels, predicted stockout days, suggested quantities, confidence scores, and expected revenue protection in USD.

When the user asks for a list of reorders or prioritised actions, respond with a STRICT JSON object (no markdown fences) of shape:
{
  "summary": "one short paragraph",
  "overallConfidence": number (0-100),
  "items": [
    {
      "productName": string,
      "stockRemaining": number,
      "predictedStockout": string like "3 days" or "within 48 hours",
      "suggestedOrder": number,
      "confidence": number (0-100),
      "revenueProtection": number (USD),
      "reasoning": string
    }
  ]
}
Only include items that genuinely need action based on the data. Keep 1-5 items, ordered by priority. If no reorder list is needed, reply with a normal helpful text answer (not JSON).`;

export async function askAdvisor(
  message: string,
  history: { role: "user" | "assistant"; content: string }[],
  data: LoadedData
): Promise<{ content: string; insight: AdvisorInsight | null }> {
  const context = buildInventoryContext(data);
  const messages = [
    { role: "assistant", content: ADVISOR_SYSTEM },
    { role: "assistant", content: `INVENTORY CONTEXT:\n${context}` },
    ...history.slice(-6),
    { role: "user", content: message },
  ];

  try {
    const zai = await getAI();
    const completion = await zai.chat.completions.create({
      messages: messages as any,
      thinking: { type: "disabled" },
      temperature: 0.4,
    });
    const text = completion.choices[0]?.message?.content || "";
    const insight = tryParseInsight(text);
    return { content: insight ? insight.summary : text, insight };
  } catch (err) {
    console.error("[askAdvisor] AI error", err);
    return { content: buildFallbackAdvisorAnswer(message, data), insight: buildFallbackInsight(data) };
  }
}

function tryParseInsight(text: string): AdvisorInsight | null {
  // Try to extract a JSON object from the text
  const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) return null;
  try {
    const obj = JSON.parse(cleaned.slice(start, end + 1));
    if (!obj || !Array.isArray(obj.items)) return null;
    const items: AdvisorInsightItem[] = obj.items
      .filter((i: any) => i && i.productName)
      .map((i: any) => ({
        productName: String(i.productName),
        stockRemaining: Number(i.stockRemaining ?? 0),
        predictedStockout: String(i.predictedStockout ?? ""),
        suggestedOrder: Number(i.suggestedOrder ?? 0),
        confidence: Number(i.confidence ?? 0),
        revenueProtection: Number(i.revenueProtection ?? 0),
        reasoning: String(i.reasoning ?? ""),
      }));
    return {
      summary: String(obj.summary ?? ""),
      overallConfidence: Number(obj.overallConfidence ?? 0),
      items,
    };
  } catch {
    return null;
  }
}

function buildFallbackAdvisorAnswer(_message: string, data: LoadedData): string {
  const recs = generateRecommendations(data.products, data.sales).slice(0, 3);
  if (recs.length === 0) return "Your inventory is in good shape — no urgent reorders needed today.";
  return `Based on inventory levels and sales velocity, here are the highest-priority actions:\n\n${recs
    .map(
      (r, i) =>
        `${i + 1}. ${r.productName} — suggested order ${r.suggestedOrderQuantity} units (confidence ${r.confidenceScore}%), protecting $${Math.round(r.revenueAtRisk)}.`
    )
    .join("\n")}`;
}

function buildFallbackInsight(data: LoadedData): AdvisorInsight {
  const recs = generateRecommendations(data.products, data.sales).slice(0, 4);
  return {
    summary: "Here are the highest-priority reorder actions based on your current inventory.",
    overallConfidence: recs.length ? Math.round(recs.reduce((a, r) => a + r.confidenceScore, 0) / recs.length) : 90,
    items: recs.map((r) => {
      const p = data.products.find((x) => x.id === r.productId)!;
      const m = computeProductMetrics({ product: p, sales: data.sales });
      return {
        productName: r.productName,
        stockRemaining: p.stockQuantity,
        predictedStockout: `${Math.max(1, Math.round(Number.isFinite(m.daysRemaining) ? m.daysRemaining : 7))} days`,
        suggestedOrder: r.suggestedOrderQuantity,
        confidence: r.confidenceScore,
        revenueProtection: Math.round(r.revenueAtRisk),
        reasoning: r.reason,
      };
    }),
  };
}

const INSIGHTS_SYSTEM = `You are Inventra AI, an AI business analyst. Given inventory data and computed metrics, write a premium, investor-ready weekly business report. Be specific, confident and action-oriented. Reference real product names, real percentages and dollar figures from the data. Keep it tight and high-signal. Do NOT use markdown headings beyond what's given. Return a single short executive summary paragraph (2-3 sentences) only — the rest of the report is structured separately.`;

export async function generateInsightsNarrative(
  data: LoadedData,
  staticReport: BusinessInsightsReport
): Promise<string> {
  const context = buildInventoryContext(data);
  const messages = [
    { role: "assistant", content: INSIGHTS_SYSTEM },
    {
      role: "assistant",
      content: `INVENTORY CONTEXT:\n${context}\n\nCOMPUTED REPORT SUMMARY:\n${staticReport.summary}\nTop drivers: ${staticReport.topRevenueDrivers.map((d) => d.title).join(", ")}\nFastest growing: ${staticReport.fastestGrowing.map((d) => d.title).join(", ")}\nSlow movers: ${staticReport.deadInventory.map((d) => d.title).join(", ")}`,
    },
    { role: "user", content: "Write the executive summary paragraph for this week's business insights report." },
  ];
  try {
    const zai = await getAI();
    const completion = await zai.chat.completions.create({
      messages: messages as any,
      thinking: { type: "disabled" },
      temperature: 0.5,
    });
    return completion.choices[0]?.message?.content?.trim() || staticReport.summary;
  } catch (err) {
    console.error("[generateInsightsNarrative] AI error", err);
    return staticReport.summary;
  }
}

export const SUGGESTED_ORDER = suggestedOrderQuantity;
