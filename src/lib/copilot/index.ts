// Inventra AI — Copilot AI integration.
// System prompts (en/km), message assembly, streaming, structured-tail parsing,
// and a deterministic fallback that never calls the model.

import { AI_MODEL, getAIClient } from "../ai";
import { findEvidence, renderEvidence, renderEvidenceList } from "./evidence";
import { shortLabel } from "../product-label";
import type {
  CopilotContext,
  CopilotInsightCards,
  CopilotLanguage,
  CopilotMessage,
  CopilotReorderItem,
  CopilotStructured,
  EvidenceBlock,
  ProcurementResult,
  ProcurementRow,
} from "../types";

export { parseStructuredTail, stripStreamingTail } from "./parse";

/* ------------------------------- prompts -------------------------------- */

const OUTPUT_CONTRACT = `
FORMAT — respond in GitHub-flavored Markdown:
- Start with a short bold title line (e.g. **Reorder Recommendations**).
- For every product recommendation, warning or risk statement, structure it as:
  **<product name (SKU)>**
  _DATA_ — the actual values (stock, daily sales, days of cover, cost, revenue at risk …)
  _RULE_ — the rule that flagged it (the threshold / formula, in words)
  _CONCLUSION_ — what to do, with the number (e.g. "Order 150 units — (21 × 8) − 18 = 150")
  _Confidence: High | Medium | Low_ — one line on why
  Take DATA and the formula verbatim from the EVIDENCE section of the BUSINESS SUMMARY.
- Do NOT give generic advice ("run a promotion", "add shelf space", "bundle products") unless you
  name the product and cite the numbers that justify it. If the evidence can't answer, say what's missing.
- ALWAYS finish the prose with exactly these two lines:
  **Recommended Next Action:** <one concrete step>
  **Expected Business Impact:** <the $ / operational outcome>
- After the prose, output ONE fenced \`\`\`json code block and NOTHING after it:
\`\`\`json
{
  "insightCards": {
    "revenueImpact": "short phrase, include a $ figure",
    "inventoryImpact": "short phrase",
    "riskLevel": "Critical | High | Medium | Low",
    "recommendedAction": "short imperative phrase"
  },
  "reorder": [
    { "product": "name", "reason": "why", "suggestedQuantity": 120, "revenueProtection": 120, "confidence": 89 }
  ]
}
\`\`\`
"reorder" may be an empty array when the question is not about reordering.`;

export function buildSystemPrompt(language: CopilotLanguage): string {
  const base = `You are Inventra AI — an inventory advisor for an FMCG business: a distributor, mini-mart, or retail grocery store.
You make BUSINESS DECISIONS, not data entry. You are given a BUSINESS SUMMARY built from the owner's real imported data.
Every product line carries a VELOCITY class (fast / medium / slow mover), its DAYS OF COVER, a rule-based ACTION
(Reorder · Reduce/clear · Monitor · Opportunity) and a REVENUE IMPACT tier. Anchor every answer on these:
- Protect availability of FAST movers and High-impact lines — never let them stock out.
- Clear, discount or bundle SLOW movers and anything flagged Reduce — that cash is trapped.
- Watch MEDIUM movers; act on OPPORTUNITIES (strong sellers with headroom).
- Talk in FMCG terms: days of cover, cartons/units to order, category mix, promo and clearance tactics, shelf priority.
Rules:
- Use ONLY the numbers, product names and facts in the BUSINESS SUMMARY. Never invent products or figures.
- EVERY recommendation must trace to an EVIDENCE block: state its DATA, the RULE, then the CONCLUSION.
  If a figure is not in the EVIDENCE or the summary, do not state it. Never estimate a missing value.
- Each product shows the owner's ORIGINAL name, then in [brackets] a canonical English name + brand. Match/reason on the canonical name, but ALWAYS write the ORIGINAL name (with its SKU) back to the owner — e.g. "កូកាកូឡា 330ml [canonical: Coca-Cola Original 330ml] (SKU BEV-001)" → you write "កូកាកូឡា 330ml (SKU BEV-001)". Never translate or shorten it.
- Be specific and decisive, like a category manager briefing a buyer. No fluff, no apologies.
- If the data cannot answer the question, say what is missing.
- Focus every answer on what the owner should DO and the expected impact.`;

  const lang =
    language === "km"
      ? `\n\nLANGUAGE: Respond ENTIRELY in Khmer (ភាសាខ្មែរ). Keep product names exactly as written in the data. In the JSON block keep the keys in English but write all string values in Khmer.`
      : `\n\nLANGUAGE: Respond in clear, professional English.`;

  return base + lang + "\n" + OUTPUT_CONTRACT;
}

