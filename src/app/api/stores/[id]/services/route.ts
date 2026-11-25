import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { canAccessStore } from "@/lib/auth/permissions";
import { StoreRepository } from "@/lib/repositories/store.repository";
import { ServiceRepository } from "@/lib/repositories/service.repository";
import { ProviderRepository } from "@/lib/repositories/provider.repository";
import { AppointmentService, CreateServiceInput } from "@/types/appointment";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const store = await StoreRepository.findById(id);
  if (!store) {
    return NextResponse.json({ error: "Store not found" }, { status: 404 });
  }

  if (!canAccessStore({ id: session.user.id, role: session.user.role }, store, "view")) {
    return NextResponse.json({ error: "Forbidden: You do not have permission to view services for this store" }, { status: 403 });
  }

  const services = await ServiceRepository.findByStoreId(id);
  return NextResponse.json({ services, count: services.length });
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const store = await StoreRepository.findById(id);
  if (!store) {
    return NextResponse.json({ error: "Store not found" }, { status: 404 });
  }

  if (!canAccessStore({ id: session.user.id, role: session.user.role }, store, "edit")) {
    return NextResponse.json({ error: "Forbidden: You do not have permission to create services for this store" }, { status: 403 });
  }

  try {
    const body = (await request.json()) as Partial<CreateServiceInput>;
    const name = body.name?.trim();
    if (!name || name.length < 2) {
      return NextResponse.json({ error: "Service name must be at least 2 characters." }, { status: 400 });
    }

    const durationMinutes = Number(body.durationMinutes) || 30;
    if (durationMinutes < 5 || durationMinutes > 480) {
      return NextResponse.json({ error: "Duration must be between 5 and 480 minutes." }, { status: 400 });
    }

    const price = Number(body.price) || 0;
    const now = new Date().toISOString();

    if (body.providerIds && Array.isArray(body.providerIds) && body.providerIds.length > 0) {
      const storeProviders = await ProviderRepository.findByStoreId(id);
      const storeProviderIds = new Set(storeProviders.map((p) => p.id));
      const invalid = body.providerIds.filter((pid) => !storeProviderIds.has(pid));
      if (invalid.length > 0) {
        return NextResponse.json({ error: `Invalid providerIds for this store: ${invalid.join(", ")}` }, { status: 400 });
      }
    }

    const service: AppointmentService = {
      id: `srv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      storeId: id,
      name,
      description: body.description?.trim() || "",
      durationMinutes,
      price,
      isFreeConsultation: body.isFreeConsultation === true || price === 0,
      currency: body.currency || "INR",
      meetingType: body.meetingType || "video_call",
      status: body.status || "active",
      providerIds: Array.isArray(body.providerIds) ? body.providerIds : undefined,
      bookingInstructions: body.bookingInstructions?.trim() || undefined,
      createdAt: now,
      updatedAt: now,
    };

    const created = await ServiceRepository.create(service);
    return NextResponse.json({ service: created }, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg || "Failed to create service" }, { status: 500 });
  }
}
