import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { AnalyticsRepository } from "@/lib/repositories/analytics.repository";

import { hasCapability } from "@/lib/auth/permissions";
import { UserRole } from "@/types/user";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = (session.user.role as UserRole) || "employee";
  if (!hasCapability(role, "view_analytics")) {
    return NextResponse.json(
      { error: "Forbidden: You do not have permission to view organizational analytics" },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(request.url);
  const timeframe = (searchParams.get("timeframe") as "7d" | "30d" | "90d" | "all") || "all";
  const storeId = searchParams.get("storeId") || undefined;
  const industry = searchParams.get("industry") || undefined;

  let startDate: string | undefined = undefined;
  const endDate = new Date().toISOString();

  if (timeframe === "7d") {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    startDate = d.toISOString();
  } else if (timeframe === "30d") {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    startDate = d.toISOString();
  } else if (timeframe === "90d") {
    const d = new Date();
    d.setDate(d.getDate() - 90);
    startDate = d.toISOString();
  }

  try {
    const overview = await AnalyticsRepository.getOverview({
      startDate,
      endDate: startDate ? endDate : undefined,
      timeframe,
      storeId,
      industry,
    });

    return NextResponse.json({ overview });
  } catch (error) {
    console.error("Error fetching analytics overview:", error);
    return NextResponse.json(
      { error: "Failed to generate analytics overview" },
      { status: 500 }
    );
  }
}
