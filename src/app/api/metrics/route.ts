import { NextResponse } from "next/server";
import { loadData } from "@/lib/data";
import {
  buildOpportunityFeed,
  computeDashboardMetrics,
  computeProductMetrics,
} from "@/lib/inventory";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { products, sales, user } = await loadData();
    if (products.length === 0) {
      return NextResponse.json({ seeded: false });
    }
    const metrics = computeDashboardMetrics(products, sales);
    const feed = buildOpportunityFeed(products, sales);
    const productMetrics = products
      .map((p) => computeProductMetrics({ product: p, sales }))
      .sort((a, b) => b.revenueAtRisk - a.revenueAtRisk);
    return NextResponse.json({
      seeded: true,
      user,
      metrics,
      feed,
      productMetrics,
    });
  } catch (err) {
    console.error("[/api/metrics] error", err);
    return NextResponse.json(
      { error: "Failed to load dashboard metrics" },
      { status: 500 }
    );
  }
}
