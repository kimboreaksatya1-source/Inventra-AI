import { NextResponse } from "next/server";
import { z } from "zod";
import { mergeDuplicates, recognizeProducts } from "@/lib/catalog/recognize";
import { assignSkus } from "@/lib/catalog/sku";
import type { RecognizeResponse, ReviewProduct, ReviewStatus } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 45;

const rowSchema = z.object({
  name: z.string().min(1).max(300),
  productCode: z.string().max(120).nullish(),
  brand: z.string().max(120).nullish(),
  category: z.string().max(120).nullish(),
  stock: z.number().min(0),
  dailySales: z.number().min(0).nullish(),
  sellingPrice: z.number().positive(),
  costPrice: z.number().min(0).nullish(),
});

const bodySchema = z.object({
  fileName: z.string().min(1).max(260),
  rows: z.array(rowSchema).min(1).max(3000),
});

export async function POST(req: Request) {
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

    // attach numeric data, then collapse duplicates, then assign SKUs
    const withNumbers = results.map((r, i) => {
      const row = rows[i];
      const costPrice =
        row.costPrice && row.costPrice > 0
          ? row.costPrice
          : Math.round(row.sellingPrice * 0.7 * 100) / 100;
      return {
        ...r,
        stock: Math.max(0, Math.round(row.stock)),
        dailySales: Math.max(0, row.dailySales ?? 0),
        sellingPrice: row.sellingPrice,
        costPrice,
      };
    });

    const merged = mergeDuplicates(withNumbers);
    const skus = assignSkus(
      merged.map((r) => ({ category: r.category, productCode: r.productCode }))
    );

    const products: ReviewProduct[] = merged.map((r, i) => {
      const status: ReviewStatus = r.confidence >= 0.9 ? "approved" : "pending";
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
        mergedCount: r.mergedCount,
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
      highConfidenceCount: products.filter((p) => p.confidence >= 0.9).length,
      needsReviewCount: products.filter((p) => p.confidence < 0.9).length,
      aiUsed,
    };
    return NextResponse.json(payload);
  } catch (err) {
    console.error("[/api/catalog/recognize] error", err);
    return NextResponse.json({ error: "Failed to recognise products" }, { status: 500 });
  }
}
