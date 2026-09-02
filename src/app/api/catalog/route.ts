import { NextResponse } from "next/server";
import { loadCatalog } from "@/lib/catalog/catalog-data";
import { getSessionUserId, unauthorized } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const userId = await getSessionUserId();
    if (!userId) return unauthorized();
    return NextResponse.json(await loadCatalog(userId));
  } catch (err) {
    console.error("[/api/catalog] error", err);
    return NextResponse.json({ error: "Failed to load the catalog" }, { status: 500 });
  }
}
