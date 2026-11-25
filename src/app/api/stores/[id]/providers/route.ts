import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { canAccessStore } from "@/lib/auth/permissions";
import { StoreRepository } from "@/lib/repositories/store.repository";
import { ProviderRepository } from "@/lib/repositories/provider.repository";
import { ServiceRepository } from "@/lib/repositories/service.repository";
import { AppointmentProvider, CreateProviderInput } from "@/types/appointment";

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
    return NextResponse.json({ error: "Forbidden: You do not have permission to view providers for this store" }, { status: 403 });
  }

  const providers = await ProviderRepository.findByStoreId(id);
  return NextResponse.json({ providers, count: providers.length });
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
    return NextResponse.json({ error: "Forbidden: You do not have permission to create providers for this store" }, { status: 403 });
  }

  try {
    const body = (await request.json()) as Partial<CreateProviderInput>;
    const name = body.name?.trim();
    if (!name || name.length < 2) {
      return NextResponse.json({ error: "Provider name must be at least 2 characters." }, { status: 400 });
    }

    const role = body.role?.trim() || "Service Provider";
    const email = body.email?.trim() || `${name.toLowerCase().replace(/\s+/g, ".")}@example.com`;
    const now = new Date().toISOString();

    if (body.serviceIds && Array.isArray(body.serviceIds) && body.serviceIds.length > 0) {
      const storeServices = await ServiceRepository.findByStoreId(id);
      const storeServiceIds = new Set(storeServices.map((s) => s.id));
      const invalid = body.serviceIds.filter((sid) => !storeServiceIds.has(sid));
      if (invalid.length > 0) {
        return NextResponse.json({ error: `Invalid serviceIds for this store: ${invalid.join(", ")}` }, { status: 400 });
      }
    }

    const provider: AppointmentProvider = {
      id: `prv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      storeId: id,
      name,
      role,
      bio: body.bio?.trim() || undefined,
      email,
      phone: body.phone?.trim() || undefined,
      serviceIds: Array.isArray(body.serviceIds) ? body.serviceIds : undefined,
      status: body.status || "active",
      createdAt: now,
      updatedAt: now,
    };

    const created = await ProviderRepository.create(provider);
    return NextResponse.json({ provider: created }, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg || "Failed to create provider" }, { status: 500 });
  }
}
