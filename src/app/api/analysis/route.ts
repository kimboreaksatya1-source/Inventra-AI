import { NextResponse } from "next/server";
import { getSnapshot } from "@/lib/snapshot";
import { getSessionUserId, unauthorized } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const userId = await getSessionUserId();
    if (!userId) return unauthorized();
    const snap = await getSnapshot(userId);
    if (!snap) return NextResponse.json({ hasData: false });
    return NextResponse.json({ hasData: true, analysis: snap.analysis });
  } catch (err) {
    console.error("[/api/analysis] error", err);
    return NextResponse.json({ error: "Failed to analyze inventory" }, { status: 500 });
  }
}
