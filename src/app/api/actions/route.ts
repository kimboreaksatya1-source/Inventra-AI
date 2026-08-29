import { NextResponse } from "next/server";
import { getActionStates } from "@/lib/action-state";
import { getSnapshot } from "@/lib/snapshot";
import type {
  ActionCenterPayload,
  ActionStatus,
  BusinessAction,
  Priority,
  ResolvedAction,
} from "@/lib/types";

export const dynamic = "force-dynamic";

const EMPTY_GROUPS = (): Record<Priority, BusinessAction[]> => ({
  CRITICAL: [],
  HIGH: [],
  MEDIUM: [],
  LOW: [],
});

export async function GET() {
  try {
    const [snap, states] = await Promise.all([getSnapshot(), getActionStates()]);
    const stateByKey = new Map(states.map((s) => [s.actionKey, s]));

    if (!snap) {
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

    const drafts = snap.actionDrafts;

    const groups = EMPTY_GROUPS();
    for (const d of drafts) {
      const st = stateByKey.get(d.key);
      const status: ActionStatus = (st?.status as ActionStatus) ?? "open";
      if (status === "completed" || status === "dismissed") continue;
      groups[d.priority].push({ ...d, status, note: st?.note ?? null });
    }
    for (const p of Object.keys(groups) as Priority[]) {
      groups[p].sort((a, b) => {
        if ((a.status === "saved") !== (b.status === "saved")) return a.status === "saved" ? -1 : 1;
        return b.impactValue - a.impactValue || b.confidence - a.confidence;
      });
    }

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
        completed.filter((r) => r.category !== "opportunity").reduce((s, r) => s + r.impactValue, 0)
      ),
      opportunitiesCaptured: Math.round(
        completed.filter((r) => r.category === "opportunity").reduce((s, r) => s + r.impactValue, 0)
      ),
      revenueAtStake: Math.round(
        openActions.filter((a) => a.category !== "opportunity").reduce((s, a) => s + a.impactValue, 0)
      ),
      opportunityAvailable: Math.round(
        openActions.filter((a) => a.category === "opportunity").reduce((s, a) => s + a.impactValue, 0)
      ),
      openCount: openActions.length,
      completedCount: completed.length,
      dismissedCount: resolved.filter((r) => r.status === "dismissed").length,
    };

    return NextResponse.json({
      hasData: true,
      generatedAt: new Date().toISOString(),
      briefing: snap.actionsBriefing,
      briefingSource: snap.briefingSource,
      groups,
      resolved,
      totals,
    } satisfies ActionCenterPayload);
  } catch (err) {
    console.error("[/api/actions] error", err);
    return NextResponse.json({ error: "Failed to build the action center" }, { status: 500 });
  }
}
