// Inventra AI — database seeding script
// Run with: bun run scripts/seed.ts
import { db } from "../src/lib/db";
import { SEED_USER, generateSeedSales, seedProducts } from "../src/lib/mock-data";

const SEED_PRODUCTS = seedProducts();

async function main() {
  console.log("🌱 Seeding Inventra AI database...");

  // Clean
  await db.sale.deleteMany();
  await db.recommendation.deleteMany();
  await db.product.deleteMany();
  await db.user.deleteMany();

  // Create user
  const user = await db.user.create({
    data: {
      email: SEED_USER.email,
      name: SEED_USER.name,
      businessName: SEED_USER.businessName,
    },
  });

  // Create products
  for (const p of SEED_PRODUCTS) {
    await db.product.create({
      data: {
        id: p.id,
        userId: user.id,
        name: p.name,
        category: p.category,
        sku: p.sku,
        stockQuantity: p.stockQuantity,
        dailySales: p.dailySales,
        sellingPrice: p.sellingPrice,
        costPrice: p.costPrice,
        reorderPoint: p.reorderPoint,
        unit: p.unit,
      },
    });
  }

  // Create sales
  const sales = generateSeedSales(45);
  let salesCount = 0;
  for (const s of sales) {
    await db.sale.create({
      data: {
        productId: s.productId,
        quantity: s.quantity,
        date: s.date,
      },
    });
    salesCount++;
  }

  console.log(
    `✅ Seeded ${SEED_PRODUCTS.length} products and ${salesCount} sales records for ${SEED_USER.businessName}.`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
