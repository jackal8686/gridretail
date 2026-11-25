import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { NotificationRepository } from "@/lib/repositories/notification.repository";

export async function GET(_request: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;
  const tenantId = (session?.user as { tenantId?: string })?.tenantId;

  const notifications = await NotificationRepository.findAppNotifications(userId, tenantId);
  const unreadCount = notifications.filter((n) => !n.read).length;

  return NextResponse.json({
    notifications,
    unreadCount,
  });
}

export async function PATCH(request: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;

  try {
    const body = await request.json();

    if (body.markAllRead) {
      await NotificationRepository.markAllAppNotificationsRead(userId);
      const updated = await NotificationRepository.findAppNotifications(userId);
      return NextResponse.json({
        success: true,
        notifications: updated,
        unreadCount: 0,
      });
    }

    if (body.id) {
      const read = body.read !== undefined ? Boolean(body.read) : true;
      await NotificationRepository.markAppNotificationRead(body.id, read);
      const updated = await NotificationRepository.findAppNotifications(userId);
      const unreadCount = updated.filter((n) => !n.read).length;
      return NextResponse.json({
        success: true,
        notifications: updated,
        unreadCount,
      });
    }

    return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
  } catch (err: unknown) {
    console.error("Failed to update notification status:", err);
    return NextResponse.json({ error: (err as Error).message || "Internal server error" }, { status: 500 });
  }
}
