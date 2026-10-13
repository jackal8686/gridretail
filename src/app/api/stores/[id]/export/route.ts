import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { auth } from "@/auth";
import { StoreRepository } from "@/lib/repositories/store.repository";
import { TemplateRepository } from "@/lib/repositories/template.repository";
import { ProductRepository } from "@/lib/repositories/product.repository";
import { DeliveryRepository } from "@/lib/repositories/delivery.repository";
import { ActivityRepository } from "@/lib/repositories/activity.repository";
import { ExportService } from "@/lib/export/export-service";
import { DeliveryMode, DeliveryRecord } from "@/types/delivery";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const store = await StoreRepository.findById(id);

  if (!store) {
    return NextResponse.json({ error: "Store not found" }, { status: 404 });
  }

  try {
    let mode: DeliveryMode = "bundle_export";
    try {
      const body = await request.json();
      if (body.mode) {
        mode = body.mode;
      }
    } catch {
      // Body is optional
    }

    const template = await TemplateRepository.findById(store.templateId);
    let products = await ProductRepository.findByIds(store.selectedProductIds || []);

    if (products.length === 0) {
      const categoryProducts = await ProductRepository.findByCategory(store.industry);
      products = categoryProducts.length > 0 ? categoryProducts : await ProductRepository.findAll();
    }

    // Generate the production export package
    const bundle = await ExportService.generateStoreBundle(store, template, products);

    const userName = session.user?.name || session.user?.email || "Alex Mercer";
    const userEmail = session.user?.email || "alex.mercer@gridretail.internal";

    const deliveryRecord: DeliveryRecord = {
      id: `del-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`,
      storeId: store.id,
      storeName: store.name,
      mode,
      status: "completed",
      format: "zip",
      artifactUrl: bundle.artifactUrl,
      artifactName: bundle.artifactName,
      fileSizeBytes: bundle.fileSizeBytes,
      checksumSha256: bundle.checksumSha256,
      publishedUrl: mode === "platform_publish" ? `/preview/${store.slug}` : undefined,
      metadata: {
        totalFiles: bundle.files.length,
        fileList: bundle.files,
        exportedBy: userName,
      },
      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      createdBy: userEmail,
    };

    await DeliveryRepository.create(deliveryRecord);

    await ActivityRepository.record({
      type: "store_updated",
      title: "Storefront delivery generated",
      description: `Generated ${mode} package (${(bundle.fileSizeBytes / 1024).toFixed(1)} KB) for ${store.name}`,
      user: {
        name: userName,
        avatarInitial: userName.charAt(0).toUpperCase(),
      },
      targetId: store.id,
      targetName: store.name,
    });

    return NextResponse.json({
      success: true,
      delivery: deliveryRecord,
      message: `Delivery bundle successfully generated (${bundle.artifactName})`,
    });
  } catch (err) {
    console.error("Export generation error:", err);
    return NextResponse.json(
      { error: "Failed to generate delivery package" },
      { status: 500 }
    );
  }
}
