import { NextRequest, NextResponse } from "next/server";
import { ProductRepository } from "@/lib/repositories/product.repository";
import { Product } from "@/types";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category") || undefined;
  const search = searchParams.get("search") || undefined;
  const idsParam = searchParams.get("ids");
  const ids = idsParam ? idsParam.split(",") : undefined;
  const storeId = searchParams.get("storeId") || undefined;

  const products = await ProductRepository.findAll({ category, search, ids, storeId });
  return NextResponse.json({ products, count: products.length });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body.name || !body.sku || body.price === undefined) {
      return NextResponse.json(
        { error: "Product name, SKU, and price are required." },
        { status: 400 }
      );
    }

    const id = body.id || `prod_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const product: Product = {
      id,
      name: body.name.trim(),
      sku: body.sku.trim().toUpperCase(),
      price: Number(body.price),
      currency: body.currency || "USD",
      category: body.category || "General",
      description: body.description || "",
      stockStatus: (body.stockStatus as Product["stockStatus"]) || "In Stock",
      thumbnailColor: body.thumbnailColor || "bg-emerald-100 text-emerald-800",
      imageUrl: body.imageUrl,
      storeId: body.storeId,
      storeName: body.storeName,
      createdAt: new Date().toISOString(),
    };

    const created = await ProductRepository.create(product);
    return NextResponse.json({ success: true, product: created }, { status: 201 });
  } catch (err: unknown) {
    console.error("Failed to create product:", err);
    return NextResponse.json({ error: (err as Error).message || "Failed to create product" }, { status: 500 });
  }
}
