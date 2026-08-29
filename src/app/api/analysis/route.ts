import { NextResponse } from "next/server";
import { getSnapshot } from "@/lib/snapshot";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const snap = await getSnapshot();
    if (!snap) return NextResponse.json({ hasData: false });
    return NextResponse.json({ hasData: true, analysis: snap.analysis });
  } catch (err) {
    console.error("[/api/analysis] error", err);
    return NextResponse.json({ error: "Failed to analyze inventory" }, { status: 500 });
  }
}
