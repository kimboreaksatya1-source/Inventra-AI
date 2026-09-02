import { NextResponse } from "next/server";
import { commitImport } from "@/lib/import";
import { importPayloadSchema } from "@/lib/validation";
import { getSessionUserId, unauthorized } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) return unauthorized();
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = importPayloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 422 }
    );
  }

  try {
    const result = await commitImport(userId, parsed.data);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[/api/import] error", err);
    return NextResponse.json(
      { error: "Failed to save imported data" },
      { status: 500 }
    );
  }
}
