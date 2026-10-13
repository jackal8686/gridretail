import { NextRequest, NextResponse } from "next/server";
import { ProductRepository } from "@/lib/repositories/product.repository";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category") || undefined;
  const search = searchParams.get("search") || undefined;
  const idsParam = searchParams.get("ids");
  const ids = idsParam ? idsParam.split(",") : undefined;

  const products = await ProductRepository.findAll({ category, search, ids });
  return NextResponse.json({ products, count: products.length });
}
