import { NextResponse } from "next/server";
import { z } from "zod";
import { confidenceLabel, mergeDuplicates, recognizeProducts } from "@/lib/catalog/recognize";
import { assignSkus } from "@/lib/catalog/sku";
import { getSessionUserId, unauthorized } from "@/lib/auth-helpers";
import type { RecognitionEvidence, RecognizeResponse, ReviewProduct, ReviewStatus } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 45;

const rowSchema = z.object({
  sourceRow: z.number().int().nonnegative().optional(),
  name: z.string().min(1).max(300),
  productCode: z.string().max(120).nullish(),
  brand: z.string().max(120).nullish(),
  category: z.string().max(120).nullish(),
  stock: z.number().min(0).max(100_000_000),
  dailySales: z.number().min(0).max(1_000_000).nullish(),
  sellingPrice: z.number().positive().max(10_000_000),
  costPrice: z.number().min(0).max(10_000_000).nullish(),
});

const bodySchema = z.object({
  fileName: z.string().min(1).max(260),
  rows: z.array(rowSchema).min(1).max(3000),
});

export async function POST(req: Request) {
  if (!(await getSessionUserId())) return unauthorized();
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", issues: parsed.error.issues }, { status: 422 });
  }

  const { rows } = parsed.data;

  try {
    const { results, aiUsed } = await recognizeProducts(
      rows.map((r) => ({
        name: r.name,
        productCode: r.productCode ?? null,
        brand: r.brand ?? null,
        category: r.category ?? null,
      }))
    );

    // attach numeric data, then collapse duplicates, then assign SKUs.
    // Missing cost price / daily sales are kept as 0 — NEVER estimated. The
    // analysis layer detects the gap and disables the features that would
    // otherwise need a fabricated value.
    const clamp = (n: number, hi: number) => Math.min(hi, Math.max(0, n));
    const withNumbers = results.map((r, i) => {
      const row = rows[i];
      return {
        ...r,
        stock: clamp(Math.round(row.stock), 100_000_000),
        dailySales: row.dailySales != null && row.dailySales > 0 ? clamp(row.dailySales, 1_000_000) : 0,
        sellingPrice: clamp(row.sellingPrice, 10_000_000),
        costPrice: row.costPrice != null && row.costPrice > 0 ? clamp(row.costPrice, 10_000_000) : 0,
        sourceRows: row.sourceRow != null ? [row.sourceRow] : [],
      };
    });

    const merged = mergeDuplicates(withNumbers);

    // A barcode that lands on two or more different products is untrustworthy — drop it.
    const barcodeCount = new Map<string, number>();
    for (const m of merged) if (m.barcode) barcodeCount.set(m.barcode, (barcodeCount.get(m.barcode) ?? 0) + 1);
    for (const m of merged) if (m.barcode && (barcodeCount.get(m.barcode) ?? 0) > 1) m.barcode = null;
    const skus = assignSkus(
      merged.map((r) => ({ category: r.category, productCode: r.productCode }))
    );

    const products: ReviewProduct[] = merged.map((r, i) => {
      const evidence: RecognitionEvidence =
        r.evidence ??
        {
          source: r.source,
          method: r.source === "ai" ? "ai-suggestion" : "titlecase",
          confidence: r.confidence,
          confidenceLabel: confidenceLabel(r.confidence),
          reason: "Canonical name is your product name, tidied for display.",
          reviewRequired: r.confidence < 0.9,
          reviewReason: r.confidence < 0.9 ? `Recognition confidence is ${confidenceLabel(r.confidence)} (${Math.round(r.confidence * 100)}%).` : undefined,
        };
      // Auto-approve ONLY when the evidence model says review is not required (STEP 5).
      const status: ReviewStatus = evidence.reviewRequired ? "pending" : "approved";
      return {
        originalName: r.originalName,
        canonicalName: r.canonicalName,
        brand: r.brand,
        category: r.category,
        aliases: r.aliases,
        productCode: r.productCode,
        barcode: r.barcode,
        confidence: r.confidence,
        source: r.source,
        evidence,
        mergedCount: r.mergedCount,
        sourceRows: r.sourceRows ?? [],
        variantWarning: r.variantWarning,
        sku: skus[i],
        stock: r.stock,
        dailySales: r.dailySales,
        sellingPrice: r.sellingPrice,
        costPrice: r.costPrice,
        status,
      };
    });

    const payload: RecognizeResponse = {
      products,
      highConfidenceCount: products.filter((p) => !p.evidence?.reviewRequired).length,
      needsReviewCount: products.filter((p) => p.evidence?.reviewRequired).length,
      aiUsed,
      mergedRowCount: Math.max(0, rows.length - products.length),
    };
    return NextResponse.json(payload);
  } catch (err) {
    console.error("[/api/catalog/recognize] error", err);
    return NextResponse.json({ error: "Failed to recognise products" }, { status: 500 });
  }
}
