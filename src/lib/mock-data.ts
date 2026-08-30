// Inventra AI — seed data: a realistic Cambodian minimart catalog built from the
// product knowledge base, with deterministic sales history so demos are stable.

import type { RawProduct, RawSale } from "./inventory";

export type SeedProduct = RawProduct & { productCode: string; canonicalName: string; aliases: string[] };

interface SeedSpec {
  id: string;
  name: string; // canonical English name
  khmerName?: string; // when set, this becomes the "original" name the shop uploaded
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
  // Fast movers, low cover → Reorder
  { id: "p-coke-330", name: "Coca-Cola Original 330ml", khmerName: "កូកាកូឡា 330ml", brand: "Coca-Cola", category: "Beverage", sku: "BEV-001", stockQuantity: 18, sellingPrice: 1.2, costPrice: 0.85, base: 8, trend: 0.04, noise: 0.25 },
  { id: "p-mama-shrimp", name: "Mama Shrimp Tom Yum", khmerName: "មីម៉ាម៉ា បង្គា", brand: "Mama", category: "Instant Noodles", sku: "NDL-001", stockQuantity: 40, sellingPrice: 0.4, costPrice: 0.25, base: 16, trend: 0.05, noise: 0.2 },
  { id: "p-vital-500", name: "Vital Water 500ml", khmerName: "ទឹកសុទ្ធ Vital 500ml", brand: "Vital", category: "Water", sku: "WTR-001", stockQuantity: 30, sellingPrice: 0.5, costPrice: 0.28, base: 9, trend: 0.18, noise: 0.3 },
  { id: "p-nescafe-3in1", name: "Nescafe 3-in-1 Original", brand: "Nescafé", category: "Coffee & Tea", sku: "CFT-001", stockQuantity: 45, sellingPrice: 0.3, costPrice: 0.2, base: 12, trend: 0.03, noise: 0.25 },
  { id: "p-oreo", name: "Oreo Original", brand: "Oreo", category: "Confectionery", sku: "CFN-001", stockQuantity: 26, sellingPrice: 0.7, costPrice: 0.48, base: 7, trend: 0.08, noise: 0.35 },

  // Fast mover, healthy cover, strong seller → Opportunity
  { id: "p-sprite-330", name: "Sprite 330ml", brand: "Sprite", category: "Beverage", sku: "BEV-002", stockQuantity: 120, sellingPrice: 1.1, costPrice: 0.78, base: 8, trend: 0.06, noise: 0.25 },
  { id: "p-redbull", name: "Red Bull", brand: "Red Bull", category: "Beverage", sku: "BEV-003", stockQuantity: 95, sellingPrice: 1.0, costPrice: 0.72, base: 6, trend: 0.09, noise: 0.3 },

  // Medium movers → Monitor / Reorder
  { id: "p-coke-zero", name: "Coca-Cola Zero", brand: "Coca-Cola", category: "Beverage", sku: "BEV-004", stockQuantity: 40, sellingPrice: 1.2, costPrice: 0.85, base: 3, trend: 0.03, noise: 0.35 },
  { id: "p-anchor-milk", name: "Anchor UHT Milk 1L", brand: "Anchor", category: "Dairy", sku: "DRY-001", stockQuantity: 16, sellingPrice: 2.4, costPrice: 1.9, base: 2.2, trend: 0.02, noise: 0.25 },
  { id: "p-lays-bbq", name: "Lay's BBQ", brand: "Lay's", category: "Snacks", sku: "SNK-001", stockQuantity: 38, sellingPrice: 0.8, costPrice: 0.5, base: 3, trend: 0.07, noise: 0.4 },
  { id: "p-indomie-goreng", name: "Indomie Mi Goreng", brand: "Indomie", category: "Instant Noodles", sku: "NDL-002", stockQuantity: 22, sellingPrice: 0.45, costPrice: 0.3, base: 3.5, trend: 0.06, noise: 0.3 },
  { id: "p-colgate-total", name: "Colgate Total Toothpaste", brand: "Colgate", category: "Personal Care", sku: "PCR-001", stockQuantity: 30, sellingPrice: 1.6, costPrice: 1.1, base: 2.2, trend: 0.04, noise: 0.3 },
  { id: "p-mamypoko-m", name: "MamyPoko Pants M", brand: "MamyPoko", category: "Baby Care", sku: "BBY-001", stockQuantity: 24, sellingPrice: 6.5, costPrice: 5.4, base: 1.6, trend: 0.05, noise: 0.35 },