export function buildMessages(
  promptBlock: string,
  history: Pick<CopilotMessage, "role" | "content">[],
  userMessage: string,
  language: CopilotLanguage
) {
  return [
    { role: "system" as const, content: buildSystemPrompt(language) },
    { role: "system" as const, content: `BUSINESS SUMMARY (the owner's real data):\n${promptBlock}` },
    ...history.slice(-8).map((m) => ({ role: m.role, content: m.content })),
    { role: "user" as const, content: userMessage },
  ];
}

/* ------------------------------ streaming ------------------------------- */

export async function* streamCopilotReply(
  messages: { role: "system" | "user" | "assistant"; content: string }[]
): AsyncGenerator<string> {
  const ai = getAIClient();
  const stream = await ai.chat.completions.create({
    model: AI_MODEL,
    temperature: 0.4,
    stream: true,
    messages: messages as never,
  });
  for await (const chunk of stream) {
    const delta = chunk.choices?.[0]?.delta?.content;
    if (delta) yield delta;
  }
}

/* --------------------------- deterministic ----------------------------- */

export type Intent = "why" | "reorder" | "risk" | "overstock" | "cashflow" | "opportunity" | "summary" | "general";

export function classify(message: string): Intent {
  const m = message.toLowerCase();
  if (/^\s*why\b|\bwhy (is|are|should|does|do|would|was)\b|explain (why|the|this|how)|how did you|how is .* (calculated|derived)|marked (critical|slow|fast)/.test(m))
    return "why";
  if (/(reorder|re-order|restock|order this week|what.*buy|purchase)/.test(m)) return "reorder";
  if (/(overstock|slow.?mov|dead stock|reduce inventory|too much)/.test(m)) return "overstock";
  if (/(cash ?flow|working capital|free up cash|tied up)/.test(m)) return "cashflow";
  if (/(opportunit|grow|growth|upside|increase sales)/.test(m)) return "opportunity";
  if (/(summary|overview|how are we|where.*stand|state of)/.test(m)) return "summary";
  if (/(risk|losing revenue|revenue.*risk|stockout|run out|most risky)/.test(m)) return "risk";
  return "general";
}

const usd = (n: number) => `$${Math.round(n).toLocaleString()}`;

/**
 * Reorder line items — read straight from the Procurement Engine's plan.
 * Nothing is recalculated here: quantity and revenue-protected come from
 * `buildProcurement`, the single source of truth. Each item carries the DATA /
 * RULE / formula behind it plus a confidence label from the evidence model.
 */
function derivedReorder(
  plan: ProcurementRow[],
  evidence: EvidenceBlock[],
  km: boolean
): CopilotReorderItem[] {
  const byId = new Map(evidence.map((e) => [e.productId, e]));
  return plan.slice(0, 5).map((r) => {
    const cover = Number.isFinite(r.daysRemaining) ? Math.round(r.daysRemaining * 10) / 10 : null;
    const reason =
      cover === null
        ? r.reason
        : km
        ? cover < 3
          ? `ស្តុកនឹងអស់ក្នុងរយៈពេល ${cover} ថ្ងៃ`
          : `នៅសល់ត្រឹម ${cover} ថ្ងៃ`
        : cover < 3
        ? `Stockout expected within ${cover} days`
        : `Only ${cover} days of cover left`;
    const ev = byId.get(r.id);
    return {
      product: shortLabel(r),
      reason,
      suggestedQuantity: r.suggestedQuantity,
      revenueProtection: r.revenueProtected,
      confidence:
        r.priority === "Critical" ? 90 : r.priority === "High" ? 82 : r.priority === "Medium" ? 74 : 66,
      confidenceLabel: ev?.confidence ?? "High",
      evidence: ev?.data,
      rule: ev?.rule,
      formula: ev?.formula ?? r.explanation.formula,
    };
  });
}

