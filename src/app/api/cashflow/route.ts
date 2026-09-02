import { NextResponse } from "next/server";
import { getSnapshot } from "@/lib/snapshot";
import { buildCashflow } from "@/lib/cashflow";
import { getSessionUserId, unauthorized } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const userId = await getSessionUserId();
    if (!userId) return unauthorized();
    const snap = await getSnapshot(userId);
    if (!snap) return NextResponse.json({ hasData: false });
    return NextResponse.json({
      ...buildCashflow(snap.analysis),
      dataQuality: snap.analysis.dataQuality,
    });
  } catch (err) {
    console.error("[/api/cashflow] error", err);
    return NextResponse.json({ error: "Failed to build cash flow analysis" }, { status: 500 });
  }
}
