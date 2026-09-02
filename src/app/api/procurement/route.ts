import { NextResponse } from "next/server";
import { getSnapshot } from "@/lib/snapshot";
import { buildProcurement } from "@/lib/procurement";
import { buildForecastEvidence } from "@/lib/forecast-evidence";
import { loadSalesStats } from "@/lib/data";
import { getSessionUserId, unauthorized } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const userId = await getSessionUserId();
    if (!userId) return unauthorized();
    const snap = await getSnapshot(userId);
    if (!snap) return NextResponse.json({ hasData: false });
    const procurement = buildProcurement(snap.analysis);
    const stats = await loadSalesStats(userId);
    return NextResponse.json({
      hasData: true,
      dataQuality: snap.analysis.dataQuality,
      forecast: buildForecastEvidence(snap.analysis, procurement, stats),
      ...procurement,
    });
  } catch (err) {
    console.error("[/api/procurement] error", err);
    return NextResponse.json({ error: "Failed to build procurement plan" }, { status: 500 });
  }
}
