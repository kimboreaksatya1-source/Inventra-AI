import { NextResponse } from "next/server";
import { loadData } from "@/lib/data";
import { computeProductMetrics, forecastProduct } from "@/lib/inventory";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const horizon = parseInt(searchParams.get("horizon") || "7", 10);
    const { products, sales } = await loadData();
    if (products.length === 0) {
      return NextResponse.json({ seeded: false, forecasts: [] });
    }
    const forecasts = products
      .map((p) => forecastProduct(p, sales, horizon))
      .sort((a, b) => b.stockoutProbability - a.stockoutProbability);
    const metrics = products.map((p) => computeProductMetrics({ product: p, sales }));
    // aggregate demand curve
    const agg = forecasts[0]?.points.map((_, i) => {
      let demand = 0;
      let lower = 0;
      let upper = 0;
      let probSum = 0;
      for (const f of forecasts) {
        demand += f.points[i].demand;
        lower += f.points[i].lower;
        upper += f.points[i].upper;
        probSum += f.points[i].stockoutProbability;
      }
      return {
        label: forecasts[0].points[i].label,
        demand: Math.round(demand * 10) / 10,
        lower: Math.round(lower * 10) / 10,
        upper: Math.round(upper * 10) / 10,
        avgStockoutProbability: Math.round(probSum / forecasts.length),
      };
    }) ?? [];
    return NextResponse.json({
      seeded: true,
      horizon,
      forecasts,
      aggregate: agg,
      metrics,
    });
  } catch (err) {
    console.error("[/api/forecast] error", err);
    return NextResponse.json({ error: "Failed to load forecast" }, { status: 500 });
  }
}
