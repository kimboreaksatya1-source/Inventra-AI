import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSessionUserId, unauthorized } from "@/lib/auth-helpers";
import type { ChatSessionSummary, CopilotLanguage } from "@/lib/types";

export const dynamic = "force-dynamic";

/** The user's current (most recent) inventory dataset. */
async function currentDataset(userId: string) {
  return db.importBatch.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
}

export async function GET() {
  try {
    const userId = await getSessionUserId();
    if (!userId) return unauthorized();

    const [sessions, dataset] = await Promise.all([
      db.chatSession.findMany({
        where: { userId },
        orderBy: { updatedAt: "desc" },
        include: { _count: { select: { messages: true } } },
      }),
      currentDataset(userId),
    ]);

    const sessionsPayload: ChatSessionSummary[] = sessions.map((s) => ({
      id: s.id,
      title: s.title,
      language: s.language as CopilotLanguage,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
      messageCount: s._count.messages,
      datasetId: s.datasetId,
      datasetName: s.datasetName,
      datasetUploadedAt: s.datasetUploadedAt?.toISOString() ?? null,
      datasetProductCount: s.datasetProductCount,
      // Legacy sessions (datasetId null) are never stale — treated as current.
      stale: !!s.datasetId && !!dataset && s.datasetId !== dataset.id,
    }));

    return NextResponse.json({
      sessions: sessionsPayload,
      currentDatasetId: dataset?.id ?? null,
    });
  } catch (err) {
    console.error("[/api/copilot/sessions GET] error", err);
    return NextResponse.json({ error: "Failed to load conversations" }, { status: 500 });
  }
}

const createSchema = z.object({
  language: z.enum(["en", "km"]).default("en"),
  title: z.string().max(120).optional(),
  /** Bind to a specific dataset; defaults to the user's current dataset. */
  datasetId: z.string().optional(),
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

    const dataset = parsed.data.datasetId
      ? await db.importBatch.findFirst({
          where: { id: parsed.data.datasetId, userId },
        })
      : await currentDataset(userId);
    const productCount = dataset ? await db.product.count({ where: { userId } }) : null;

    const session = await db.chatSession.create({
      data: {
        userId,
        language: parsed.data.language,
        ...(parsed.data.title ? { title: parsed.data.title } : {}),
        datasetId: dataset?.id ?? null,
        datasetName: dataset?.fileName ?? null,
        datasetUploadedAt: dataset?.createdAt ?? null,
        datasetProductCount: productCount,
      },
    });

    return NextResponse.json({
      session: {
        id: session.id,
        title: session.title,
        language: session.language as CopilotLanguage,
        createdAt: session.createdAt.toISOString(),
        updatedAt: session.updatedAt.toISOString(),
        messageCount: 0,
        datasetId: session.datasetId,
        datasetName: session.datasetName,
        datasetUploadedAt: session.datasetUploadedAt?.toISOString() ?? null,
        datasetProductCount: session.datasetProductCount,
        stale: false,
      } satisfies ChatSessionSummary,
    });
  } catch (err) {
    console.error("[/api/copilot/sessions POST] error", err);
    return NextResponse.json({ error: "Failed to create conversation" }, { status: 500 });
  }
}
