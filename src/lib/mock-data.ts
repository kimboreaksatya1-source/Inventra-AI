// Inventra AI — Seed data: realistic Cambodian SME minimart catalog
// Deterministic pseudo-random sales history so dashboards are stable.

import type { RawProduct, RawSale } from "./inventory";

export type SeedProduct = RawProduct;

// 15 products across categories. Prices in USD (common in Cambodia).
// `dailySales` is attached from DEMAND_PROFILE by `seedProducts()` below.
export const SEED_PRODUCTS: Omit<SeedProduct, "dailySales">[] = [
  {
    id: "p-coca-15l",
    name: "Cambodia Cola 330ml",
    category: "Beverages",
    sku: "BEV-CC-15",
    stockQuantity: 18,
    sellingPrice: 1.2,
    costPrice: 0.85,
    reorderPoint: 24,
    unit: "bottle",
  },
  {
    id: "p-mama-noodle",
    name: "Instant Noodles (Mi Cheat)",
    category: "Snacks",
    sku: "SNK-NDL-MM",
    stockQuantity: 12,
    sellingPrice: 0.4,
    costPrice: 0.25,
    reorderPoint: 40,
    unit: "pack",
  },
  {
    id: "p-bottled-water",
    name: "Pro Vida 500ml",
    category: "Beverages",
    sku: "BEV-WT-15",
    stockQuantity: 26,
    sellingPrice: 0.5,
    costPrice: 0.28,
    reorderPoint: 30,
    unit: "bottle",
  },
  {
    id: "p-sting-energy",
    name: "Energy Drink (Sting)",
    category: "Beverages",
    sku: "BEV-EN-ST",
    stockQuantity: 140,
    sellingPrice: 0.6,
    costPrice: 0.4,
    reorderPoint: 24,
    unit: "bottle",
  },
  {
    id: "p-anchor-beer",
    name: "Anchor Beer 330ml",
    category: "Beverages",
    sku: "BEV-BR-AN",
    stockQuantity: 48,
    sellingPrice: 1.0,
    costPrice: 0.7,
    reorderPoint: 24,
    unit: "can",
  },
  {
    id: "p-rice-5kg",
    name: "Romdul Rice 5kg",
    category: "Staples",
    sku: "STP-RC-5K",
    stockQuantity: 22,
    sellingPrice: 6.5,
    costPrice: 5.2,
    reorderPoint: 8,
    unit: "bag",
  },
  {
    id: "p-soy-sauce",
    name: "Soy Sauce 500ml",
    category: "Condiments",
    sku: "CON-SS-50",
    stockQuantity: 16,
    sellingPrice: 1.1,
    costPrice: 0.75,
    reorderPoint: 10,
    unit: "bottle",
  },
  {
    id: "p-cooking-oil",
    name: "Cooking Oil 1L",
    category: "Staples",
    sku: "STP-OIL-1L",
    stockQuantity: 14,
    sellingPrice: 2.4,
    costPrice: 1.9,
    reorderPoint: 12,
    unit: "bottle",
  },
  {
    id: "p-condensed-milk",
    name: "Condensed Milk",
    category: "Dairy",
    sku: "DRY-CM-397",
    stockQuantity: 30,
    sellingPrice: 1.3,
    costPrice: 0.95,
    reorderPoint: 12,
    unit: "can",
  },
  {
    id: "p-lays-chips",
    name: "Lay's Chips",
    category: "Snacks",
    sku: "SNK-CH-LS",
    stockQuantity: 38,
    sellingPrice: 0.8,
    costPrice: 0.5,
    reorderPoint: 20,
    unit: "pack",
  },
  {
    id: "p-m150-energy",
    name: "King Kong Energy Drink",
    category: "Beverages",
    sku: "BEV-EN-M150",
    stockQuantity: 8,
    sellingPrice: 0.65,
    costPrice: 0.45,
    reorderPoint: 24,
    unit: "bottle",
  },
  {
    id: "p-singha-water",
    name: "Singha Water 600ml",
    category: "Beverages",
    sku: "BEV-WT-SG",
    stockQuantity: 60,
    sellingPrice: 0.4,
    costPrice: 0.22,
    reorderPoint: 30,
    unit: "bottle",
  },
  {
    id: "p-thai-tea",
    name: "Cambodia Milk Tea",
    category: "Beverages",
    sku: "BEV-TT-400",
    stockQuantity: 11,
    sellingPrice: 2.0,
    costPrice: 1.5,
    reorderPoint: 8,
    unit: "pack",
  },
  {
    id: "p-instant-coffee",
    name: "Instant Coffee 3-in-1",
    category: "Beverages",
    sku: "BEV-CF-3N1",
    stockQuantity: 45,
    sellingPrice: 0.35,
    costPrice: 0.2,
    reorderPoint: 30,
    unit: "sachet",
  },
  {
    id: "p-shampoo-sachet",
    name: "Shampoo Sachet",
    category: "Personal Care",
    sku: "PCR-SH-SCH",
    stockQuantity: 90,
    sellingPrice: 0.15,
    costPrice: 0.08,
    reorderPoint: 40,
    unit: "sachet",
  },
];

