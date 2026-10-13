import { MongoClient, Db } from "mongodb";

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || "gridretail";

interface GlobalMongo {
  _mongoClientPromise?: Promise<MongoClient>;
}

declare const global: typeof globalThis & GlobalMongo;

let clientPromise: Promise<MongoClient> | null = null;

export function hasMongoConfig(): boolean {
  return Boolean(MONGODB_URI && MONGODB_URI.trim().length > 0);
}

export function getMongoClientPromise(): Promise<MongoClient> | null {
  if (!hasMongoConfig()) {
    return null;
  }

  if (process.env.NODE_ENV === "development") {
    if (!global._mongoClientPromise) {
      const client = new MongoClient(MONGODB_URI!);
      global._mongoClientPromise = client.connect();
    }
    return global._mongoClientPromise;
  } else {
    if (!clientPromise) {
      const client = new MongoClient(MONGODB_URI!);
      clientPromise = client.connect();
    }
    return clientPromise;
  }
}

export async function getDb(): Promise<Db | null> {
  const promise = getMongoClientPromise();
  if (!promise) {
    return null;
  }
  try {
    const client = await promise;
    return client.db(MONGODB_DB_NAME);
  } catch (error) {
    console.error("MongoDB Atlas connection error:", error instanceof Error ? error.message : "Connection failed");
    return null;
  }
}

export async function checkDatabaseHealth(): Promise<{
  connected: boolean;
  database: string;
  configured: boolean;
  message: string;
}> {
  if (!hasMongoConfig()) {
    return {
      connected: false,
      database: MONGODB_DB_NAME,
      configured: false,
      message: "MONGODB_URI environment variable is not configured. Running in in-memory fallback mode.",
    };
  }

  try {
    const db = await getDb();
    if (!db) {
      return {
        connected: false,
        database: MONGODB_DB_NAME,
        configured: true,
        message: "Failed to resolve database client.",
      };
    }
    // Ping database to confirm responsive connection
    await db.command({ ping: 1 });
    return {
      connected: true,
      database: MONGODB_DB_NAME,
      configured: true,
      message: "Successfully connected to MongoDB Atlas.",
    };
  } catch (error) {
    return {
      connected: false,
      database: MONGODB_DB_NAME,
      configured: true,
      message: `Database ping failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}
