import { NextResponse } from "next/server";
import { loadData } from "@/lib/data";
import { generateAlerts } from "@/lib/inventory";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { products, sales } = await loadData();
    if (products.length === 0) {
      return NextResponse.json({ seeded: false, alerts: [] });
    }
    const alerts = generateAlerts(products, sales);
    return NextResponse.json({ seeded: true, alerts });
  } catch (err) {
    console.error("[/api/alerts] error", err);
    return NextResponse.json({ error: "Failed to load alerts" }, { status: 500 });
  }
}
