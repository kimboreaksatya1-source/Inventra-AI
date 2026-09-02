// Inventra AI — server-side data access helpers
import { db } from "./db";
import type { RawProduct, RawSale } from "./inventory";
import type { AnalysisInput } from "./analysis";
import type { SalesStat } from "./types";

export interface LoadedData {
  user: { id: string; name: string; businessName: string; email: string };
  products: RawProduct[];
  sales: RawSale[];
}

export async function loadData(): Promise<LoadedData> {
  const user = await db.user.findFirst({
    orderBy: { createdAt: "asc" },
  });
  if (!user) {
    return {
      user: { id: "", name: "Owner", businessName: "Your Store", email: "" },
      products: [],
      sales: [],
    };
  }
  const products = await db.product.findMany({
    where: { userId: user.id },
  });
  const sales = await db.sale.findMany({
    where: { product: { userId: user.id } },
    orderBy: { date: "asc" },
  });

  const rawProducts: RawProduct[] = products.map((p) => ({
    id: p.id,
    name: p.name,
    canonicalName: p.canonicalName || null,
    category: p.category,
    sku: p.sku,
    brand: p.brand,
    stockQuantity: p.stockQuantity,
    dailySales: p.dailySales,
    sellingPrice: p.sellingPrice,
    costPrice: p.costPrice,
    reorderPoint: p.reorderPoint,
    unit: p.unit,
  }));

  const rawSales: RawSale[] = sales.map((s) => ({
    productId: s.productId,
    quantity: s.quantity,
    date: s.date,
  }));

  return {
    user: { id: user.id, name: user.name, businessName: user.businessName, email: user.email },
    products: rawProducts,
    sales: rawSales,
  };
}

export async function isSeeded(): Promise<boolean> {
  const count = await db.product.count();
  return count > 0;
}

/** Products shaped for the analysis engine — NO Sale query (hot path). */
export async function loadProductsLite(): Promise<{
  business: string;
  products: AnalysisInput[];
}> {
  const user = await db.user.findFirst({ orderBy: { createdAt: "asc" } });
  if (!user) return { business: "Your Business", products: [] };

  const products = await db.product.findMany({ where: { userId: user.id } });
  return {
    business: user.businessName || "Your Business",
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

/** Products shaped for the analysis engine (analysis.ts). Alias of the lite loader. */
export async function loadAnalysisInputs(): Promise<{
  business: string;
  products: AnalysisInput[];
}> {
  return loadProductsLite();
}

/**
 * Per-product day-to-day sales variability, from the Sale table when it exists.
 * User imports have no Sale history (we never synthesise one), so this is empty
 * for imported catalogues — the forecast layer treats that as "stability unknown".
 */
export async function loadSalesStats(): Promise<Map<string, SalesStat>> {
  const user = await db.user.findFirst({ orderBy: { createdAt: "asc" } });
  const out = new Map<string, SalesStat>();
  if (!user) return out;

  const rows = await db.sale.findMany({
    where: { product: { userId: user.id } },
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
