import { z } from "zod";
import { db } from "@/lib/db";
import { isAIConfigured } from "@/lib/ai";
import { getSnapshot } from "@/lib/snapshot";
import type { CopilotContext } from "@/lib/types";
import {
  buildDeterministicReply,
  buildMessages,
  parseStructuredTail,
  streamCopilotReply,
} from "@/lib/copilot";
import { STREAM_SEP as SEP } from "@/lib/copilot-parse";
import type {
  CopilotInsightCards,
  CopilotReorderItem,
  CopilotStreamMeta,
} from "@/lib/types";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const bodySchema = z.object({
  sessionId: z.string().min(1),
  message: z.string().min(1).max(2000),
  language: z.enum(["en", "km"]).default("en"),
});

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function POST(req: Request) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Invalid request" }, { status: 422 });
  }
  const { sessionId, message, language } = parsed.data;

  const session = await db.chatSession.findUnique({
    where: { id: sessionId },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
  if (!session) {
    return Response.json({ error: "Conversation not found" }, { status: 404 });
  }

  const history = session.messages.map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));

  // Persist the user's message immediately.
  await db.chatMessage.create({
    data: { sessionId, role: "user", content: message, language },
  });

  const snap = await getSnapshot();
  const EMPTY_CONTEXT: CopilotContext = {
    business: "Your Business",
    hasData: false,
    productCount: 0,
    healthScore: 0,
    healthLabel: "No Data",
    revenueAtRisk: 0,
    inventoryValue: 0,
    criticalProducts: [],
    overstockProducts: [],
    recommendedActions: [],
    opportunities: [],
    topSellers: [],
  };
  const context: CopilotContext = snap?.copilotContext ?? EMPTY_CONTEXT;
  const promptBlock = snap?.promptBlock ?? `BUSINESS SUMMARY\nNo product data has been imported yet.`;
  const aiMessages = buildMessages(promptBlock, history, message, language);

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (s: string) => controller.enqueue(encoder.encode(s));

      let cleanText = "";
      let insightCards: CopilotInsightCards | null = null;
      let reorder: CopilotReorderItem[] = [];

      try {
        if (isAIConfigured()) {
          let full = "";
          for await (const chunk of streamCopilotReply(aiMessages)) {
            full += chunk;
            send(chunk);
          }
          const tail = parseStructuredTail(full);
          cleanText = tail.cleanText;
          insightCards = tail.insightCards;
          reorder = tail.reorder;

          // Backfill structure from the deterministic engine if the model omitted it.
          if (!insightCards) {
            const fb = buildDeterministicReply(context, message, language);
            insightCards = fb.insightCards;
            if (reorder.length === 0) reorder = fb.reorder;
          }
        } else {
          const fb = buildDeterministicReply(context, message, language);
          cleanText = fb.content;
          insightCards = fb.insightCards;
          reorder = fb.reorder;
          for (const slice of fb.content.match(/[\s\S]{1,24}/g) ?? []) {
            send(slice);
            await sleep(14);
          }
        }
      } catch (err) {
        console.error("[/api/copilot/chat] stream error", err);
        const fb = buildDeterministicReply(context, message, language);
        cleanText = fb.content;
        insightCards = fb.insightCards;
        reorder = fb.reorder;
        send((cleanText ? "\n\n" : "") + cleanText);
      }

      // Persist the assistant message.
      let messageId = "";
      try {
        const saved = await db.chatMessage.create({
          data: {
            sessionId,
            role: "assistant",
            content: cleanText,
            insightCards: (insightCards ?? undefined) as Prisma.InputJsonValue | undefined,
            reorder: (reorder.length ? reorder : undefined) as Prisma.InputJsonValue | undefined,
            language,
          },
        });
        messageId = saved.id;
      } catch (err) {
        console.error("[/api/copilot/chat] persist error", err);
      }

      // Title from the first user message; otherwise just touch updatedAt.
      let title = session.title;
      try {
        if (title === "New conversation") {
          title = message.trim().slice(0, 60);
          await db.chatSession.update({ where: { id: sessionId }, data: { title, language } });
        } else {
          await db.chatSession.update({
            where: { id: sessionId },
            data: { updatedAt: new Date(), language },
          });
        }
      } catch (err) {
        console.error("[/api/copilot/chat] session update error", err);
      }

      const meta: CopilotStreamMeta = {
        type: "meta",
        sessionId,
        messageId,
        title,
        content: cleanText,
        insightCards,
        reorder,
      };
      send(`\n${SEP}${JSON.stringify(meta)}${SEP}`);
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Accel-Buffering": "no",
    },
  });
}
