import { z } from "zod";
import { db } from "@/lib/db";
import { isAIConfigured } from "@/lib/ai";
import { getSnapshot } from "@/lib/snapshot";
import { buildProcurement } from "@/lib/procurement";
import type { CopilotContext } from "@/lib/types";
import {
  buildDeterministicReply,
  buildMessages,
  classify,
  parseStructuredTail,
  streamCopilotReply,
} from "@/lib/copilot";
import { STREAM_SEP as SEP } from "@/lib/copilot/parse";
import { checkGrounding, type GroundingOptions } from "@/lib/copilot/grounding";
import { getSessionUserId, unauthorized } from "@/lib/auth-helpers";
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

/**
 * Intents where the deterministic answer is authoritative and must never vary:
 * the core SME questions. Answered without calling the model at all — instant,
 * identical every time, works offline.
 */
const DETERMINISTIC_INTENTS = new Set(["reorder", "bestsellers", "stopordering", "profit"]);

export async function POST(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) return unauthorized();

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Invalid request" }, { status: 422 });
  }
  const { sessionId, message, language } = parsed.data;
  const isKm = language === "km";

  const session = await db.chatSession.findFirst({
    where: { id: sessionId, userId },
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

  const snap = await getSnapshot(userId);
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
  // Single source of truth for every reorder figure the Copilot quotes.
  const procurement = snap ? buildProcurement(snap.analysis) : null;
  const aiMessages = buildMessages(promptBlock, history, message, language);

  const encoder = new TextEncoder();

  // Deterministic reply — the single source of truth for reorder figures, and
  // (when `blocked`) a hard gate: no data / no sales data / cash-flow without
  // cost data → the AI is NOT consulted at all.
  const fb = buildDeterministicReply(context, message, language, procurement);

  // What the grounding check needs to spot invented products / contradictions.
  const groundingOpts: GroundingOptions = {
    knownProducts: [
      ...(context.evidence ?? []).map((e) => e.subject),
      ...context.criticalProducts.map((p) => p.name),
      ...context.overstockProducts.map((p) => p.name),
      ...context.topSellers.map((p) => p.name),
    ],
    reorderProducts: [
      ...(procurement?.plan ?? []).map((r) => r.name),
      ...context.criticalProducts.map((p) => p.name),
    ],
    reduceProducts: context.overstockProducts.map((p) => p.name),
  };

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (s: string) => controller.enqueue(encoder.encode(s));

      let cleanText = "";
      let insightCards: CopilotInsightCards | null = null;
      let reorder: CopilotReorderItem[] = [];

      const streamDeterministic = async () => {
        cleanText = fb.content;
        insightCards = fb.insightCards;
        reorder = fb.reorder;
        for (const slice of fb.content.match(/[\s\S]{1,24}/g) ?? []) {
          send(slice);
          await sleep(14);
        }
      };

      try {
        // Khmer answers and the core SME questions always use the deterministic
        // engine: instant, identical every time, correct, and works offline.
        // (Routing Khmer through the model tripped checkGrounding() too often and
        // appended the deterministic fallback into the same stream — a confusing
        // "second reply" that was half English. Reverted for demo stability.)
        const useDeterministic =
          fb.blocked ||
          !isAIConfigured() ||
          isKm ||
          DETERMINISTIC_INTENTS.has(classify(message));
        if (useDeterministic) {
          await streamDeterministic();
        } else {
          let full = "";
          for await (const chunk of streamCopilotReply(aiMessages)) {
            full += chunk;
            send(chunk);
          }
          const tail = parseStructuredTail(full);
          cleanText = tail.cleanText;
          insightCards = tail.insightCards;

          // Reorder figures ALWAYS come from the Procurement Engine, never the model.
          reorder = fb.reorder;
          if (!insightCards) insightCards = fb.insightCards;

          // Grounding check — prose AND the insight-card strings.
          const cardText = insightCards
            ? [insightCards.revenueImpact, insightCards.inventoryImpact, insightCards.recommendedAction].join(" | ")
            : "";
          const g1 = checkGrounding(cleanText, promptBlock, context.evidence ?? [], groundingOpts);
          const g2 = cardText
            ? checkGrounding(cardText, promptBlock, context.evidence ?? [], groundingOpts)
            : { grounded: true, reasons: [] };

          if ((!g1.grounded || !g2.grounded) && fb.content) {
            console.warn(
              "[/api/copilot/chat] ungrounded reply replaced —",
              [...g1.reasons, ...g2.reasons].join("; ")
            );
            const noteText = isKm
              ? "\n\n_ខ្ញុំកំពុងជំនួសចម្លើយខាងលើដោយតួលេខផ្ទាល់ពីទិន្នន័យរបស់អ្នក៖_\n\n"
              : "\n\n_Replacing the above with the figures straight from your data:_\n\n";
            send(noteText + fb.content);
            cleanText = fb.content;
            insightCards = fb.insightCards;
          }
        }
      } catch (err) {
        console.error("[/api/copilot/chat] stream error", err);
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
        // Deterministic, never model-authored — safe on every path.
        dashboard: fb.dashboard ?? null,
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
