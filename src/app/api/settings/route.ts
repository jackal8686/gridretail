import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { SettingsRepository } from "@/lib/repositories/settings.repository";

export async function GET(_request: NextRequest) {
  const session = await auth();
  const tenantId = (session?.user as { tenantId?: string })?.tenantId || "default";

  const settings = await SettingsRepository.getSettings(tenantId);
  return NextResponse.json({ settings });
}

export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenantId = (session.user as { tenantId?: string })?.tenantId || "default";

  try {
    const body = await request.json();
    const allowedKeys = [
      "workspaceName",
      "storeExpiryDays",
      "emailAlerts",
      "reviewAlerts",
      "deploymentNotifications",
      "clientFeedbackAlerts",
    ];

    const patch: Record<string, unknown> = {};
    for (const key of allowedKeys) {
      if (body[key] !== undefined) {
        patch[key] = body[key];
      }
    }

    const updated = await SettingsRepository.updateSettings(patch, tenantId);
    return NextResponse.json({ success: true, settings: updated });
  } catch (err: unknown) {
    console.error("Failed to update settings:", err);
    return NextResponse.json({ error: (err as Error).message || "Internal server error" }, { status: 500 });
  }
}
