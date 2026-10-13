import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { StoreRepository } from "@/lib/repositories/store.repository";
import { PreviewShareRepository } from "@/lib/repositories/preview-share.repository";
import { ActivityRepository } from "@/lib/repositories/activity.repository";
import { generateSecureToken, hashToken } from "@/lib/crypto/tokens";
import { PreviewShare } from "@/types/preview-share";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: storeId } = await params;
  const shares = await PreviewShareRepository.findByStoreId(storeId);
  return NextResponse.json({ shares });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: storeId } = await params;
  const store = await StoreRepository.findById(storeId);
  if (!store) {
    return NextResponse.json({ error: "Store not found" }, { status: 404 });
  }

  let durationHours = 72; // Default 3 days
  try {
    const body = await request.json();
    if (body.durationHours && Number(body.durationHours) > 0) {
      durationHours = Math.min(Number(body.durationHours), 720); // Cap at 30 days
    }
  } catch {
    // Body optional, use default 72h
  }

  const rawToken = generateSecureToken();
  const tokenHash = hashToken(rawToken);

  const now = new Date();
  const expiresAt = new Date(now.getTime() + durationHours * 60 * 60 * 1000).toISOString();

  const shareRecord: PreviewShare = {
    id: `shr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    storeId: store.id,
    storeSlug: store.slug,
    tokenHash,
    expiresAt,
    createdAt: now.toISOString(),
    createdBy: session.user.id || "usr_operator",
    createdByName: session.user.name || "Operator",
    status: "active",
    accessCount: 0,
    clientName: store.clientName,
  };

  const saved = await PreviewShareRepository.create(shareRecord);

  // Record audit activity
  await ActivityRepository.record({
    type: "store_updated",
    title: "Generated client preview link",
    description: `Created ${durationHours}h preview access link for ${store.clientName}`,
    user: {
      name: session.user.name || "Operator",
      avatarInitial: (session.user.name || "O").charAt(0).toUpperCase(),
    },
    targetId: store.id,
    targetName: store.name,
  });

  const previewUrl = `/preview/${rawToken}`;

  return NextResponse.json(
    {
      share: saved,
      rawToken,
      previewUrl,
    },
    { status: 201 }
  );
}
