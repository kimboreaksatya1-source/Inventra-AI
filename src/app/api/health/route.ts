import { NextResponse } from "next/server";
import { loadData } from "@/lib/data";
import { computeInventoryHealth } from "@/lib/inventory";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { products, sales } = await loadData();
    if (products.length === 0) {
      return NextResponse.json({ seeded: false });
    }
    const health = computeInventoryHealth(products, sales);
    return NextResponse.json({ seeded: true, health });
  } catch (err) {
    console.error("[/api/health] error", err);
    return NextResponse.json({ error: "Failed to load inventory health" }, { status: 500 });
  }
}
