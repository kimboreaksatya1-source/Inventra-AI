import { NextResponse } from "next/server";
import { getSnapshot, refreshSnapshotAI } from "@/lib/snapshot";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: Request) {
  try {
    const refresh = new URL(req.url).searchParams.get("refresh") === "1";
    if (refresh) await refreshSnapshotAI();

    const snap = await getSnapshot();
    if (!snap) return NextResponse.json({ hasData: false });

    return NextResponse.json({
      hasData: true,
      brief: snap.brief,
      analysis: snap.analysis,
      aiStale: snap.aiStale,
    });
  } catch (err) {
    console.error("[/api/brief] error", err);
    return NextResponse.json({ error: "Failed to generate business brief" }, { status: 500 });
  }
}
