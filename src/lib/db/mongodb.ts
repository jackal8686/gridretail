import { MongoClient, Db } from "mongodb";

function getMongoUri(): string | undefined {
  return process.env.MONGODB_URI;
}

function getMongoDbName(): string {
  return process.env.MONGODB_DB_NAME || "gridretail";
}

interface GlobalMongo {
  _mongoClientPromise?: Promise<MongoClient>;
}

declare const global: typeof globalThis & GlobalMongo;

let clientPromise: Promise<MongoClient> | null = null;

export class DatabaseUnavailableError extends Error {
  constructor(message = "Database is unavailable. In-memory fallback is disabled in production.") {
    super(message);
    this.name = "DatabaseUnavailableError";
  }
}

export function isProductionEnvironment(): boolean {
  return process.env.NODE_ENV === "production";
}

export function isFallbackAllowed(): boolean {
  if (process.env.ALLOW_IN_MEMORY_FALLBACK === "true") {
    return true;
  }
  return !isProductionEnvironment();
}

export function assertDatabaseWritable(db: Db | null, operation = "write"): asserts db is Db {
  if (!db && !isFallbackAllowed()) {
    throw new DatabaseUnavailableError(`Cannot execute ${operation} operation: database is unavailable in production.`);
  }
}

export function hasMongoConfig(): boolean {
  const uri = getMongoUri();
  return Boolean(uri && uri.trim().length > 0);
}

export function getMongoClientPromise(): Promise<MongoClient> | null {
  const uri = getMongoUri();
  if (!uri || uri.trim().length === 0) {
    return null;
  }

  if (process.env.NODE_ENV === "development") {
    if (!global._mongoClientPromise) {
      const client = new MongoClient(uri);
      global._mongoClientPromise = client.connect();
    }
    return global._mongoClientPromise;
  } else {
    if (!clientPromise) {
      const client = new MongoClient(uri);
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
    return client.db(getMongoDbName());
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
      database: getMongoDbName(),
      configured: false,
      message: "MONGODB_URI environment variable is not configured. Running in in-memory fallback mode.",
    };
  }

  try {
    const db = await getDb();
    if (!db) {
      return {
        connected: false,
        database: getMongoDbName(),
        configured: true,
        message: "Failed to resolve database client.",
      };
    }
    // Ping database to confirm responsive connection
    await db.command({ ping: 1 });
    return {
      connected: true,
      database: getMongoDbName(),
      configured: true,
      message: "Successfully connected to MongoDB Atlas.",
    };
  } catch (error) {
    return {
      connected: false,
      database: getMongoDbName(),
      configured: true,
      message: `Database ping failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}
