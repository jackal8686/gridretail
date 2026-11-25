import { NextRequest, NextResponse } from "next/server";
import { ClientRepository } from "@/lib/repositories/client.repository";
import { StoreRepository } from "@/lib/repositories/store.repository";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const client = await ClientRepository.findById(id);
  if (!client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  // Find linked stores
  const allStores = await StoreRepository.findAll();
  const linkedStores = allStores.filter(
    (s) => s.clientId === client.id || s.clientName.toLowerCase() === client.company.toLowerCase()
  );

  return NextResponse.json({ client, stores: linkedStores });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const updates = await request.json();
    const updated = await ClientRepository.update(id, updates);
    if (!updated) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, client: updated });
  } catch (err: unknown) {
    console.error("Failed to update client:", err);
    return NextResponse.json({ error: (err as Error).message || "Failed to update client" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");
    const detachStores = searchParams.get("detachStores") === "true";

    if (action === "archive") {
      const archived = await ClientRepository.archive(id);
      if (!archived) {
        return NextResponse.json({ error: "Client not found" }, { status: 404 });
      }
      return NextResponse.json({ success: true, client: archived, archived: true });
    }

    const check = await ClientRepository.canDelete(id);
    if (!check.canDelete && !detachStores) {
      return NextResponse.json(
        {
          error: "Cannot delete client with active associated storefronts.",
          storeCount: check.storeCount,
          linkedStores: check.linkedStores,
          reason: check.reason,
          suggestion: "Archive the client or pass ?detachStores=true to safely unlink stores prior to deletion.",
        },
        { status: 400 }
      );
    }

    const deleted = await ClientRepository.delete(id, { detachStores });
    if (!deleted) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, detachedStoreCount: check.storeCount });
  } catch (err: unknown) {
    console.error("Failed to delete client:", err);
    return NextResponse.json({ error: (err as Error).message || "Failed to delete client" }, { status: 500 });
  }
}
