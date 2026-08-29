// Inventra AI — Copilot AI integration.
// System prompts (en/km), message assembly, streaming, structured-tail parsing,
// and a deterministic fallback that never calls the model.

import { AI_MODEL, getAIClient } from "./ai";
import { suggestedOrderQuantity } from "./inventory";
import type {
  CopilotContext,
  CopilotInsightCards,
  CopilotLanguage,
  CopilotMessage,
  CopilotReorderItem,
  CopilotStructured,
} from "./types";

export { parseStructuredTail, stripStreamingTail } from "./copilot-parse";

/* ------------------------------- prompts -------------------------------- */

const OUTPUT_CONTRACT = `
FORMAT — respond in GitHub-flavored Markdown:
- Start with a short bold title line (e.g. **Reorder Recommendations**).
- Then the structured answer. For reorder questions use a numbered list where each product shows: Reason, Suggested Quantity, Revenue Protection ($), Confidence (%).
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
  const base = `You are Inventra AI — an AI business consultant for a Cambodian SME (small shop) owner.
You make BUSINESS DECISIONS, not inventory data entry. You are given a BUSINESS SUMMARY built from the
owner's real imported data. Rules:
- Use ONLY the numbers, product names and facts in the BUSINESS SUMMARY. Never invent products or figures.
- Be specific: cite real product names, day counts, and dollar amounts.
- Be concise and confident, like a consultant briefing a client. No fluff, no apologies.
- If the data cannot answer the question, say what is missing and what to import.
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

type Intent = "reorder" | "risk" | "overstock" | "cashflow" | "opportunity" | "summary" | "general";

function classify(message: string): Intent {
  const m = message.toLowerCase();
  if (/(reorder|re-order|restock|order this week|what.*buy|purchase)/.test(m)) return "reorder";
  if (/(overstock|slow.?mov|dead stock|reduce inventory|too much)/.test(m)) return "overstock";
  if (/(cash ?flow|working capital|free up cash|tied up)/.test(m)) return "cashflow";
  if (/(opportunit|grow|growth|upside|increase sales)/.test(m)) return "opportunity";
  if (/(summary|overview|how are we|where.*stand|state of)/.test(m)) return "summary";
  if (/(risk|losing revenue|revenue.*risk|stockout|run out|most risky)/.test(m)) return "risk";
  return "general";
}

const usd = (n: number) => `$${Math.round(n).toLocaleString()}`;

