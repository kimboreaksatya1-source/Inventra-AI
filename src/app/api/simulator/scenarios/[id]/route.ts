import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { SavedScenario } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const row = await db.scenario.findUnique({ where: { id } });
    if (!row) return NextResponse.json({ error: "Scenario not found" }, { status: 404 });
    return NextResponse.json({
      scenario: {
        id: row.id,
        name: row.name,
        params: row.params as unknown as SavedScenario["params"],
        result: row.result as unknown as SavedScenario["result"],
        createdAt: row.createdAt.toISOString(),
      } satisfies SavedScenario,
    });
  } catch (err) {
    console.error("[/api/simulator/scenarios/[id] GET] error", err);
    return NextResponse.json({ error: "Failed to load scenario" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await db.scenario.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[/api/simulator/scenarios/[id] DELETE] error", err);
    return NextResponse.json({ error: "Failed to delete scenario" }, { status: 500 });
  }
}
