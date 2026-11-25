import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { cleanExpiredArtifacts, getRetentionPolicy } from "@/lib/storage/retention";
import { ActivityRepository } from "@/lib/repositories/activity.repository";

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "admin") {
    return NextResponse.json(
      { error: "Forbidden: Administrative privileges required to trigger artifact maintenance." },
      { status: 403 }
    );
  }

  try {
    const body = await request.json().catch(() => ({}));
    const maxAgeDays = typeof body.maxAgeDays === "number" ? body.maxAgeDays : undefined;
    const dryRun = Boolean(body.dryRun);

    const result = await cleanExpiredArtifacts({ maxAgeDays, dryRun });

    await ActivityRepository.record({
      type: "store_updated",
      title: "Triggered artifact retention cleanup",
      description: `Scanned ${result.scannedFiles} file(s); ${
        dryRun ? `dry-run found ${result.expiredFiles.length} expired` : `removed ${result.removedFiles.length} expired`
      } file(s).`,
      user: {
        name: session.user.name || "Administrator",
        avatarInitial: (session.user.name || "A").charAt(0).toUpperCase(),
      },
    });

    return NextResponse.json({
      success: true,
      policy: getRetentionPolicy(),
      result,
    });
  } catch (error) {
    console.error("Artifact maintenance cleanup error:", error);
    return NextResponse.json(
      { error: "Failed to execute artifact maintenance." },
      { status: 500 }
    );
  }
}