function derivedReorder(context: CopilotContext, km: boolean): CopilotReorderItem[] {
  return context.criticalProducts.slice(0, 5).map((p) => {
    const est = Math.max(1, Math.round(p.revenueAtRisk / 10));
    const qty = suggestedOrderQuantity(est, Math.max(0, Math.round(p.daysRemaining)));
    return {
      product: p.name,
      reason: km
        ? p.daysRemaining < 3
          ? `ស្តុកនឹងអស់ក្នុងរយៈពេល ${p.daysRemaining} ថ្ងៃ`
          : `នៅសល់ត្រឹម ${p.daysRemaining} ថ្ងៃ`
        : p.daysRemaining < 3
        ? `Stockout expected within ${p.daysRemaining} days`
        : `Only ${p.daysRemaining} days of cover left`,
      suggestedQuantity: Math.max(qty, est * 7),
      revenueProtection: p.revenueAtRisk,
      confidence: p.daysRemaining < 3 ? 90 : 82,
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
  language: CopilotLanguage
): CopilotStructured & { content: string } {
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
    return { content, insightCards: null, reorder: [] };
  }

  const intent = classify(userMessage);
  const reorder = derivedReorder(context, km);
  const totalProtect = reorder.reduce((s, r) => s + r.revenueProtection, 0);
  const topCash = context.overstockProducts.reduce((s, p) => s + p.inventoryValue, 0);
  const firstCritical = context.criticalProducts[0]?.name ?? "your most critical item";

  let content: string;
  let cards: CopilotInsightCards;
  let attachReorder = false;

  switch (intent) {
    case "overstock": {
      const lines = context.overstockProducts.map(
        (p) => `- **${p.name}** — ${usd(p.inventoryValue)} ${km ? "ជាប់ក្នុងស្តុក" : "tied up"}`
      );
      content =
        (km ? "**ស្តុកលើស និងទំនិញលក់យឺត**\n\n" : "**Overstock & Slow Movers**\n\n") +
        (lines.join("\n") || (km ? "- គ្មាន" : "- none")) +
        close(
          km ? "បញ្ចុះតម្លៃ ឬរួមផ្សំទំនិញលក់យឺតកំពូល ៣ ក្នុងសប្តាហ៍នេះ។" : "Discount or bundle the top 3 slow movers this week.",
          km ? `រំដោះប្រហែល ${usd(topCash)} នៃដើមទុនបង្វិល។` : `Frees up roughly ${usd(topCash)} of working capital.`
        );
      cards = {
        revenueImpact: `${usd(topCash)} recoverable`,
        inventoryImpact: `${context.overstockProducts.length} products overstocked`,
        riskLevel: "MEDIUM",
        recommendedAction: km ? "ធ្វើការបញ្ចុះតម្លៃ" : "Run a clearance promotion",
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
      const items = context.opportunities.length
        ? context.opportunities.map(
            (o) => `- **${o.title}** — ${km ? "ផលរំពឹងទុក" : "expected impact"} ${usd(o.expectedRevenueImpact)}`
          )
        : context.topSellers
            .slice(0, 3)
            .map((p) => `- **${km ? "ពង្រីក" : "Grow"} ${p.name}** — ${usd(p.weeklyRevenue)}/wk`);
      const upside = context.opportunities.reduce((s, o) => s + o.expectedRevenueImpact, 0) || 120;
      content =
        (km ? "**ឱកាសរីកចម្រើន**\n\n" : "**Growth Opportunities**\n\n") +
        items.join("\n") +
        close(
          km
            ? `បង្កើនការបញ្ជាទិញទំនិញលក់ដាច់ប្រហែល ២៥% និងបន្ថែមកន្លែងតាំងលក់។`
            : "Increase orders on your top sellers by ~25% and give them more shelf space.",
          km ? `+${usd(upside)} នៃប្រាក់ចំណេញបន្ថែមក្នុងមួយខែ។` : `+${usd(upside)} of additional monthly margin.`
        );
      cards = {
        revenueImpact: `+${usd(upside)} potential`,
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
      const lines = context.criticalProducts.map(
        (p) =>
          `- **${p.name}** — ${p.daysRemaining} ${km ? "ថ្ងៃទៀត" : "days left"}, ${usd(p.revenueAtRisk)} ${
            km ? "មានហានិភ័យ" : "at risk"
          }`
      );
      content =
        (km ? "**កន្លែងដែលអ្នកកំពុងបាត់បង់ចំណូល**\n\n" : "**Where You're Losing Revenue**\n\n") +
        (lines.join("\n") || (km ? "- គ្មានហានិភ័យបន្ទាន់" : "- no immediate risks")) +
        close(
          km ? `បញ្ជាទិញ ${firstCritical} ជាមុនគេ។` : `Place reorders above, starting with ${firstCritical}.`,
          km ? `ការពារ ${usd(totalProtect)} នៃចំណូលក្នុង ៣០ ថ្ងៃ។` : `Protects ${usd(totalProtect)} of revenue over the next 30 days.`
        );
      cards = {
        revenueImpact: `${usd(totalProtect)} at risk`,
        inventoryImpact: `${context.criticalProducts.length} products short`,
        riskLevel: context.criticalProducts.some((p) => p.daysRemaining < 3) ? "CRITICAL" : "HIGH",
        recommendedAction: `Reorder ${firstCritical}`,
      };
      break;
    }
    case "reorder":
    default: {
      attachReorder = true;
      const lines = reorder.length
        ? reorder.map(
            (r, i) =>
              km
                ? `${i + 1}. **${r.product}** — ${r.reason}. បរិមាណណែនាំ **${r.suggestedQuantity}**, ការពារ **${usd(
                    r.revenueProtection
                  )}** (ជឿជាក់ ${r.confidence}%)`
                : `${i + 1}. **${r.product}** — ${r.reason}\n   - Suggested Quantity: ${r.suggestedQuantity} units\n   - Revenue Protection: ${usd(
                    r.revenueProtection
                  )}\n   - Confidence: ${r.confidence}%`
          )
        : [km ? "- គ្មានទំនិញត្រូវបញ្ជាទិញបន្ទាន់ទេ។" : "- Nothing needs reordering right now."];
      content =
        (km ? "**ការណែនាំបញ្ជាទិញ**\n\n" : "**Reorder Recommendations**\n\n") +
        lines.join("\n") +
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
        inventoryImpact: `${reorder.length} products to reorder`,
        riskLevel: reorder.some((r) => r.confidence >= 90) ? "CRITICAL" : reorder.length ? "HIGH" : "LOW",
        recommendedAction: reorder.length ? `Order ${reorder[0].product}` : "No action needed",
      };
      break;
    }
  }

  return { content, insightCards: cards, reorder: attachReorder ? reorder : [] };
}
