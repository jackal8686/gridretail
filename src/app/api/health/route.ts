import { NextResponse } from "next/server";
import { checkDatabaseHealth } from "@/lib/db/mongodb";

export async function GET() {
  const health = await checkDatabaseHealth();
  const emailProviderName = process.env.SMTP_HOST ? "smtp" : "console_mock";
  const storageProviderName =
    process.env.S3_BUCKET_NAME && process.env.AWS_ACCESS_KEY_ID ? "s3" : "local";

  const isProd = process.env.NODE_ENV === "production";
  let status: "healthy" | "degraded" | "unhealthy" = "healthy";
  let statusCode = 200;

  if (isProd) {
    if (!health.connected) {
      status = "unhealthy";
      statusCode = 503;
    }
  } else {
    if (health.configured && !health.connected) {
      status = "degraded";
    }
  }

  return NextResponse.json(
    {
      status,
      environment: process.env.NODE_ENV || "development",
      database: health.connected
        ? "connected"
        : health.configured
        ? "unavailable"
        : "in_memory_fallback",
      databaseName: health.database,
      configured: health.configured,
      email: emailProviderName,
      storage: storageProviderName,
      deployments: {
        availableProviders: ["mock", "cloudflare_pages", "vercel", "aws_s3"],
        configuredProviders: [
          "mock",
          ...(process.env.CLOUDFLARE_API_TOKEN ? ["cloudflare_pages"] : []),
          ...(process.env.VERCEL_TOKEN ? ["vercel"] : []),
          ...(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_S3_BUCKET ? ["aws_s3"] : []),
        ],
      },
      message: health.message,
      timestamp: new Date().toISOString(),
    },
    { status: statusCode }
  );
}
