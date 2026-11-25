import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { canAccessStore } from "@/lib/auth/permissions";
import { StoreRepository } from "@/lib/repositories/store.repository";
import { ServiceRepository } from "@/lib/repositories/service.repository";
import { ProviderRepository } from "@/lib/repositories/provider.repository";
import { AppointmentRepository } from "@/lib/repositories/appointment.repository";
import {
  generateCancellationToken,
  DEFAULT_APPOINTMENT_CONFIG,
} from "@/lib/scheduling/availability";
import { Appointment, AppointmentStatus } from "@/types/appointment";

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
    return NextResponse.json({ error: "Forbidden: You do not have permission to view appointments for this store" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const status = (searchParams.get("status") as AppointmentStatus) || undefined;
  const providerId = searchParams.get("providerId") || undefined;
  const serviceId = searchParams.get("serviceId") || undefined;
  const fromUtc = searchParams.get("fromUtc") || undefined;
  const toUtc = searchParams.get("toUtc") || undefined;

  const appointments = await AppointmentRepository.findByStoreId(id, {
    status,
    providerId,
    serviceId,
    fromUtc,
    toUtc,
  });

  return NextResponse.json({ appointments, count: appointments.length });
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
    return NextResponse.json({ error: "Forbidden: You do not have permission to manage appointments for this store" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { serviceId, providerId, startUtc, customerName, customerEmail, customerPhone, customerNotes, adminNotes, status } = body;

    if (!serviceId || !startUtc || !customerName || !customerEmail) {
      return NextResponse.json({ error: "Missing required booking details (serviceId, startUtc, customerName, customerEmail)." }, { status: 400 });
    }

    const service = await ServiceRepository.findById(serviceId);
    if (!service || service.storeId !== id) {
      return NextResponse.json({ error: "Invalid service selection." }, { status: 404 });
    }

    let provName: string | undefined = undefined;
    if (providerId) {
      const p = await ProviderRepository.findById(providerId);
      if (!p || p.storeId !== id) {
        return NextResponse.json({ error: "Invalid provider selection for this store." }, { status: 404 });
      }
      provName = p.name;
    }

    const durationMinutes = service.durationMinutes || 30;
    const startDate = new Date(startUtc);
    const endDate = new Date(startDate.getTime() + durationMinutes * 60 * 1000);
    const endUtc = endDate.toISOString();

    // Check overlap
    const isOverlapping = await AppointmentRepository.checkOverlap(id, providerId, startUtc, endUtc);
    if (isOverlapping) {
      return NextResponse.json({ error: "This time slot is already booked for the selected provider." }, { status: 409 });
    }

    const config = store.appointmentConfig || DEFAULT_APPOINTMENT_CONFIG;
    const { tokenHash } = generateCancellationToken();
    const noticeHours = config.cancellationPolicy?.noticeHours || 24;
    const cancellationDeadline = new Date(startDate.getTime() - noticeHours * 60 * 60 * 1000).toISOString();
    const now = new Date().toISOString();

    const appointment: Appointment = {
      id: `apt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      storeId: id,
      serviceId: service.id,
      serviceName: service.name,
      providerId: providerId || undefined,
      providerName: provName,
      customerName: customerName.trim(),
      customerEmail: customerEmail.trim().toLowerCase(),
      customerPhone: customerPhone?.trim() || undefined,
      customerNotes: customerNotes?.trim() || undefined,
      adminNotes: adminNotes?.trim() || "Created by staff",
      startUtc,
      endUtc,
      durationMinutes,
      price: service.price || 0,
      currency: service.currency || "INR",
      status: (status as AppointmentStatus) || "Confirmed",
      confirmationNumber: `APT-SIM-${Math.floor(100000 + Math.random() * 900000)}`,
      cancellationTokenHash: tokenHash,
      cancellationDeadlineUtc: cancellationDeadline,
      createdAt: now,
      updatedAt: now,
    };

    const created = await AppointmentRepository.create(appointment);
    return NextResponse.json({ appointment: created }, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg || "Failed to create manual appointment." }, { status: 500 });
  }
}
