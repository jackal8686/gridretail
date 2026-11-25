import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { canAccessStore } from "@/lib/auth/permissions";
import { StoreRepository } from "@/lib/repositories/store.repository";
import { ServiceRepository } from "@/lib/repositories/service.repository";
import { ProviderRepository } from "@/lib/repositories/provider.repository";
import { AppointmentService } from "@/types/appointment";

interface RouteParams {
  params: Promise<{ id: string; serviceId: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, serviceId } = await params;
  const store = await StoreRepository.findById(id);
  if (!store) {
    return NextResponse.json({ error: "Store not found" }, { status: 404 });
  }

  if (!canAccessStore({ id: session.user.id, role: session.user.role }, store, "edit")) {
    return NextResponse.json({ error: "Forbidden: You do not have permission to modify services for this store" }, { status: 403 });
  }

  const service = await ServiceRepository.findById(serviceId);
  if (!service || service.storeId !== id) {
    return NextResponse.json({ error: "Service not found in this store" }, { status: 404 });
  }

  try {
    const updates = (await request.json()) as Partial<AppointmentService>;
    const sanitizedUpdates: Partial<AppointmentService> = {};

    if (updates.name !== undefined) sanitizedUpdates.name = updates.name.trim();
    if (updates.description !== undefined) sanitizedUpdates.description = updates.description.trim();
    if (updates.durationMinutes !== undefined) sanitizedUpdates.durationMinutes = Number(updates.durationMinutes);
    if (updates.price !== undefined) {
      sanitizedUpdates.price = Number(updates.price);
      if (sanitizedUpdates.price === 0) sanitizedUpdates.isFreeConsultation = true;
    }
    if (updates.isFreeConsultation !== undefined) sanitizedUpdates.isFreeConsultation = updates.isFreeConsultation;
    if (updates.meetingType !== undefined) sanitizedUpdates.meetingType = updates.meetingType;
    if (updates.status !== undefined) sanitizedUpdates.status = updates.status;
    if (updates.providerIds !== undefined) {
      if (Array.isArray(updates.providerIds) && updates.providerIds.length > 0) {
        const storeProviders = await ProviderRepository.findByStoreId(id);
        const storeProviderIds = new Set(storeProviders.map((p) => p.id));
        const invalid = updates.providerIds.filter((pid) => !storeProviderIds.has(pid));
        if (invalid.length > 0) {
          return NextResponse.json({ error: `Invalid providerIds for this store: ${invalid.join(", ")}` }, { status: 400 });
        }
      }
      sanitizedUpdates.providerIds = updates.providerIds;
    }
    if (updates.bookingInstructions !== undefined) sanitizedUpdates.bookingInstructions = updates.bookingInstructions.trim();

    const updated = await ServiceRepository.update(serviceId, sanitizedUpdates);
    return NextResponse.json({ service: updated });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg || "Failed to update service" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, serviceId } = await params;
  const store = await StoreRepository.findById(id);
  if (!store) {
    return NextResponse.json({ error: "Store not found" }, { status: 404 });
  }

  if (!canAccessStore({ id: session.user.id, role: session.user.role }, store, "edit")) {
    return NextResponse.json({ error: "Forbidden: You do not have permission to delete services for this store" }, { status: 403 });
  }

  const service = await ServiceRepository.findById(serviceId);
  if (!service || service.storeId !== id) {
    return NextResponse.json({ error: "Service not found in this store" }, { status: 404 });
  }

  await ServiceRepository.delete(serviceId);
  return NextResponse.json({ success: true, message: "Service deleted successfully" });
}