export const SEED_USER = {
  email: "sokchea@inventra.ai",
  name: "Sokchea",
  businessName: "Sokchea Mini Mart",
};

// Demand profile per product to craft realistic stories:
// base = avg daily units, trend = weekly growth fraction, noise = variability
const DEMAND_PROFILE: Record<string, { base: number; trend: number; noise: number }> = {
  "p-coca-15l": { base: 8, trend: 0.04, noise: 0.25 },
  "p-mama-noodle": { base: 14, trend: 0.05, noise: 0.2 },
  "p-bottled-water": { base: 6, trend: 0.18, noise: 0.3 }, // rising fast
  "p-sting-energy": { base: 2, trend: -0.1, noise: 0.5 }, // overstocked / slow
  "p-anchor-beer": { base: 5, trend: 0.02, noise: 0.3 },
  "p-rice-5kg": { base: 1.2, trend: 0.03, noise: 0.4 },
  "p-soy-sauce": { base: 1.5, trend: 0.01, noise: 0.35 },
  "p-cooking-oil": { base: 1.8, trend: 0.06, noise: 0.3 },
  "p-condensed-milk": { base: 2.2, trend: 0.02, noise: 0.25 },
  "p-lays-chips": { base: 3, trend: 0.07, noise: 0.4 },
  "p-m150-energy": { base: 4, trend: 0.05, noise: 0.3 },
  "p-singha-water": { base: 3.5, trend: 0.01, noise: 0.35 },
  "p-thai-tea": { base: 1.6, trend: 0.09, noise: 0.35 },
  "p-instant-coffee": { base: 6, trend: 0.03, noise: 0.25 },
  "p-shampoo-sachet": { base: 1, trend: -0.05, noise: 0.6 }, // slow
};

/** Seed products with a realistic `dailySales` velocity attached. */
export function seedProducts(): SeedProduct[] {
  return SEED_PRODUCTS.map((p) => ({
    ...p,
    dailySales: DEMAND_PROFILE[p.id]?.base ?? 2,
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

/** Generate 45 days of deterministic sales for all seed products. */
export function generateSeedSales(days = 45): RawSale[] {
  const sales: RawSale[] = [];
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let counter = 0;
  for (const p of SEED_PRODUCTS) {
    const profile = DEMAND_PROFILE[p.id] ?? { base: 2, trend: 0, noise: 0.3 };
    const rand = rng(p.id.length * 97 + p.name.length * 13 + 7);
    for (let d = days; d >= 1; d--) {
      const date = new Date(today.getTime() - d * 24 * 60 * 60 * 1000);
      // growth factor: older days have less demand
      const ageFraction = d / days;
      const growth = 1 - profile.trend * (ageFraction * 4);
      // weekend boost for beverages/snacks
      const dow = date.getDay();
      const weekendBoost = dow === 0 || dow === 6 ? 1.35 : 1;
      const noise = 1 + (rand() - 0.5) * 2 * profile.noise;
      let qty = profile.base * growth * weekendBoost * noise;
      qty = Math.max(0, Math.round(qty));
      if (qty > 0) {
        sales.push({
          productId: p.id,
          quantity: qty,
          date,
        });
        counter++;
      }
    }
  }
  return sales;
}
