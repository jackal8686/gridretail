import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { PreviewShareRepository } from "@/lib/repositories/preview-share.repository";
import { ActivityRepository } from "@/lib/repositories/activity.repository";

export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; shareId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: storeId, shareId } = await params;
  const operatorName = session.user.name || "Operator";

  const revoked = await PreviewShareRepository.revoke(shareId, session.user.id || "usr_operator");
  if (!revoked) {
    return NextResponse.json({ error: "Share record not found" }, { status: 404 });
  }

  // Record audit activity
  await ActivityRepository.record({
    type: "store_updated",
    title: "Revoked client preview link",
    description: `Revoked active preview share ${shareId}`,
    user: {
      name: operatorName,
      avatarInitial: operatorName.charAt(0).toUpperCase(),
    },
    targetId: storeId,
    targetName: revoked.storeSlug,
  });

  return NextResponse.json({ share: revoked });
}
