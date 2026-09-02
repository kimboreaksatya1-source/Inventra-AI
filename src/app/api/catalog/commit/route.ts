import { NextResponse } from "next/server";
import { z } from "zod";
import { commitCatalog } from "@/lib/import";
import type { ReviewProduct } from "@/lib/types";

export const dynamic = "force-dynamic";

const productSchema = z.object({
  originalName: z.string().min(1).max(300),
  canonicalName: z.string().max(300),
  brand: z.string().max(120),
  category: z.string().max(120),
  aliases: z.array(z.string().max(300)).max(200).default([]),
  productCode: z.string().max(120).nullable(),
  barcode: z.string().max(64).nullable(),
  confidence: z.number().min(0).max(1),
  source: z.enum(["kb", "rules", "ai", "manual"]),
  mergedCount: z.number().optional(),
  sourceRows: z.array(z.number()).optional(),
  variantWarning: z.string().optional(),
  evidence: z
    .object({
      source: z.string().max(20).optional(),
      method: z.string().max(40).optional(),
      confidenceLabel: z.string().max(20).optional(),
      reason: z.string().max(1000).optional(),
      reviewRequired: z.boolean().optional(),
      reviewReason: z.string().max(600).optional(),
      matchedAlias: z.string().max(300).optional(),
      matchedCanonical: z.string().max(300).optional(),
    })
    .passthrough()
    .optional(),
  sku: z.string().min(1).max(64),
  stock: z.number().min(0).max(100_000_000),
  dailySales: z.number().min(0).max(1_000_000),
  sellingPrice: z.number().positive().max(10_000_000),
  costPrice: z.number().min(0).max(10_000_000),
  status: z.enum(["approved", "pending", "ignored"]),
});

const bodySchema = z.object({
  fileName: z.string().min(1).max(260),
  products: z.array(productSchema).min(1).max(3000),
});

export async function POST(req: Request) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", issues: parsed.error.issues }, { status: 422 });
  }

  const kept = parsed.data.products.filter((p) => p.status !== "ignored");
  if (kept.length === 0) {
    return NextResponse.json({ error: "No products to import" }, { status: 422 });
  }

  try {
    const result = await commitCatalog(parsed.data.fileName, parsed.data.products as ReviewProduct[]);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[/api/catalog/commit] error", err);
    return NextResponse.json({ error: "Failed to save the catalog" }, { status: 500 });
  }
}
