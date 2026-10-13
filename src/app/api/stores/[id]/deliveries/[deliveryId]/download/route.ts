import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { DeliveryRepository } from "@/lib/repositories/delivery.repository";
import { ExportService } from "@/lib/export/export-service";
import { StoreRepository } from "@/lib/repositories/store.repository";
import { TemplateRepository } from "@/lib/repositories/template.repository";
import { ProductRepository } from "@/lib/repositories/product.repository";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; deliveryId: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, deliveryId } = await params;
  const delivery = await DeliveryRepository.findById(deliveryId);

  if (!delivery || delivery.storeId !== id) {
    return NextResponse.json({ error: "Delivery artifact not found" }, { status: 404 });
  }

  const artifactName = delivery.artifactName || `export-${id}.zip`;
  let buffer = await ExportService.getExportBuffer(id, artifactName);

  // If buffer is missing from disk (e.g. wiped or freshly spun server), regenerate dynamically
  if (!buffer) {
    const store = await StoreRepository.findById(id);
    if (!store) {
      return NextResponse.json({ error: "Store not found" }, { status: 404 });
    }
    const template = await TemplateRepository.findById(store.templateId);
    let products = await ProductRepository.findByIds(store.selectedProductIds || []);
    if (products.length === 0) {
      const categoryProducts = await ProductRepository.findByCategory(store.industry);
      products = categoryProducts.length > 0 ? categoryProducts : await ProductRepository.findAll();
    }
    const bundle = await ExportService.generateStoreBundle(store, template, products);
    buffer = bundle.buffer;
  }

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${artifactName}"`,
      "Content-Length": String(buffer.length),
      "Cache-Control": "no-store",
    },
  });
}
