import { NextResponse } from "next/server";
import { checkDatabaseHealth } from "@/lib/db/mongodb";

export async function GET() {
  const health = await checkDatabaseHealth();
  return NextResponse.json({
    status: health.connected ? "healthy" : "fallback_mode",
    database: health.database,
    configured: health.configured,
    message: health.message,
    timestamp: new Date().toISOString(),
  });
}
