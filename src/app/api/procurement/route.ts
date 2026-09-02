import { NextResponse } from "next/server";
import { getSnapshot } from "@/lib/snapshot";
import { buildProcurement } from "@/lib/procurement";
import { buildForecastEvidence } from "@/lib/forecast-evidence";
import { loadSalesStats } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const snap = await getSnapshot();
    if (!snap) return NextResponse.json({ hasData: false });
    const procurement = buildProcurement(snap.analysis);
    const stats = await loadSalesStats();
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
