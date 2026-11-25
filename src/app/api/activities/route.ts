import { NextResponse } from "next/server";
import { ActivityRepository } from "@/lib/repositories/activity.repository";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const activities = await ActivityRepository.findAll(limit);
    return NextResponse.json({
      success: true,
      data: activities,
    });
  } catch (error) {
    console.error("Failed to fetch activities:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch activities" },
      { status: 500 }
    );
  }
}
