import { NextResponse } from "next/server";
import { AI_MODEL, getAIClient, isAIConfigured } from "@/lib/ai";
import { getSnapshot } from "@/lib/snapshot";
import {
  buildDeterministicPurchaseSummary,
  buildProcurement,
  summarizeProcurement,
} from "@/lib/procurement";
import { buildForecastEvidence } from "@/lib/forecast-evidence";
import { loadSalesStats } from "@/lib/data";
import { getSessionUserId, unauthorized } from "@/lib/auth-helpers";
import type { ProcurementPlanResponse } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 45;

const SYSTEM = `You are Inventra AI, an FMCG procurement advisor for a distributor / mini-mart / grocery.
You are handed a PURCHASE PLAN computed from real inventory. Write a tight 2–3 sentence recommendation:
what to order first and why (fast movers about to stock out), the headline purchase cost and the
revenue it protects, and the coverage logic. Refer to products by the exact name + SKU shown — keep
Khmer names in Khmer, never translate. Plain prose, no lists, no headings.`;

export async function POST() {
  try {
    const userId = await getSessionUserId();
    if (!userId) return unauthorized();
    const snap = await getSnapshot(userId);
    if (!snap) return NextResponse.json({ error: "No business data" }, { status: 409 });

    const result = buildProcurement(snap.analysis);
    const noCost = !snap.analysis.dataQuality?.hasCostData;
    const costCaveat = noCost
      ? " No cost prices were imported, so purchase cost is shown as “n/a” — it is not estimated."
      : "";

    let summary = buildDeterministicPurchaseSummary(result) + costCaveat;
    let source: "ai" | "deterministic" = "deterministic";

    if (isAIConfigured() && result.plan.length > 0) {
      try {
        const ai = getAIClient();
        const completion = await ai.chat.completions.create({
          model: AI_MODEL,
          temperature: 0.4,
          messages: [
            { role: "system", content: SYSTEM },
            {
              role: "user",
              content:
                summarizeProcurement(result) +
                (noCost
                  ? "\n\nNOTE: no cost prices were imported. Do NOT state a purchase cost or estimate one — say cost is unavailable."
                  : ""),
            },
          ],
        });
        const text = completion.choices[0]?.message?.content?.trim();
        if (text) {
          summary = text;
          source = "ai";
        }
      } catch (err) {
        console.error("[/api/procurement/plan] AI error", err);
      }
    }

    return NextResponse.json({
      plan: result.plan,
      kpis: result.kpis,
      dataQuality: snap.analysis.dataQuality,
      forecast: buildForecastEvidence(snap.analysis, result, await loadSalesStats(userId)),
      summary,
      source,
    } satisfies ProcurementPlanResponse);
  } catch (err) {
    console.error("[/api/procurement/plan] error", err);
    return NextResponse.json({ error: "Failed to generate the purchase plan" }, { status: 500 });
  }
}