const CLOSERS = {
  en: (action: string, impact: string) =>
    `\n\n**Recommended Next Action:** ${action}\n**Expected Business Impact:** ${impact}`,
  km: (action: string, impact: string) =>
    `\n\n**សកម្មភាពបន្ទាប់ដែលណែនាំ:** ${action}\n**ផលប៉ះពាល់អាជីវកម្មរំពឹងទុក:** ${impact}`,
};

export function buildDeterministicReply(
  context: CopilotContext,
  userMessage: string,
  language: CopilotLanguage,
  procurement?: Pick<ProcurementResult, "plan" | "kpis"> | null
): CopilotStructured & { content: string; blocked?: boolean } {
  const km = language === "km";
  const close = CLOSERS[language];

  if (!context.hasData) {
    const content = km
      ? "មិនទាន់មានទិន្នន័យអាជីវកម្មដែលបាននាំចូលទេ ដូច្នេះខ្ញុំមិនអាចវិភាគអ្វីជាក់លាក់បានទេ។ សូមនាំចូលបញ្ជីទំនិញរបស់អ្នកជាមុនសិន។" +
        close("នាំចូលឯកសារទំនិញនៅទំព័រ Upload។", "បើកដំណើរការការវិភាគ ការវាយតម្លៃហានិភ័យ និងការណែនាំបញ្ជាទិញ។")
      : "No business data has been imported yet, so I can't analyze anything specific. Import your product list first." +
        close(
          "Upload your product file on the Upload page.",
          "Unlocks full analysis, risk scoring and reorder guidance."
        );
    return { content, insightCards: null, reorder: [], blocked: true };
  }

  const intent = classify(userMessage);
  const dq = context.dataQuality;

  // Missing daily-sales data → every sales-derived answer would be guesswork.
  const salesDependent =
    intent === "reorder" ||
    intent === "risk" ||
    intent === "opportunity" ||
    intent === "cashflow" ||
    intent === "overstock" ||
    intent === "summary";
  if (dq && !dq.hasSalesData && salesDependent) {
    const content = km
      ? "ខ្ញុំមិនអាចផ្ដល់ការណែនាំនេះបានទេ ព្រោះមិនមានទិន្នន័យការលក់ប្រចាំថ្ងៃ។ ការវិភាគស្តុក និងតម្លៃស្តុកនៅតែមាន ប៉ុន្តែ ការណែនាំបញ្ជាទិញ ការវាយតម្លៃហានិភ័យ និងលំហូរសាច់ប្រាក់ ត្រូវការទិន្នន័យការលក់។" +
        close("នាំចូលជួរ 'ការលក់ប្រចាំថ្ងៃ' នៅទំព័រ Upload។", "បើកដំណើរការការណែនាំបញ្ជាទិញ ការវាយតម្លៃហានិភ័យ និងលំហូរសាច់ប្រាក់។")
      : "I can't answer that — no daily-sales data was imported. Inventory analysis and stock value still work, but reorder planning, revenue-at-risk, velocity, the business summary and cash-flow risk all need sales figures. Nothing here is estimated." +
        close(
          "Import a daily-sales column on the Upload page.",
          "Unlocks the purchase plan, risk scoring and cash-flow analysis."
        );
    return { content, insightCards: null, reorder: [], blocked: true };
  }

  // Cash-flow answers depend on cost prices — without them every $ figure would be 0/guessed.
  if (dq && !dq.hasCostData && intent === "cashflow") {
    const content = km
      ? "ខ្ញុំមិនអាចវិភាគលំហូរសាច់ប្រាក់បានទេ ព្រោះមិនមានតម្លៃដើម។ តម្លៃស្តុក ប្រាក់ចំណេញ និងដើមទុនជាប់ ត្រូវការតម្លៃដើម ហើយ Inventra មិនប៉ាន់ស្មានវាទេ។" +
        close("នាំចូលជួរ 'តម្លៃដើម' នៅទំព័រ Upload។", "បើកដំណើរការការវិភាគលំហូរសាច់ប្រាក់។")
      : "I can't analyse cash flow — no cost prices were imported. Inventory value, margins and locked capital all need cost prices, and Inventra does not estimate them." +
        close("Import a cost-price column on the Upload page.", "Unlocks the cash-flow analysis.");
    return { content, insightCards: null, reorder: [], blocked: true };
  }

  const plan = procurement?.plan ?? [];
  const evidence = context.evidence ?? [];
  const reorderEv = evidence.filter((e) => e.topic === "reorder");
  const criticalEv = evidence.filter((e) => e.topic === "critical");
  const overstockEv = evidence.filter((e) => e.topic === "overstock");
  const opportunityEv = evidence.filter((e) => e.topic === "opportunity");
  const reorder = derivedReorder(plan, evidence, km);
  const totalProtect =
    procurement?.kpis.revenueProtected ?? reorder.reduce((s, r) => s + r.revenueProtection, 0);
  const productsToReorder = procurement?.kpis.productsToReorder ?? reorder.length;
  const topCash = context.overstockProducts.reduce((s, p) => s + p.inventoryValue, 0);
  const firstCritical = context.criticalProducts[0]?.name ?? "your most critical item";

  let content: string;
  let cards: CopilotInsightCards;
  let attachReorder = false;

  switch (intent) {
    case "overstock": {
      const blocks = overstockEv.slice(0, 4);
      const firstOver = blocks[0]?.subject ?? context.overstockProducts[0]?.name ?? "your slowest mover";
      content =
        (km ? "**ស្តុកលើស និងទំនិញលក់យឺត**\n\n" : "**Overstock & Slow Movers**\n\n") +
        (blocks.length
          ? renderEvidenceList(blocks, km)
          : km
          ? "គ្មានទំនិញលើសស្តុកទេ។"
          : "Nothing is overstocked right now.") +
        close(
          km
            ? `ចាប់ផ្តើមជាមួយ ${firstOver} — អនុវត្តតាមសេចក្តីសន្និដ្ឋានខាងលើសម្រាប់ទំនិញនីមួយៗ។`
            : `Start with ${firstOver} — follow the CONCLUSION line for each product above.`,
          topCash > 0
            ? km
              ? `រំដោះប្រហែល ${usd(topCash)} នៃដើមទុនបង្វិល។`
              : `Frees up roughly ${usd(topCash)} of working capital.`
            : km
            ? `រំដោះដើមទុនដែលជាប់ក្នុងស្តុកលក់យឺត។`
            : `Frees the capital trapped in slow stock (import cost prices to size it).`
        );
      cards = {
        revenueImpact: topCash > 0 ? `${usd(topCash)} recoverable` : "Capital in slow stock",
        inventoryImpact: `${overstockEv.length || context.overstockProducts.length} products flagged Reduce`,
        riskLevel: "MEDIUM",
        recommendedAction: blocks.length ? `Clear ${firstOver.split(" (SKU")[0]}` : "No action needed",
      };
      break;
    }
    case "cashflow": {
      content =
        (km ? "**លំហូរសាច់ប្រាក់**\n\n" : "**Cash Flow**\n\n") +
        (km
          ? `សាច់ប្រាក់ប្រហែល **${usd(topCash)}** ជាប់ក្នុងស្តុកលក់យឺត ខណៈ **${usd(
              context.revenueAtRisk
            )}** នៃចំណូលប្រឈមនឹងអស់ស្តុក។`
          : `About **${usd(topCash)}** is tied up in slow-moving stock while **${usd(
              context.revenueAtRisk
            )}** of revenue is exposed to stockouts.`) +
        close(
          km
            ? "លក់បញ្ចុះតម្លៃទំនិញលក់យឺត រួចយកសាច់ប្រាក់ទៅបញ្ជាទិញទំនិញលក់ដាច់ដែលជិតអស់។"
            : "Liquidate slow movers, then redirect that cash to reorder your at-risk fast sellers.",
          km
            ? `ការពារ ${usd(totalProtect)} នៃចំណូល និងរំដោះ ${usd(topCash)} នៃដើមទុន។`
            : `Protects ${usd(totalProtect)} of sales and frees ${usd(topCash)} of capital.`
        );
      cards = {
        revenueImpact: `${usd(totalProtect)} protected`,
        inventoryImpact: `${usd(topCash)} to reallocate`,
        riskLevel: context.criticalProducts.length ? "HIGH" : "MEDIUM",
        recommendedAction: km ? "លក់ស្តុកយឺត បញ្ជាទិញទំនិញលក់ដាច់" : "Liquidate slow stock, reorder fast movers",
      };
      break;
    }
    case "opportunity": {
      const blocks = opportunityEv.slice(0, 3);
      // Only quote a dollar figure the analysis engine actually produced — never a placeholder.
      const upside = context.opportunities.reduce((s, o) => s + o.expectedRevenueImpact, 0);
      content =
        (km ? "**ឱកាសរីកចម្រើន**\n\n" : "**Growth Opportunities**\n\n") +
        (blocks.length
          ? renderEvidenceList(blocks, km)
          : km
          ? "មិនមានឱកាសរីកចម្រើនច្បាស់លាស់ពីទិន្នន័យបច្ចុប្បន្ន — ទំនិញលក់ដាច់របស់អ្នកសុទ្ធតែមានស្តុកគ្រប់គ្រាន់រួចហើយ។"
          : "No clear growth plays in the current data — your fast movers are already well-stocked or margin data is missing.") +
        close(
          km
            ? "សម្រាប់ទំនិញនីមួយៗខាងលើ បង្កើនការបញ្ជាទិញតាមចំនួនក្នុងសេចក្តីសន្និដ្ឋាន។"
            : "For each product above, raise the order by the amount in its CONCLUSION line.",
          upside > 0
            ? km
              ? `+${usd(upside)} នៃប្រាក់ចំណេញបន្ថែមក្នុងមួយខែ (ការប៉ាន់ស្មាន)។`
              : `+${usd(upside)} of additional monthly margin (modelled).`
            : km
            ? `ការលក់កាន់តែច្រើនពីទំនិញលក់ដាច់ដែលមានស្រាប់។`
            : `More sales from sellers you already stock.`
        );
      cards = {
        revenueImpact: upside > 0 ? `+${usd(upside)} potential (modelled)` : "Upside on top sellers",
        inventoryImpact: km ? "បង្កើនការបញ្ជាទិញទំនិញលក់ដាច់" : "Increase fast-seller orders",
        riskLevel: "LOW",
        recommendedAction: km ? "ពង្រីកទំនិញលក់ដាច់" : "Scale up top sellers",
      };
      break;
    }
    case "summary": {
      content =
        (km ? `**សេចក្តីសង្ខេបអាជីវកម្ម — ${context.business}**\n\n` : `**Business Summary — ${context.business}**\n\n`) +
        (km
          ? `- ពិន្ទុសុខភាពស្តុក៖ **${context.healthScore}/100** (${context.healthLabel})\n- ចំណូលដែលមានហានិភ័យ៖ **${usd(
              context.revenueAtRisk
            )}**\n- ទំនិញសំខាន់ៗ៖ **${context.criticalProducts.length}**\n- តម្លៃស្តុកសរុប៖ **${usd(context.inventoryValue)}**`
          : `- Inventory health: **${context.healthScore}/100** (${context.healthLabel})\n- Revenue at risk: **${usd(
              context.revenueAtRisk
            )}**\n- Critical products: **${context.criticalProducts.length}**\n- Inventory value on hand: **${usd(
              context.inventoryValue
            )}**\n- Top sellers: ${context.topSellers.map((p) => p.name).join(", ") || "n/a"}`) +
        close(
          context.recommendedActions[0]?.action ?? (km ? "រក្សាល្បឿនការបញ្ជាទិញបច្ចុប្បន្ន" : "Keep your current ordering cadence"),
          km ? `ការពារ ${usd(totalProtect)} នៃចំណូលក្នុងមួយខែ។` : `Protects ${usd(totalProtect)} of revenue over the next month.`
        );
      cards = {
        revenueImpact: `${usd(context.revenueAtRisk)} at risk`,
        inventoryImpact: `${usd(context.inventoryValue)} on hand`,
        riskLevel: context.criticalProducts.length ? "HIGH" : "MEDIUM",
        recommendedAction: context.recommendedActions[0]?.action ?? "Maintain ordering cadence",
      };
      break;
    }
    case "risk": {
      attachReorder = true;
      const blocks = criticalEv.slice(0, 5);
      content =
        (km ? "**កន្លែងដែលអ្នកកំពុងបាត់បង់ចំណូល**\n\n" : "**Where You're Losing Revenue**\n\n") +
        (blocks.length
          ? renderEvidenceList(blocks, km)
          : km
          ? "គ្មានទំនិញណាដែលមានហានិភ័យអស់ស្តុកបន្ទាន់ទេ។"
          : "No products are at immediate stockout risk.") +
        close(
          km ? `បញ្ជាទិញ ${firstCritical} ជាមុនគេ។` : `Place reorders above, starting with ${firstCritical}.`,
          km ? `ការពារ ${usd(totalProtect)} នៃចំណូលក្នុង ៣០ ថ្ងៃ។` : `Protects ${usd(totalProtect)} of revenue over the next 30 days.`
        );
      cards = {
        revenueImpact: `${usd(totalProtect)} at risk`,
        inventoryImpact: `${criticalEv.length || context.criticalProducts.length} products short`,
        riskLevel: context.criticalProducts.some((p) => p.daysRemaining < 3) ? "CRITICAL" : "HIGH",
        recommendedAction: `Reorder ${firstCritical}`,
      };
      break;
    }
    case "why": {
      // Did the owner name a specific product? Answer with THAT product's evidence.
      const named = findEvidence(evidence, userMessage);
      if (named) {
        content =
          (km ? `**មូលហេតុ — ${named.subject}**\n\n` : `**Why — ${named.subject}**\n\n`) +
          renderEvidence(named, km) +
          close(
            named.topic === "reorder"
              ? km
                ? `បញ្ជាទិញតាមចំនួនក្នុងសេចក្តីសន្និដ្ឋាន។`
                : `Order the quantity in the CONCLUSION line.`
              : km
              ? `អនុវត្តតាមសេចក្តីសន្និដ្ឋានខាងលើ។`
              : `Act on the CONCLUSION above.`,
            km ? `រាល់តួលេខមកពីទិន្នន័យនាំចូលរបស់អ្នក។` : `Every number here comes from your imported data.`
          );
        cards = {
          revenueImpact: `${usd(context.revenueAtRisk)} at risk`,
          inventoryImpact: `${named.subject.split(" (SKU")[0]}`,
          riskLevel:
            named.topic === "critical" ? "CRITICAL" : named.topic === "reorder" ? "HIGH" : "MEDIUM",
          recommendedAction: named.conclusion.split(".")[0],
        };
        break;
      }
      const c0 = context.criticalProducts[0];
      const body = km
        ? [
            "**របៀបដែល Inventra គណនា**",
            "",
            "- **បរិមាណបញ្ជាទិញ** = (ថ្ងៃគ្របដណ្តប់គោលដៅ × ការលក់ប្រចាំថ្ងៃ) − ស្តុកបច្ចុប្បន្ន មិនតិចជាងសូន្យ។ គោលដៅ៖ ២១ ថ្ងៃសម្រាប់ទំនិញលក់ដាច់ ៣០ សម្រាប់មធ្យម ៤៥ សម្រាប់លក់យឺត។",
            "- **ល្បឿនលក់** — លឿន = លក់ ≥៥ ឯកតា/ថ្ងៃ ឬស្ថិតក្នុង ៣០% ខ្ពស់បំផុត; យឺត = តិចជាង ០.៣/ថ្ងៃ ឬ ៣៥% ទាបបំផុត; មធ្យម = នៅចន្លោះ។",
            "- **អាទិភាព / Critical** — ពិន្ទុ ០-១០០ ផ្អែកលើថ្ងៃគ្របដណ្តប់ដែលនៅសល់ធៀបនឹងបង្អួច ១៤ ថ្ងៃ (lead time ៧ ថ្ងៃ + បម្រុង) បូកទម្ងន់សម្រាប់ល្បឿនលឿន និងផលប៉ះពាល់ចំណូលខ្ពស់។ ≥៧៥ = Critical; តិចជាង ៣ ថ្ងៃ = យ៉ាងហោចណាស់ High។",
          ]
        : [
            "**How Inventra decides**",
            "",
            "- **Suggested order quantity** = (target coverage days × daily sales) − current stock, never below zero. Target coverage is 21 days for fast movers, 30 for medium, 45 for slow.",
            "- **Velocity** — Fast = sells ≥5 units/day or sits in the top 30% of selling products by rate; Slow = under 0.3/day or the bottom 35%; Medium is in between.",
            "- **Priority / Critical** — a 0–100 reorder-urgency score from how little cover is left against a 14-day reorder window (7-day lead time + buffer), plus weight for fast velocity and high revenue impact. 75+ is Critical; anything under 3 days of cover is at least High.",
          ];
      if (c0) {
        body.push(
          "",
          km
            ? `ឧទាហរណ៍៖ **${c0.name}** នៅសល់ត្រឹម ${c0.daysRemaining} ថ្ងៃ ហើយមានចំណូល ${usd(
                c0.revenueAtRisk
              )} ប្រឈមនឹងហានិភ័យ — នេះជាមូលហេតុ។`
            : `Example: **${c0.name}** has ${c0.daysRemaining} days of cover left and ${usd(
                c0.revenueAtRisk
              )} of revenue exposed — that is why it is flagged.`
        );
      }
      content =
        body.join("\n") +
        close(
          km
            ? "បើកទំព័រ Procurement រួចចុច “Why?” លើទំនិញណាមួយ ដើម្បីមើលការគណនាពេញលេញ។"
            : "Open the Procurement page and hit “Why?” on any product for its full breakdown.",
          km
            ? "តម្លាភាពពេញលេញលើរាល់ការណែនាំ។"
            : "Full transparency on every recommendation."
        );
      cards = {
        revenueImpact: `${usd(context.revenueAtRisk)} at risk`,
        inventoryImpact: `${context.criticalProducts.length} products flagged`,
        riskLevel: context.criticalProducts.some((p) => p.daysRemaining < 3) ? "CRITICAL" : "MEDIUM",
        recommendedAction: km ? "មើលការគណនានៅទំព័រ Procurement" : "Review the Procurement breakdown",
      };
      break;
    }
    case "reorder":
    default: {
      attachReorder = true;
      const blocks = reorderEv.slice(0, 5);
      const lines = blocks.length
        ? renderEvidenceList(blocks, km)
        : km
        ? "គ្មានទំនិញត្រូវបញ្ជាទិញបន្ទាន់ទេ — គ្រប់ទំនិញនៅលើគោលដៅគ្របដណ្តប់។"
        : "Nothing needs reordering right now — every product is above its coverage target.";
      content =
        (km ? "**ការណែនាំបញ្ជាទិញ**\n\n" : "**Reorder Recommendations**\n\n") +
        lines +
        "\n" +
        (reorder.length
          ? close(
              km ? `បញ្ជាទិញ ${reorder[0].product} ថ្ងៃនេះ។` : `Place the order for ${reorder[0].product} today.`,
              km ? `ការពារ ${usd(totalProtect)} នៃចំណូល។` : `Protects ${usd(totalProtect)} of revenue.`
            )
          : close(
              km ? "រក្សាល្បឿនការបញ្ជាទិញ ហើយពិនិត្យឡើងវិញក្នុងមួយសប្តាហ៍។" : "Keep your current ordering cadence and re-check in a week.",
              km ? "គ្មានចំណូលប្រឈមហានិភ័យទេ។" : "No revenue currently at risk."
            ));
      cards = {
        revenueImpact: `${usd(totalProtect)} protected`,
        inventoryImpact: `${productsToReorder} products to reorder`,
        riskLevel: reorder.some((r) => r.confidence >= 90) ? "CRITICAL" : reorder.length ? "HIGH" : "LOW",
        recommendedAction: reorder.length ? `Order ${reorder[0].product}` : "No action needed",
      };
      break;
    }
  }

  return { content, insightCards: cards, reorder: attachReorder ? reorder : [] };
}
