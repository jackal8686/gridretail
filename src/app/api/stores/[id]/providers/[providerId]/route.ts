import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { canAccessStore } from "@/lib/auth/permissions";
import { StoreRepository } from "@/lib/repositories/store.repository";
import { ProviderRepository } from "@/lib/repositories/provider.repository";
import { ServiceRepository } from "@/lib/repositories/service.repository";
import { AppointmentProvider } from "@/types/appointment";

interface RouteParams {
  params: Promise<{ id: string; providerId: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, providerId } = await params;
  const store = await StoreRepository.findById(id);
  if (!store) {
    return NextResponse.json({ error: "Store not found" }, { status: 404 });
  }

  if (!canAccessStore({ id: session.user.id, role: session.user.role }, store, "edit")) {
    return NextResponse.json({ error: "Forbidden: You do not have permission to modify providers for this store" }, { status: 403 });
  }

  const provider = await ProviderRepository.findById(providerId);
  if (!provider || provider.storeId !== id) {
    return NextResponse.json({ error: "Provider not found in this store" }, { status: 404 });
  }

  try {
    const updates = (await request.json()) as Partial<AppointmentProvider>;
    const sanitizedUpdates: Partial<AppointmentProvider> = {};

    if (updates.name !== undefined) sanitizedUpdates.name = updates.name.trim();
    if (updates.role !== undefined) sanitizedUpdates.role = updates.role.trim();
    if (updates.bio !== undefined) sanitizedUpdates.bio = updates.bio.trim();
    if (updates.email !== undefined) sanitizedUpdates.email = updates.email.trim();
    if (updates.phone !== undefined) sanitizedUpdates.phone = updates.phone.trim();
    if (updates.status !== undefined) sanitizedUpdates.status = updates.status;
    if (updates.serviceIds !== undefined) {
      if (Array.isArray(updates.serviceIds) && updates.serviceIds.length > 0) {
        const storeServices = await ServiceRepository.findByStoreId(id);
        const storeServiceIds = new Set(storeServices.map((s) => s.id));
        const invalid = updates.serviceIds.filter((sid) => !storeServiceIds.has(sid));
        if (invalid.length > 0) {
          return NextResponse.json({ error: `Invalid serviceIds for this store: ${invalid.join(", ")}` }, { status: 400 });
        }
      }
      sanitizedUpdates.serviceIds = updates.serviceIds;
    }
    if (updates.timeOff !== undefined) sanitizedUpdates.timeOff = updates.timeOff;

    const updated = await ProviderRepository.update(providerId, sanitizedUpdates);
    return NextResponse.json({ provider: updated });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg || "Failed to update provider" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, providerId } = await params;
  const store = await StoreRepository.findById(id);
  if (!store) {
    return NextResponse.json({ error: "Store not found" }, { status: 404 });
  }

  if (!canAccessStore({ id: session.user.id, role: session.user.role }, store, "edit")) {
    return NextResponse.json({ error: "Forbidden: You do not have permission to delete providers for this store" }, { status: 403 });
  }

  const provider = await ProviderRepository.findById(providerId);
  if (!provider || provider.storeId !== id) {
    return NextResponse.json({ error: "Provider not found in this store" }, { status: 404 });
  }

  await ProviderRepository.delete(providerId);
  return NextResponse.json({ success: true, message: "Provider deleted successfully" });
}
