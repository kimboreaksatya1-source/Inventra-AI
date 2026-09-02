import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSessionUserId, unauthorized } from "@/lib/auth-helpers";
import type { ChatSessionSummary, CopilotLanguage } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const userId = await getSessionUserId();
    if (!userId) return unauthorized();
    const sessions = await db.chatSession.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      include: { _count: { select: { messages: true } } },
    });
    const payload: ChatSessionSummary[] = sessions.map((s) => ({
      id: s.id,
      title: s.title,
      language: s.language as CopilotLanguage,
      updatedAt: s.updatedAt.toISOString(),
      messageCount: s._count.messages,
    }));
    return NextResponse.json({ sessions: payload });
  } catch (err) {
    console.error("[/api/copilot/sessions GET] error", err);
    return NextResponse.json({ error: "Failed to load conversations" }, { status: 500 });
  }
}

const createSchema = z.object({
  language: z.enum(["en", "km"]).default("en"),
  title: z.string().max(120).optional(),
});

export async function POST(req: Request) {
  try {
    const userId = await getSessionUserId();
    if (!userId) return unauthorized();
    const body = await req.json().catch(() => ({}));
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 422 });
    }
    const session = await db.chatSession.create({
      data: {
        userId,
        language: parsed.data.language,
        ...(parsed.data.title ? { title: parsed.data.title } : {}),
      },
    });
    return NextResponse.json({
      session: {
        id: session.id,
        title: session.title,
        language: session.language as CopilotLanguage,
        updatedAt: session.updatedAt.toISOString(),
        messageCount: 0,
      } satisfies ChatSessionSummary,
    });
  } catch (err) {
    console.error("[/api/copilot/sessions POST] error", err);
    return NextResponse.json({ error: "Failed to create conversation" }, { status: 500 });
  }
}
