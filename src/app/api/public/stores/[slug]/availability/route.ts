import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { StoreRepository } from "@/lib/repositories/store.repository";
import { ServiceRepository } from "@/lib/repositories/service.repository";
import { ProviderRepository } from "@/lib/repositories/provider.repository";
import { AppointmentRepository } from "@/lib/repositories/appointment.repository";
import { calculateAvailableSlots, DEFAULT_APPOINTMENT_CONFIG } from "@/lib/scheduling/availability";

interface RouteParams {
  params: Promise<{ slug: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params;
    const store = await StoreRepository.findBySlug(slug);

    if (!store) {
      return NextResponse.json({ error: "Store not found" }, { status: 404 });
    }

    // Tenant & publication security check
    const isPublished = store.status === "Published";
    const session = await auth();
    const isStaffAuthorized = !!session?.user;

    if (!isPublished && !isStaffAuthorized) {
      return NextResponse.json(
        { error: "This appointment website is currently in draft mode and not accepting public bookings." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const serviceId = searchParams.get("serviceId");
    const dateStr = searchParams.get("date"); // YYYY-MM-DD
    const providerId = searchParams.get("providerId") || undefined;

    if (!serviceId) {
      return NextResponse.json({ error: "Missing serviceId parameter" }, { status: 400 });
    }

    if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return NextResponse.json({ error: "Invalid date parameter. Required format: YYYY-MM-DD" }, { status: 400 });
    }

    const service = await ServiceRepository.findById(serviceId);
    if (!service || service.storeId !== store.id || service.status !== "active") {
      return NextResponse.json({ error: "Service not found or inactive" }, { status: 404 });
    }

    // Load store providers and existing active appointments
    const [providers, existingAppointments] = await Promise.all([
      ProviderRepository.findByStoreId(store.id, { status: "active" }),
      AppointmentRepository.findByStoreId(store.id),
    ]);

    const slots = calculateAvailableSlots({
      store,
      service,
      providerId,
      dateStr,
      existingAppointments,
      providers,
    });

    const config = store.appointmentConfig || DEFAULT_APPOINTMENT_CONFIG;

    return NextResponse.json({
      success: true,
      service: {
        id: service.id,
        name: service.name,
        durationMinutes: service.durationMinutes,
        price: service.price,
        isFreeConsultation: service.isFreeConsultation,
        currency: service.currency,
        meetingType: service.meetingType,
      },
      date: dateStr,
      timezone: config.timezone,
      slots,
      count: slots.length,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Availability query error:", msg);
    return NextResponse.json({ error: "Failed to calculate availability" }, { status: 500 });
  }
}
