// Inventra AI — seed data: a realistic Cambodian minimart catalog built from the
// product knowledge base, with deterministic sales history so demos are stable.

import type { RawProduct, RawSale } from "./inventory";

export type SeedProduct = RawProduct & { productCode: string };

interface SeedSpec {
  id: string;
  name: string;
  brand: string;
  category: string;
  sku: string;
  stockQuantity: number;
  sellingPrice: number;
  costPrice: number;
  base: number; // avg daily units
  trend: number; // weekly growth fraction
  noise: number;
}

const SPECS: SeedSpec[] = [
  { id: "p-coke-330", name: "Coca-Cola Original 330ml", brand: "Coca-Cola", category: "Beverage", sku: "BEV-001", stockQuantity: 18, sellingPrice: 1.2, costPrice: 0.85, base: 8, trend: 0.04, noise: 0.25 },
  { id: "p-coke-zero", name: "Coca-Cola Zero", brand: "Coca-Cola", category: "Beverage", sku: "BEV-002", stockQuantity: 40, sellingPrice: 1.2, costPrice: 0.85, base: 3, trend: 0.03, noise: 0.35 },
  { id: "p-sprite-330", name: "Sprite 330ml", brand: "Sprite", category: "Beverage", sku: "BEV-003", stockQuantity: 34, sellingPrice: 1.1, costPrice: 0.78, base: 4, trend: 0.02, noise: 0.3 },
  { id: "p-sting-red", name: "Sting Strawberry", brand: "Sting", category: "Beverage", sku: "BEV-004", stockQuantity: 140, sellingPrice: 0.6, costPrice: 0.4, base: 2, trend: -0.1, noise: 0.5 },
  { id: "p-redbull", name: "Red Bull", brand: "Red Bull", category: "Beverage", sku: "BEV-005", stockQuantity: 22, sellingPrice: 1.0, costPrice: 0.72, base: 4, trend: 0.05, noise: 0.3 },
  { id: "p-vital-500", name: "Vital Water 500ml", brand: "Vital", category: "Water", sku: "WTR-001", stockQuantity: 26, sellingPrice: 0.5, costPrice: 0.28, base: 6, trend: 0.18, noise: 0.3 },
  { id: "p-vital-1500", name: "Vital Water 1500ml", brand: "Vital", category: "Water", sku: "WTR-002", stockQuantity: 60, sellingPrice: 0.8, costPrice: 0.45, base: 3.5, trend: 0.04, noise: 0.35 },
  { id: "p-buldak-carb", name: "Buldak Carbonara", brand: "Samyang", category: "Instant Noodles", sku: "NDL-001", stockQuantity: 12, sellingPrice: 1.1, costPrice: 0.8, base: 5, trend: 0.09, noise: 0.3 },
  { id: "p-mama-shrimp", name: "Mama Shrimp", brand: "Mama", category: "Instant Noodles", sku: "NDL-002", stockQuantity: 30, sellingPrice: 0.4, costPrice: 0.25, base: 14, trend: 0.05, noise: 0.2 },
  { id: "p-indomie-goreng", name: "Indomie Mi Goreng", brand: "Indomie", category: "Instant Noodles", sku: "NDL-003", stockQuantity: 22, sellingPrice: 0.45, costPrice: 0.3, base: 6, trend: 0.06, noise: 0.3 },
  { id: "p-anchor-milk", name: "Anchor Milk 1L", brand: "Anchor", category: "Dairy", sku: "DRY-001", stockQuantity: 16, sellingPrice: 2.4, costPrice: 1.9, base: 2.2, trend: 0.02, noise: 0.25 },
  { id: "p-bearbrand", name: "Bear Brand", brand: "Bear Brand", category: "Dairy", sku: "DRY-002", stockQuantity: 28, sellingPrice: 0.9, costPrice: 0.62, base: 3, trend: 0.03, noise: 0.3 },
  { id: "p-lays-bbq", name: "Lay's BBQ", brand: "Lay's", category: "Snacks", sku: "SNK-001", stockQuantity: 38, sellingPrice: 0.8, costPrice: 0.5, base: 3, trend: 0.07, noise: 0.4 },
  { id: "p-pringles-og", name: "Pringles Original", brand: "Pringles", category: "Snacks", sku: "SNK-002", stockQuantity: 11, sellingPrice: 2.0, costPrice: 1.5, base: 1.6, trend: 0.09, noise: 0.35 },
  { id: "p-colgate-total", name: "Colgate Total", brand: "Colgate", category: "Personal Care", sku: "PCR-001", stockQuantity: 14, sellingPrice: 1.6, costPrice: 1.1, base: 1.8, trend: 0.04, noise: 0.3 },
  { id: "p-headshoulders", name: "Head & Shoulders", brand: "Head & Shoulders", category: "Personal Care", sku: "PCR-002", stockQuantity: 90, sellingPrice: 0.15, costPrice: 0.08, base: 1, trend: -0.05, noise: 0.6 },
  { id: "p-tide", name: "Tide Detergent", brand: "Tide", category: "Household", sku: "HHD-001", stockQuantity: 22, sellingPrice: 3.2, costPrice: 2.5, base: 1.2, trend: 0.03, noise: 0.4 },
  { id: "p-sunlight", name: "Sunlight Dishwashing Liquid", brand: "Sunlight", category: "Household", sku: "HHD-002", stockQuantity: 18, sellingPrice: 1.1, costPrice: 0.75, base: 1.5, trend: 0.01, noise: 0.35 },
];

export const SEED_USER = {
  email: "sokchea@inventra.ai",
  name: "Sokchea",
  businessName: "Sokchea Mini Mart",
};

/** Seed products in Prisma-ready shape, with a realistic `dailySales` velocity. */
export function seedProducts(): SeedProduct[] {
  return SPECS.map((s) => ({
    id: s.id,
    name: s.name,
    brand: s.brand,
    category: s.category,
    sku: s.sku,
    productCode: s.sku,
    stockQuantity: s.stockQuantity,
    dailySales: s.base,
    sellingPrice: s.sellingPrice,
    costPrice: s.costPrice,
    reorderPoint: Math.max(1, Math.ceil(s.base * 7)),
    unit: "unit",
  }));
}

// Mulberry32 deterministic PRNG
function rng(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Generate deterministic sales for all seed products. */
export function generateSeedSales(days = 45): RawSale[] {
  const sales: RawSale[] = [];
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  for (const s of SPECS) {
    const rand = rng(s.id.length * 97 + s.name.length * 13 + 7);
    for (let d = days; d >= 1; d--) {
      const date = new Date(today.getTime() - d * 24 * 60 * 60 * 1000);
      const ageFraction = d / days;
      const growth = 1 - s.trend * (ageFraction * 4);
      const dow = date.getDay();
      const weekendBoost = dow === 0 || dow === 6 ? 1.35 : 1;
      const noise = 1 + (rand() - 0.5) * 2 * s.noise;
      const qty = Math.max(0, Math.round(s.base * growth * weekendBoost * noise));
      if (qty > 0) sales.push({ productId: s.id, quantity: qty, date });
    }
  }
  return sales;
}
