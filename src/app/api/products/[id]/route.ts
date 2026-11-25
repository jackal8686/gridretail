import { NextRequest, NextResponse } from "next/server";
import { ProductRepository } from "@/lib/repositories/product.repository";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const product = await ProductRepository.findById(id);
  if (!product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }
  return NextResponse.json({ product });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const updates = await request.json();
    if (updates.price !== undefined) {
      updates.price = Number(updates.price);
    }
    const updated = await ProductRepository.update(id, updates);
    if (!updated) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, product: updated });
  } catch (err: unknown) {
    console.error("Failed to update product:", err);
    return NextResponse.json({ error: (err as Error).message || "Failed to update product" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const deleted = await ProductRepository.delete(id);
    if (!deleted) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("Failed to delete product:", err);
    return NextResponse.json({ error: (err as Error).message || "Failed to delete product" }, { status: 500 });
  }
}
