import { NextResponse } from "next/server";
import { analyzeInventory } from "@/lib/analysis";
import { generateBrief } from "@/lib/brief";
import { loadAnalysisInputs } from "@/lib/data";

export const dynamic = "force-dynamic";
// AI call — give it room.
export const maxDuration = 60;

export async function GET() {
  try {
    const { business, products } = await loadAnalysisInputs();
    if (products.length === 0) {
      return NextResponse.json({ hasData: false });
    }
    const analysis = analyzeInventory(products, business);
    const brief = await generateBrief(analysis);
    return NextResponse.json({ hasData: true, brief, analysis });
  } catch (err) {
    console.error("[/api/brief] error", err);
    return NextResponse.json({ error: "Failed to generate business brief" }, { status: 500 });
  }
}
