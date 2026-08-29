// Inventra AI — server-side data access helpers
import { db } from "./db";
import type { RawProduct, RawSale } from "./inventory";
import type { AnalysisInput } from "./analysis";

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
