import { NextResponse } from "next/server";
import { loadData } from "@/lib/data";
import {
  computeProductMetrics,
  generateRecommendations,
  suggestedOrderQuantity,
} from "@/lib/inventory";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { products, sales } = await loadData();
    if (products.length === 0) {
      return NextResponse.json({ seeded: false, products: [], recommendations: [] });
    }
    const metrics = products
      .map((p) => {
        const m = computeProductMetrics({ product: p, sales });
        return {
          ...m,
          suggestedOrder: suggestedOrderQuantity(m.averageDailySales, p.stockQuantity),
        };
      })
      .sort((a, b) => b.revenueAtRisk - a.revenueAtRisk);
    const recommendations = generateRecommendations(products, sales);
    return NextResponse.json({
      seeded: true,
      products: metrics,
      recommendations,
    });
  } catch (err) {
    console.error("[/api/products] error", err);
    return NextResponse.json({ error: "Failed to load products" }, { status: 500 });
  }
}
