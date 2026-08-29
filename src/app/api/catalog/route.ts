import { NextResponse } from "next/server";
import { loadCatalog } from "@/lib/catalog/catalog-data";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(await loadCatalog());
  } catch (err) {
    console.error("[/api/catalog] error", err);
    return NextResponse.json({ error: "Failed to load the catalog" }, { status: 500 });
  }
}
