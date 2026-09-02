// Inventra AI — server-side data access helpers. Every query is scoped to the
// authenticated user's id, passed in by the route / RSC via requireAuth().
import { db } from "./db";
import type { AnalysisInput } from "./analysis";
import type { SalesStat } from "./types";

/** Products shaped for the analysis engine — NO Sale query (hot path). */
export async function loadProductsLite(userId: string): Promise<{
  business: string;
  products: AnalysisInput[];
}> {
  const [user, products] = await Promise.all([
    db.user.findUnique({ where: { id: userId }, select: { businessName: true } }),
    db.product.findMany({ where: { userId } }),
  ]);
  return {
    business: user?.businessName || "Your Business",
    products: products.map((p) => ({
      id: p.id,
      name: p.name,
      canonicalName: p.canonicalName,
      brand: p.brand,
      sku: p.sku,
      category: p.category,
      stock: p.stockQuantity,
      dailySales: p.dailySales,
      sellingPrice: p.sellingPrice,
      costPrice: p.costPrice,
    })),
  };
}

/**
 * Per-product day-to-day sales variability, from the Sale table when it exists.
 * User imports have no Sale history (we never synthesise one), so this is empty
 * for imported catalogues — the forecast layer treats that as "stability unknown".
 */
export async function loadSalesStats(userId: string): Promise<Map<string, SalesStat>> {
  const out = new Map<string, SalesStat>();

  const rows = await db.sale.findMany({
    where: { product: { userId } },
    select: { productId: true, quantity: true, date: true },
  });
  if (rows.length === 0) return out;

  const byProduct = new Map<string, Map<string, number>>();
  for (const r of rows) {
    const day = r.date.toISOString().slice(0, 10);
    let m = byProduct.get(r.productId);
    if (!m) byProduct.set(r.productId, (m = new Map()));
    m.set(day, (m.get(day) ?? 0) + r.quantity);
  }

  for (const [productId, dayMap] of byProduct) {
    const vals = [...dayMap.values()];
    const days = vals.length;
    if (days < 5) {
      out.set(productId, { days });
      continue;
    }
    const mean = vals.reduce((s, v) => s + v, 0) / days;
    const variance = vals.reduce((s, v) => s + (v - mean) ** 2, 0) / days;
    const cv = mean > 0 ? Math.sqrt(variance) / mean : undefined;
    out.set(productId, { cv, days });
  }
  return out;
}
