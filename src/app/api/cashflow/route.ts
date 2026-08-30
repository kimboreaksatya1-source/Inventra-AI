import { NextResponse } from "next/server";
import { getSnapshot } from "@/lib/snapshot";
import { buildCashflow } from "@/lib/cashflow";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const snap = await getSnapshot();
    if (!snap) return NextResponse.json({ hasData: false });
    return NextResponse.json(buildCashflow(snap.analysis));
  } catch (err) {
    console.error("[/api/cashflow] error", err);
    return NextResponse.json({ error: "Failed to build cash flow analysis" }, { status: 500 });
  }
}
