import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { DeliveryRepository } from "@/lib/repositories/delivery.repository";
import { StoreRepository } from "@/lib/repositories/store.repository";

export async function GET(
  _request: NextRequest,
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

  const deliveries = await DeliveryRepository.findByStoreId(id);
  return NextResponse.json({ deliveries });
}
