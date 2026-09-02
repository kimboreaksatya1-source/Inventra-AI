import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSessionUserId, unauthorized } from "@/lib/auth-helpers";
import type {
  CopilotInsightCards,
  CopilotLanguage,
  CopilotMessage,
  CopilotReorderItem,
} from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getSessionUserId();
    if (!userId) return unauthorized();
    const { id } = await params;
    const session = await db.chatSession.findFirst({
      where: { id, userId },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    });
    if (!session) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }
    const messages: CopilotMessage[] = session.messages.map((m) => ({
      id: m.id,
      role: m.role as "user" | "assistant",
      content: m.content,
      insightCards: (m.insightCards as CopilotInsightCards | null) ?? null,
      reorder: (m.reorder as CopilotReorderItem[] | null) ?? null,
      language: m.language as CopilotLanguage,
      createdAt: m.createdAt.toISOString(),
    }));
    return NextResponse.json({
      session: {
        id: session.id,
        title: session.title,
        language: session.language as CopilotLanguage,
      },
      messages,
    });
  } catch (err) {
    console.error("[/api/copilot/sessions/[id] GET] error", err);
    return NextResponse.json({ error: "Failed to load conversation" }, { status: 500 });
  }
}

const patchSchema = z.object({
  title: z.string().min(1).max(120).optional(),
  language: z.enum(["en", "km"]).optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getSessionUserId();
    if (!userId) return unauthorized();
    const { id } = await params;
    const parsed = patchSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success || (!parsed.data.title && !parsed.data.language)) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 422 });
    }
    const { count } = await db.chatSession.updateMany({
      where: { id, userId },
      data: parsed.data,
    });
    if (count === 0) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, session: { id, ...parsed.data } });
  } catch (err) {
    console.error("[/api/copilot/sessions/[id] PATCH] error", err);
    return NextResponse.json({ error: "Failed to update conversation" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getSessionUserId();
    if (!userId) return unauthorized();
    const { id } = await params;
    const { count } = await db.chatSession.deleteMany({ where: { id, userId } });
    if (count === 0) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[/api/copilot/sessions/[id] DELETE] error", err);
    return NextResponse.json({ error: "Failed to delete conversation" }, { status: 500 });
  }
}