  // Slow movers, cash tied up → Reduce
  { id: "p-sting-red", name: "Sting Strawberry", brand: "Sting", category: "Beverage", sku: "BEV-005", stockQuantity: 180, sellingPrice: 0.6, costPrice: 0.4, base: 2, trend: -0.1, noise: 0.5 },
  { id: "p-tide", name: "Tide Detergent Powder 1kg", brand: "Tide", category: "Household", sku: "HHD-001", stockQuantity: 60, sellingPrice: 3.2, costPrice: 2.5, base: 1.0, trend: -0.03, noise: 0.4 },
  { id: "p-pringles-og", name: "Pringles Original", brand: "Pringles", category: "Snacks", sku: "SNK-002", stockQuantity: 55, sellingPrice: 2.0, costPrice: 1.5, base: 1.2, trend: -0.04, noise: 0.35 },
  { id: "p-ligo-sardines", name: "Ligo Sardines in Tomato Sauce", brand: "Ligo", category: "Canned & Packaged", sku: "CAN-001", stockQuantity: 90, sellingPrice: 1.1, costPrice: 0.85, base: 1.4, trend: -0.02, noise: 0.4 },

  // Slow movers, cheap → Monitor
  { id: "p-headshoulders", name: "Head & Shoulders Shampoo", brand: "Head & Shoulders", category: "Personal Care", sku: "PCR-002", stockQuantity: 40, sellingPrice: 0.15, costPrice: 0.08, base: 1, trend: -0.05, noise: 0.6 },
  { id: "p-sunlight", name: "Sunlight Dishwashing Liquid", brand: "Sunlight", category: "Household", sku: "HHD-002", stockQuantity: 18, sellingPrice: 1.1, costPrice: 0.75, base: 1.4, trend: 0.01, noise: 0.35 },
  { id: "p-panadol", name: "Panadol Paracetamol 500mg", brand: "Panadol", category: "Health", sku: "HLT-001", stockQuantity: 22, sellingPrice: 0.5, costPrice: 0.32, base: 1.3, trend: 0.02, noise: 0.4 },
  { id: "p-marlboro", name: "Marlboro Red", brand: "Marlboro", category: "Tobacco", sku: "TOB-001", stockQuantity: 30, sellingPrice: 1.3, costPrice: 1.05, base: 2.5, trend: 0.0, noise: 0.3 },

  // Dead stock, no recent sales → capital locked
  { id: "p-choc-gift-box", name: "Ferrero Rocher Gift Box T24", brand: "Ferrero", category: "Confectionery", sku: "CFN-009", stockQuantity: 42, sellingPrice: 9.5, costPrice: 7.2, base: 0, trend: 0, noise: 0 },
  { id: "p-canned-lychee", name: "Canned Lychee in Syrup 565g", brand: "Aroy-D", category: "Canned & Packaged", sku: "CAN-014", stockQuantity: 70, sellingPrice: 1.9, costPrice: 1.35, base: 0, trend: 0, noise: 0 },
];

export const SEED_USER = {
  email: "sokchea@inventra.ai",
  name: "Sokchea",
  businessName: "Sokchea Mini Mart",
};

/** Seed products in Prisma-ready shape, with a realistic `dailySales` velocity. */
export function seedProducts(): SeedProduct[] {
  return SPECS.map((s) => {
    const original = s.khmerName ?? s.name;
    return {
      id: s.id,
      name: original, // originalName — what the shop uploaded
      canonicalName: s.name,
      aliases: Array.from(new Set([original, s.name])),
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
    };
  });
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
