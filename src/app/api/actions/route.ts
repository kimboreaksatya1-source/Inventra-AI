import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { AI_MODEL, getAIClient, isAIConfigured } from "@/lib/ai";
import { loadAnalysisInputs } from "@/lib/data";
import { analyzeInventory } from "@/lib/analysis";
import { buildDeterministicBrief } from "@/lib/brief";
import { buildCopilotContext } from "@/lib/copilot-context";
import { buildDeterministicBriefing, generateActions, summarizeActions } from "@/lib/actions";
import type {
  ActionCenterPayload,
  ActionStatus,
  BusinessAction,
  Priority,
  ResolvedAction,
} from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 45;

const EMPTY_GROUPS = (): Record<Priority, BusinessAction[]> => ({
  CRITICAL: [],
  HIGH: [],
  MEDIUM: [],
  LOW: [],
});

const BRIEFING_SYSTEM = `You are Inventra AI writing the opening lines of a business owner's action list.
Write 2–3 confident sentences: what is most urgent, the single headline dollar figure, and a
forward-looking close. Reference real product names. No lists, no headings, plain prose.`;

export async function GET() {
  try {
    const { business, products } = await loadAnalysisInputs();

    const states = await db.actionState.findMany();
    const stateByKey = new Map(states.map((s) => [s.actionKey, s]));

    if (products.length === 0) {
      return NextResponse.json({
        hasData: false,
        generatedAt: new Date().toISOString(),
        briefing: "",
        briefingSource: "deterministic",
        groups: EMPTY_GROUPS(),
        resolved: [],
        totals: {
          revenueProtected: 0,
          opportunitiesCaptured: 0,
          revenueAtStake: 0,
          opportunityAvailable: 0,
          openCount: 0,
          completedCount: 0,
          dismissedCount: 0,
        },
      } satisfies ActionCenterPayload);
    }

    const analysis = analyzeInventory(products, business);
    const brief = buildDeterministicBrief(analysis);
    const drafts = generateActions({ products, analysis, brief });
    const summary = summarizeActions(drafts);

    const groups = EMPTY_GROUPS();
    for (const d of drafts) {
      const st = stateByKey.get(d.key);
      const status: ActionStatus = (st?.status as ActionStatus) ?? "open";
      if (status === "completed" || status === "dismissed") continue;
      groups[d.priority].push({ ...d, status, note: st?.note ?? null });
    }
    // saved actions float to the top of their group
    for (const p of Object.keys(groups) as Priority[]) {
      groups[p].sort((a, b) => {
        if ((a.status === "saved") !== (b.status === "saved")) return a.status === "saved" ? -1 : 1;
        return b.impactValue - a.impactValue || b.confidence - a.confidence;
      });
    }

    // resolved = completed/dismissed states (whether or not still generated)
    const resolved: ResolvedAction[] = states
      .filter((s) => s.status === "completed" || s.status === "dismissed")
      .map((s) => {
        const draft = drafts.find((d) => d.key === s.actionKey);
        return {
          key: s.actionKey,
          status: s.status as ActionStatus,
          category: (draft?.category ?? s.category) as ResolvedAction["category"],
          impactValue: draft?.impactValue ?? s.impactValue,
          note: s.note,
          updatedAt: s.updatedAt.toISOString(),
          recommendation: draft?.recommendation,
        };
      })
      .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));

    const openActions = Object.values(groups).flat();
    const completed = resolved.filter((r) => r.status === "completed");

    const totals = {
      revenueProtected: Math.round(
        completed
          .filter((r) => r.category !== "opportunity")
          .reduce((s, r) => s + r.impactValue, 0)
      ),
      opportunitiesCaptured: Math.round(
        completed.filter((r) => r.category === "opportunity").reduce((s, r) => s + r.impactValue, 0)
      ),
      revenueAtStake: Math.round(
        openActions
          .filter((a) => a.category !== "opportunity")
          .reduce((s, a) => s + a.impactValue, 0)
      ),
      opportunityAvailable: Math.round(
        openActions.filter((a) => a.category === "opportunity").reduce((s, a) => s + a.impactValue, 0)
      ),
      openCount: openActions.length,
      completedCount: completed.length,
      dismissedCount: resolved.filter((r) => r.status === "dismissed").length,
    };

    // AI briefing
    let briefing = buildDeterministicBriefing(summary);
    let briefingSource: "ai" | "deterministic" = "deterministic";
    if (isAIConfigured() && openActions.length > 0) {
      try {
        const { promptBlock } = await buildCopilotContext();
        const ai = getAIClient();
        const completion = await ai.chat.completions.create({
          model: AI_MODEL,
          temperature: 0.4,
          messages: [
            { role: "system", content: BRIEFING_SYSTEM },
            { role: "system", content: `BUSINESS SUMMARY:\n${promptBlock}` },
            { role: "user", content: `${summary.text}\n\nWrite the opening of the owner's action list.` },
          ],
        });
        const text = completion.choices[0]?.message?.content?.trim();
        if (text) {
          briefing = text;
          briefingSource = "ai";
        }
      } catch (err) {
        console.error("[/api/actions] briefing AI error", err);
      }
    }

    return NextResponse.json({
      hasData: true,
      generatedAt: new Date().toISOString(),
      briefing,
      briefingSource,
      groups,
      resolved,
      totals,
    } satisfies ActionCenterPayload);
  } catch (err) {
    console.error("[/api/actions] error", err);
    return NextResponse.json({ error: "Failed to build the action center" }, { status: 500 });
  }
}
