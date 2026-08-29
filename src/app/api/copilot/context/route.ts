import { NextResponse } from "next/server";
import { getSnapshot } from "@/lib/snapshot";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const snap = await getSnapshot();
    if (!snap) {
      return NextResponse.json({
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
      });
    }
    return NextResponse.json(snap.copilotContext);
  } catch (err) {
    console.error("[/api/copilot/context] error", err);
    return NextResponse.json({ error: "Failed to load business context" }, { status: 500 });
  }
}
