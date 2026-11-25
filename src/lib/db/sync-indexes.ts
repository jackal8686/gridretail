import { getDb, hasMongoConfig } from "./mongodb";
import { ensureAllDatabaseIndexes } from "./indexes";

export async function runIndexSync(): Promise<{ success: boolean; message: string }> {
  if (!hasMongoConfig()) {
    const msg = "MONGODB_URI is not configured. Index sync skipped in in-memory fallback mode.";
    console.log(`[sync-indexes] ${msg}`);
    return { success: false, message: msg };
  }

  try {
    const db = await getDb();
    if (!db) {
      const msg = "Failed to obtain MongoDB database instance.";
      console.error(`[sync-indexes] ${msg}`);
      return { success: false, message: msg };
    }

    console.log("[sync-indexes] Synchronizing MongoDB database indexes...");
    const result = await ensureAllDatabaseIndexes(db);
    const msg = `Successfully ensured indexes across ${result.indexedCollections.length} collections (${result.totalIndexesCreated} index definitions verified).`;
    console.log(`[sync-indexes] ${msg}`);
    return { success: true, message: msg };
  } catch (error) {
    const msg = `Index synchronization failed: ${error instanceof Error ? error.message : "Unknown error"}`;
    console.error(`[sync-indexes] ${msg}`);
    return { success: false, message: msg };
  }
}

// Direct CLI execution support
if (require.main === module || process.argv[1]?.includes("sync-indexes")) {
  runIndexSync()
    .then((res) => {
      process.exit(res.success ? 0 : 1);
    })
    .catch((err) => {
      console.error("[sync-indexes] Fatal error:", err);
      process.exit(1);
    });
}
