import { NextResponse } from "next/server";
import { loadData } from "@/lib/data";
import { buildBusinessInsights } from "@/lib/inventory";
import { generateInsightsNarrative } from "@/lib/ai";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET() {
  try {
    const { products, sales } = await loadData();
    if (products.length === 0) {
      return NextResponse.json({ seeded: false });
    }
    const report = buildBusinessInsights(products, sales);
    const narrative = await generateInsightsNarrative(
      { ...(await loadData()) },
      report
    );
    return NextResponse.json({ seeded: true, report: { ...report, summary: narrative } });
  } catch (err) {
    console.error("[/api/insights] error", err);
    return NextResponse.json(
      { error: "Failed to generate business insights" },
      { status: 500 }
    );
  }
}
