import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { StoreRepository } from "@/lib/repositories/store.repository";
import { MediaAssetRepository } from "@/lib/repositories/media-asset.repository";
import { ActivityRepository } from "@/lib/repositories/activity.repository";
import { getStorageProvider } from "@/lib/storage/provider";
import { MediaAsset, AssetPurpose } from "@/types/media";

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/svg+xml",
];

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: storeId } = await params;
  const assets = await MediaAssetRepository.findByStoreId(storeId);
  return NextResponse.json({ assets });
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

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const purpose = (formData.get("purpose") as AssetPurpose) || "general";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate MIME Type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          error: `Unsupported image format (${file.type}). Allowed types: JPG, PNG, WEBP, SVG.`,
        },
        { status: 400 }
      );
    }

    // Validate File Size
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: "Image file exceeds maximum allowed size of 5MB." },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const storageProvider = getStorageProvider();

    const { storageKey, url } = await storageProvider.upload(
      buffer,
      file.name,
      file.type,
      store.id,
      purpose
    );

    const assetRecord: MediaAsset = {
      id: `ast_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      storeId: store.id,
      purpose,
      storageKey,
      url,
      originalFilename: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
      uploadedBy: session.user.name || "Operator",
      uploadedAt: new Date().toISOString(),
    };

    const savedAsset = await MediaAssetRepository.create(assetRecord);

    // Auto-attach to store branding if logo or banner
    if (purpose === "logo") {
      await StoreRepository.update(store.id, {
        branding: {
          ...(store.branding || { primaryColor: "#176B4D", fontFamily: "Inter, sans-serif" }),
          logoUrl: url,
        },
      });
    } else if (purpose === "banner") {
      await StoreRepository.update(store.id, {
        branding: {
          ...(store.branding || { primaryColor: "#176B4D", fontFamily: "Inter, sans-serif" }),
          bannerUrl: url,
        },
      });
    }

    // Record activity
    await ActivityRepository.record({
      type: "store_updated",
      title: "Uploaded brand media asset",
      description: `Uploaded ${purpose} image for ${store.name}`,
      user: {
        name: session.user.name || "Operator",
        avatarInitial: (session.user.name || "O").charAt(0).toUpperCase(),
      },
      targetId: store.id,
      targetName: store.name,
    });

    return NextResponse.json({ asset: savedAsset }, { status: 201 });
  } catch (err) {
    console.error("Error processing media upload:", err);
    return NextResponse.json({ error: "Failed to upload image asset" }, { status: 500 });
  }
}
