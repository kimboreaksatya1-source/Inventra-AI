import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { bustActionStates } from "@/lib/action-state";
import { getSessionUserId, unauthorized } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  status: z.enum(["open", "saved", "completed", "dismissed"]),
  note: z.string().max(2000).optional(),
  impactValue: z.number().optional(),
  category: z.string().max(40).optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ key: string }> }
) {
  const userId = await getSessionUserId();
  if (!userId) return unauthorized();
  const { key } = await params;
  const actionKey = decodeURIComponent(key);
  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 422 });
  }
  const { status, note, impactValue, category } = parsed.data;

  try {
    const row = await db.actionState.upsert({
      where: { userId_actionKey: { userId, actionKey } },
      create: {
        userId,
        actionKey,
        status,
        note: note ?? null,
        impactValue: impactValue ?? 0,
        category: category ?? "",
      },
      update: {
        status,
        ...(note !== undefined ? { note } : {}),
        ...(impactValue !== undefined ? { impactValue } : {}),
        ...(category !== undefined ? { category } : {}),
      },
    });
    bustActionStates(userId);
    return NextResponse.json({
      ok: true,
      state: { actionKey: row.actionKey, status: row.status, note: row.note },
    });
  } catch (err) {
    console.error("[/api/actions/[key] PATCH] error", err);
    return NextResponse.json({ error: "Failed to update action" }, { status: 500 });
  }
}
