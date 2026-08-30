import { NextResponse } from "next/server";
import { z } from "zod";
import { AI_MODEL, getAIClient, isAIConfigured } from "@/lib/ai";
import { getSnapshot } from "@/lib/snapshot";
import {
  buildDeterministicExplanation,
  normalizeParams,
  simulateScenario,
  summarizeForPrompt,
} from "@/lib/simulator";
import type { AnalysisInput } from "@/lib/analysis";
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

const SYSTEM = `You are Inventra AI, an inventory advisor for an FMCG business (distributor / mini-mart / grocery).
The owner is testing a HYPOTHETICAL scenario against their real inventory. In 2–3 short paragraphs,
explain in FMCG terms what this scenario would mean for THIS business — fast vs slow movers, days of
cover, cartons to order, category exposure. Each product shows the
owner's ORIGINAL name then a [canonical: …] English name — reason on the canonical name but write the
ORIGINAL name + SKU in your reply (e.g. "កូកាកូឡា 330ml (SKU BEV-001)"), never translated. Use the
dollar figures from the data. Do not restate the raw numbers as a list; interpret them.
Finish with exactly two bold lines:
**Recommended Next Action:** <one concrete step>
**Expected Business Impact:** <the $ / operational outcome>
Respond in GitHub-flavored Markdown. No JSON, no code fences.`;

function toInputs(snap: NonNullable<Awaited<ReturnType<typeof getSnapshot>>>): AnalysisInput[] {
  return snap.analysis.products.map((p) => ({
    id: p.id,
    name: p.name,
    canonicalName: p.canonicalName ?? null,
    brand: p.brand ?? null,
    sku: p.sku ?? null,
    category: p.category,
    stock: p.stock,
    dailySales: p.dailySales,
    sellingPrice: p.sellingPrice,
    costPrice: p.costPrice,
  }));
}

export async function POST(req: Request) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 422 });
  }
  const params = normalizeParams(parsed.data.params);

  try {
    const snap = await getSnapshot();
    if (!snap || snap.analysis.products.length === 0) {
      return NextResponse.json({ error: "No business data" }, { status: 409 });
    }

    const result = simulateScenario(toInputs(snap), params);

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
        { role: "system", content: `BUSINESS SUMMARY (real data):\n${snap.promptBlock}` },
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
      const snap = await getSnapshot();
      if (snap) {
        const result = simulateScenario(toInputs(snap), params);
        return NextResponse.json({
          explanation: buildDeterministicExplanation(result),
          source: "deterministic",
        } satisfies SimulationExplanation);
      }
    } catch {
      /* fall through */
    }
    return NextResponse.json({ error: "Failed to explain scenario" }, { status: 500 });
  }
}
