// Inventra AI — pure parsing helpers for Copilot streaming output.
// No `openai` import here so this is safe to use on the client.

import { z } from "zod";
import type { CopilotInsightCards, CopilotReorderItem, Priority } from "./types";

/** ASCII record-separator (U+001E) framing the trailing JSON meta line in the chat stream. */
export const STREAM_SEP = String.fromCharCode(0x1e);

const insightSchema = z.object({
  revenueImpact: z.string().default(""),
  inventoryImpact: z.string().default(""),
  riskLevel: z
    .string()
    .transform((s) => s.toUpperCase())
    .pipe(z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]))
    .catch("MEDIUM" as Priority),
  recommendedAction: z.string().default(""),
});

const reorderItemSchema = z.object({
  product: z.string(),
  reason: z.string().default(""),
  suggestedQuantity: z.coerce.number().min(0).default(0),
  revenueProtection: z.coerce.number().min(0).default(0),
  confidence: z.coerce.number().min(0).max(100).default(0),
  confidenceLabel: z.enum(["High", "Medium", "Low"]).optional(),
  evidence: z.array(z.string()).optional(),
  rule: z.string().optional(),
  formula: z.string().optional(),
});

const structuredSchema = z.object({
  insightCards: insightSchema.nullish(),
  reorder: z.array(reorderItemSchema).nullish(),
});

/** Pull the last JSON object out of the model output; return clean prose + data. */
export function parseStructuredTail(fullText: string): {
  cleanText: string;
  insightCards: CopilotInsightCards | null;
  reorder: CopilotReorderItem[];
} {
  let jsonText: string | null = null;
  let cleanText = fullText;

  const fenceRe = /```json\s*([\s\S]*?)```/gi;
  let m: RegExpExecArray | null;
  let last: RegExpExecArray | null = null;
  while ((m = fenceRe.exec(fullText)) !== null) last = m;

  if (last) {
    jsonText = last[1];
    cleanText = (fullText.slice(0, last.index) + fullText.slice(last.index + last[0].length)).trim();
  } else {
    const start = fullText.lastIndexOf("{");
    const end = fullText.lastIndexOf("}");
    if (start !== -1 && end > start && /"insightCards"|"reorder"/.test(fullText.slice(start))) {
      jsonText = fullText.slice(start, end + 1);
      cleanText = fullText.slice(0, start).trim();
    }
  }

  if (!jsonText) return { cleanText: fullText.trim(), insightCards: null, reorder: [] };

  try {
    const parsed = structuredSchema.parse(JSON.parse(jsonText));
    const cards: CopilotInsightCards | null = parsed.insightCards
      ? {
          revenueImpact: parsed.insightCards.revenueImpact,
          inventoryImpact: parsed.insightCards.inventoryImpact,
          riskLevel: parsed.insightCards.riskLevel as Priority,
          recommendedAction: parsed.insightCards.recommendedAction,
        }
      : null;
    return {
      cleanText: cleanText || fullText.trim(),
      insightCards: cards,
      reorder: (parsed.reorder ?? []) as CopilotReorderItem[],
    };
  } catch {
    return { cleanText: cleanText || fullText.trim(), insightCards: null, reorder: [] };
  }
}

/** Hide an unterminated trailing ```json fence while the response is still streaming. */
export function stripStreamingTail(partial: string): string {
  const idx = partial.lastIndexOf("```json");
  if (idx === -1) {
    // also hide a lone dangling ``` that starts a fence
    const bare = partial.lastIndexOf("```");
    if (bare !== -1 && partial.indexOf("```", bare + 3) === -1 && /```\s*$/.test(partial.slice(bare))) {
      return partial.slice(0, bare).trimEnd();
    }
    return partial;
  }
  const closing = partial.indexOf("```", idx + 7);
  return closing === -1 ? partial.slice(0, idx).trimEnd() : partial;
}
