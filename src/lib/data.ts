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

/** Products shaped for the analysis engine (analysis.ts). */
export async function loadAnalysisInputs(): Promise<{
  business: string;
  products: AnalysisInput[];
}> {
  const { user, products } = await loadData();
  return {
    business: user.businessName || "Your Business",
    products: products.map((p) => ({
      id: p.id,
      name: p.name,
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
