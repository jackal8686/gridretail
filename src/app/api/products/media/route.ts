import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getStorageProvider } from "@/lib/storage/provider";
import { AssetPurpose } from "@/types/media";

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/svg+xml",
];

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const storeIdParam = (formData.get("storeId") as string) || "draft";
    const rawPurpose = formData.get("purpose") as AssetPurpose | null;
    const validPurposes: AssetPurpose[] = ["logo", "banner", "product", "general"];
    const purpose: AssetPurpose = rawPurpose && validPurposes.includes(rawPurpose)
      ? rawPurpose
      : "product";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Tenant Security Guard: If uploading for a persisted store, verify store authorization
    if (storeIdParam && storeIdParam !== "draft" && storeIdParam !== "general") {
      const { StoreRepository } = await import("@/lib/repositories/store.repository");
      const { canAccessStore } = await import("@/lib/auth/permissions");
      const store = await StoreRepository.findById(storeIdParam);
      if (store) {
        const userRole = (session.user.role as import("@/types/user").UserRole) || "employee";
        const userId = session.user.id || "";
        if (!canAccessStore({ id: userId, role: userRole }, store, "edit")) {
          return NextResponse.json(
            { error: "Forbidden: You do not have permission to upload assets for this store" },
            { status: 403 }
          );
        }
      }
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

    // 1. Content/Signature verification (Magic bytes check)
    const { validateImageSignature, inspectSvgContent } = await import("@/lib/storage/image-validator");
    const sigCheck = validateImageSignature(buffer, file.type, file.name);
    if (!sigCheck.valid) {
      return NextResponse.json(
        { error: sigCheck.error || "File signature does not match image format." },
        { status: 400 }
      );
    }

    // 2. Security check: Robust SVG content inspection for script execution and XXE
    if (file.type === "image/svg+xml" || file.name.toLowerCase().endsWith(".svg")) {
      const svgText = buffer.toString("utf-8");
      const svgInspection = inspectSvgContent(svgText);
      if (!svgInspection.isSafe) {
        return NextResponse.json(
          { error: `Prohibited SVG content: ${svgInspection.reason}` },
          { status: 400 }
        );
      }
    }

    const storageProvider = getStorageProvider();
    const safeStoreId = storeIdParam.replace(/[^a-zA-Z0-9_-]/g, "_");

    const { storageKey, url } = await storageProvider.upload(
      buffer,
      file.name,
      file.type,
      safeStoreId,
      purpose
    );

    return NextResponse.json(
      {
        success: true,
        url,
        storageKey,
        originalFilename: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("Error processing product media upload:", err);
    return NextResponse.json({ error: "Failed to upload product image" }, { status: 500 });
  }
}
