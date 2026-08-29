import { NextResponse } from "next/server";
import { analyzeInventory } from "@/lib/analysis";
import { loadAnalysisInputs } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { business, products } = await loadAnalysisInputs();
    if (products.length === 0) {
      return NextResponse.json({ hasData: false });
    }
    return NextResponse.json({
      hasData: true,
      analysis: analyzeInventory(products, business),
    });
  } catch (err) {
    console.error("[/api/analysis] error", err);
    return NextResponse.json({ error: "Failed to analyze inventory" }, { status: 500 });
  }
}
