import { NextResponse } from "next/server";
import { getSnapshot } from "@/lib/snapshot";
import { buildProcurement } from "@/lib/procurement";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const snap = await getSnapshot();
    if (!snap) return NextResponse.json({ hasData: false });
    return NextResponse.json({ hasData: true, ...buildProcurement(snap.analysis) });
  } catch (err) {
    console.error("[/api/procurement] error", err);
    return NextResponse.json({ error: "Failed to build procurement plan" }, { status: 500 });
  }
}
