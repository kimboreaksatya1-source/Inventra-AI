import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import type { SavedScenario } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const rows = await db.scenario.findMany({ orderBy: { createdAt: "desc" }, take: 50 });
    const scenarios: SavedScenario[] = rows.map((r) => ({
      id: r.id,
      name: r.name,
      params: r.params as unknown as SavedScenario["params"],
      result: r.result as unknown as SavedScenario["result"],
      createdAt: r.createdAt.toISOString(),
    }));
    return NextResponse.json({ scenarios });
  } catch (err) {
    console.error("[/api/simulator/scenarios GET] error", err);
    return NextResponse.json({ error: "Failed to load scenarios" }, { status: 500 });
  }
}

const createSchema = z.object({
  name: z.string().min(1).max(120),
  params: z.record(z.string(), z.number()),
  result: z.record(z.string(), z.unknown()),
});

export async function POST(req: Request) {
  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 422 });
  }
  try {
    const row = await db.scenario.create({
      data: {
        name: parsed.data.name,
        params: parsed.data.params as Prisma.InputJsonValue,
        result: parsed.data.result as Prisma.InputJsonValue,
      },
    });
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
    console.error("[/api/simulator/scenarios POST] error", err);
    return NextResponse.json({ error: "Failed to save scenario" }, { status: 500 });
  }
}
