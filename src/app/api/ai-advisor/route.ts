import { NextResponse } from "next/server";
import { loadData } from "@/lib/data";
import { askAdvisor } from "@/lib/ai";
import { z } from "zod";

export const dynamic = "force-dynamic";

const BodySchema = z.object({
  message: z.string().min(1).max(2000),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
      })
    )
    .max(20)
    .optional()
    .default([]),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const { products } = await loadData();
    if (products.length === 0) {
      return NextResponse.json({ seeded: false });
    }
    const data = await loadData();
    const { content, insight } = await askAdvisor(
      parsed.data.message,
      parsed.data.history,
      data
    );
    return NextResponse.json({
      reply: content,
      insight,
      createdAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[/api/ai-advisor] error", err);
    return NextResponse.json(
      { error: "The AI advisor is temporarily unavailable. Please try again." },
      { status: 500 }
    );
  }
}
