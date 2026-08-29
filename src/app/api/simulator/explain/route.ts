import { NextResponse } from "next/server";
import { z } from "zod";
import { AI_MODEL, getAIClient, isAIConfigured } from "@/lib/ai";
import { buildCopilotContext } from "@/lib/copilot-context";
import {
  buildDeterministicExplanation,
  normalizeParams,
  simulateScenario,
  summarizeForPrompt,
} from "@/lib/simulator";
import { loadAnalysisInputs } from "@/lib/data";
import type { SimulationExplanation } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 45;

const paramsSchema = z.object({
  demandGrowthPct: z.number(),
  salesIncreasePct: z.number(),
  seasonalMultiplier: z.number(),
  supplierDelayDays: z.number(),
  reorderQuantity: z.number(),
});

const bodySchema = z.object({ params: paramsSchema });

const SYSTEM = `You are Inventra AI, a business consultant for a Cambodian SME owner.
The owner is testing a HYPOTHETICAL scenario against their real inventory. In 2–3 short paragraphs,
explain in plain language what this scenario would mean for THIS business. Each product shows the
owner's ORIGINAL name then a [canonical: …] English name — reason on the canonical name but write the
ORIGINAL name + SKU in your reply (e.g. "កូកាកូឡា 330ml (SKU BEV-001)"), never translated. Use the
dollar figures from the data. Do not restate the raw numbers as a list; interpret them.
Finish with exactly two bold lines:
**Recommended Next Action:** <one concrete step>
**Expected Business Impact:** <the $ / operational outcome>
Respond in GitHub-flavored Markdown. No JSON, no code fences.`;

export async function POST(req: Request) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 422 });
  }

  const params = normalizeParams(parsed.data.params);

  try {
    const [{ products }, { promptBlock }] = await Promise.all([
      loadAnalysisInputs(),
      buildCopilotContext(),
    ]);

    if (products.length === 0) {
      return NextResponse.json({ error: "No business data" }, { status: 409 });
    }

    const result = simulateScenario(products, params);

    if (!isAIConfigured()) {
      return NextResponse.json({
        explanation: buildDeterministicExplanation(result),
        source: "deterministic",
      } satisfies SimulationExplanation);
    }

    const ai = getAIClient();
    const completion = await ai.chat.completions.create({
      model: AI_MODEL,
      temperature: 0.4,
      messages: [
        { role: "system", content: SYSTEM },
        { role: "system", content: `BUSINESS SUMMARY (real data):\n${promptBlock}` },
        { role: "user", content: `${summarizeForPrompt(result)}\n\nExplain this scenario for the owner.` },
      ],
    });
    const text = completion.choices[0]?.message?.content?.trim();
    return NextResponse.json({
      explanation: text || buildDeterministicExplanation(result),
      source: text ? "ai" : "deterministic",
    } satisfies SimulationExplanation);
  } catch (err) {
    console.error("[/api/simulator/explain] error", err);
    try {
      const { products } = await loadAnalysisInputs();
      const result = simulateScenario(products, params);
      return NextResponse.json({
        explanation: buildDeterministicExplanation(result),
        source: "deterministic",
      } satisfies SimulationExplanation);
    } catch {
      return NextResponse.json({ error: "Failed to explain scenario" }, { status: 500 });
    }
  }
}
