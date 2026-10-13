import { getDb, hasMongoConfig } from "./mongodb";
import { MOCK_STORES } from "@/mock/stores";
import { MOCK_CLIENTS } from "@/mock/clients";
import { MOCK_TEMPLATES } from "@/mock/templates";
import { MOCK_PRODUCTS } from "@/mock/products";
import { MOCK_ACTIVITIES } from "@/mock/activities";

export async function runDatabaseSeed(): Promise<{
  success: boolean;
  message: string;
  counts: {
    stores: number;
    clients: number;
    templates: number;
    products: number;
    activities: number;
  };
}> {
  if (!hasMongoConfig()) {
    console.log("[Seed] MONGODB_URI is not set. Seed executed in demonstration mock mode.");
    return {
      success: true,
      message: "Seed completed in local demonstration mode (no MONGODB_URI set).",
      counts: {
        stores: MOCK_STORES.length,
        clients: MOCK_CLIENTS.length,
        templates: MOCK_TEMPLATES.length,
        products: MOCK_PRODUCTS.length,
        activities: MOCK_ACTIVITIES.length,
      },
    };
  }

  const db = await getDb();
  if (!db) {
    throw new Error("Unable to connect to MongoDB instance. Please check your MONGODB_URI.");
  }

  console.log(`[Seed] Connecting to database: ${db.databaseName}...`);

  // Ensure unique indexes exist
  await db.collection("stores").createIndex({ slug: 1 }, { unique: true });
  await db.collection("stores").createIndex({ id: 1 }, { unique: true });
  await db.collection("clients").createIndex({ id: 1 }, { unique: true });
  await db.collection("templates").createIndex({ id: 1 }, { unique: true });
  await db.collection("products").createIndex({ id: 1 }, { unique: true });
  await db.collection("users").createIndex({ email: 1 }, { unique: true });
  await db.collection("activities").createIndex({ id: 1 }, { unique: true });

  console.log("[Seed] Indexes confirmed. Upserting collections...");

  // Idempotent upserts using unique "id"
  for (const store of MOCK_STORES) {
    await db.collection("stores").updateOne({ id: store.id }, { $set: store }, { upsert: true });
  }

  for (const client of MOCK_CLIENTS) {
    await db.collection("clients").updateOne({ id: client.id }, { $set: client }, { upsert: true });
  }

  for (const template of MOCK_TEMPLATES) {
    await db.collection("templates").updateOne({ id: template.id }, { $set: template }, { upsert: true });
  }

  for (const product of MOCK_PRODUCTS) {
    await db.collection("products").updateOne({ id: product.id }, { $set: product }, { upsert: true });
  }

  for (const activity of MOCK_ACTIVITIES) {
    await db.collection("activities").updateOne({ id: activity.id }, { $set: activity }, { upsert: true });
  }

  console.log("[Seed] Seed process completed successfully!");

  return {
    success: true,
    message: "Database successfully seeded with idempotent records.",
    counts: {
      stores: MOCK_STORES.length,
      clients: MOCK_CLIENTS.length,
      templates: MOCK_TEMPLATES.length,
      products: MOCK_PRODUCTS.length,
      activities: MOCK_ACTIVITIES.length,
    },
  };
}

// Allow direct execution via `npm run seed` or `tsx src/lib/db/seed.ts`
if (require.main === module) {
  runDatabaseSeed()
    .then((result) => {
      console.log(JSON.stringify(result, null, 2));
      process.exit(0);
    })
    .catch((err) => {
      console.error("[Seed Error]", err);
      process.exit(1);
    });
}
