import { NextResponse } from "next/server";
import { buildCopilotContext } from "@/lib/copilot-context";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { context } = await buildCopilotContext();
    return NextResponse.json(context);
  } catch (err) {
    console.error("[/api/copilot/context] error", err);
    return NextResponse.json(
      { error: "Failed to load business context" },
      { status: 500 }
    );
  }
}
