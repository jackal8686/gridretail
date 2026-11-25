import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { Logger } from "@/lib/logger";
import { StoreRepository } from "@/lib/repositories/store.repository";
import { ServiceRepository } from "@/lib/repositories/service.repository";
import { ProviderRepository } from "@/lib/repositories/provider.repository";
import { AppointmentRepository } from "@/lib/repositories/appointment.repository";
import {
  generateCancellationToken,
  DEFAULT_APPOINTMENT_CONFIG,
} from "@/lib/scheduling/availability";
import { Appointment, CreateAppointmentInput } from "@/types/appointment";

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

    const isPublished = store.status === "Published";
    const session = await auth();
    const isStaffAuthorized = !!session?.user;

    if (!isPublished && !isStaffAuthorized) {
      return NextResponse.json(
        { error: "This appointment website is unpublished." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");

    if (!email || !email.includes("@") || !email.includes(".")) {
      return NextResponse.json(
        { error: "A valid customer email address is required to look up appointments." },
        { status: 400 }
      );
    }

    const config = store.appointmentConfig || DEFAULT_APPOINTMENT_CONFIG;
    const now = new Date();

    // Query appointments scoped strictly to this store and customer email
    const appointments = await AppointmentRepository.findByCustomerEmail(store.id, email);

    // Sanitize output for customer security
    const sanitized = appointments.map((appt) => {
      const deadline = appt.cancellationDeadlineUtc
        ? new Date(appt.cancellationDeadlineUtc)
        : new Date(new Date(appt.startUtc).getTime() - (config.cancellationPolicy?.noticeHours || 24) * 60 * 60 * 1000);
      const canCancel =
        appt.status !== "Cancelled" && appt.status !== "Completed" && now < deadline;

      return {
        id: appt.id,
        confirmationNumber: appt.confirmationNumber,
        serviceId: appt.serviceId,
        serviceName: appt.serviceName,
        providerId: appt.providerId,
        providerName: appt.providerName,
        startUtc: appt.startUtc,
        endUtc: appt.endUtc,
        durationMinutes: appt.durationMinutes,
        price: appt.price,
        currency: appt.currency,
        status: appt.status,
        meetingType: appt.meetingType || "video_call",
        timezone: config.timezone,
        cancellationDeadlineUtc: appt.cancellationDeadlineUtc,
        canCancel,
        cancelledAtUtc: appt.cancelledAtUtc,
        cancellationReason: appt.cancellationReason,
        customerNotes: appt.customerNotes,
      };
    });

    return NextResponse.json({
      success: true,
      appointments: sanitized,
      count: sanitized.length,
      storeName: store.name,
      timezone: config.timezone,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    Logger.error("Public customer appointment lookup error", msg);
    return NextResponse.json({ error: "Failed to retrieve appointments." }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params;
    const store = await StoreRepository.findBySlug(slug);

    if (!store) {
      return NextResponse.json({ error: "Store not found" }, { status: 404 });
    }

    // Publication check
    const isPublished = store.status === "Published";
    const session = await auth();
    const isStaffAuthorized = !!session?.user;

    if (!isPublished && !isStaffAuthorized) {
      return NextResponse.json(
        { error: "This appointment website is unpublished and cannot accept public bookings." },
        { status: 403 }
      );
    }

    const body = (await request.json()) as Partial<CreateAppointmentInput>;
    const { serviceId, providerId, startUtc, customerName, customerEmail, customerPhone, customerNotes } = body;

    // 1. Validate required fields
    if (!serviceId) {
      return NextResponse.json({ error: "Service selection is required." }, { status: 400 });
    }
    if (!startUtc || isNaN(new Date(startUtc).getTime())) {
      return NextResponse.json({ error: "A valid start time in ISO format is required." }, { status: 400 });
    }
    if (!customerName || customerName.trim().length < 2) {
      return NextResponse.json({ error: "Please enter your full name (minimum 2 characters)." }, { status: 400 });
    }
    if (!customerEmail || !customerEmail.includes("@") || !customerEmail.includes(".")) {
      return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    }

    // 2. Load and validate service
    const service = await ServiceRepository.findById(serviceId);
    if (!service || service.storeId !== store.id || service.status !== "active") {
      return NextResponse.json({ error: "Selected service is invalid or unavailable." }, { status: 404 });
    }

    // 3. Provider assignment and validation
    let assignedProviderId = providerId;
    let assignedProviderName: string | undefined = undefined;

    const storeProviders = await ProviderRepository.findByStoreId(store.id, { status: "active" });
    if (providerId) {
      const found = storeProviders.find((p) => p.id === providerId);
      if (!found) {
        return NextResponse.json({ error: "Selected practitioner or provider is not available." }, { status: 404 });
      }
      assignedProviderName = found.name;
    } else if (storeProviders.length > 0) {
      assignedProviderId = storeProviders[0].id;
      assignedProviderName = storeProviders[0].name;
    }

    // 4. Calculate timing and endpoints
    const config = store.appointmentConfig || DEFAULT_APPOINTMENT_CONFIG;
    const durationMinutes = service.durationMinutes || 30;
    const startDate = new Date(startUtc);
    const endDate = new Date(startDate.getTime() + durationMinutes * 60 * 1000);
    const endUtc = endDate.toISOString();

    // 5. Atomic Overlap Validation (Double-booking prevention)
    const isOverlapping = await AppointmentRepository.checkOverlap(
      store.id,
      assignedProviderId,
      startUtc,
      endUtc
    );

    if (isOverlapping) {
      return NextResponse.json(
        { error: "This appointment time slot is no longer available. Another client may have just reserved it. Please choose another slot." },
        { status: 409 }
      );
    }

    // 6. Cancellation token and policy deadline
    const { rawToken, tokenHash } = generateCancellationToken();
    const noticeHours = config.cancellationPolicy?.noticeHours || 24;
    const cancellationDeadline = new Date(startDate.getTime() - noticeHours * 60 * 60 * 1000).toISOString();

    const confirmationNumber = `APT-SIM-${Math.floor(100000 + Math.random() * 900000)}`;
    const now = new Date().toISOString();

    const appointment: Appointment = {
      id: `apt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      storeId: store.id,
      serviceId: service.id,
      serviceName: service.name,
      providerId: assignedProviderId,
      providerName: assignedProviderName,
      customerName: customerName.trim(),
      customerEmail: customerEmail.trim().toLowerCase(),
      customerPhone: customerPhone?.trim() || undefined,
      customerNotes: customerNotes?.trim() || undefined,
      startUtc,
      endUtc,
      durationMinutes,
      price: service.price || 0,
      currency: service.currency || "INR",
      status: config.requireApproval ? "Pending" : "Confirmed",
      confirmationNumber,
      cancellationTokenHash: tokenHash,
      cancellationDeadlineUtc: cancellationDeadline,
      createdAt: now,
      updatedAt: now,
    };

    const created = await AppointmentRepository.create(appointment);

    return NextResponse.json(
      {
        success: true,
        appointment: {
          id: created.id,
          confirmationNumber: created.confirmationNumber,
          status: created.status,
          serviceName: created.serviceName,
          providerName: created.providerName,
          startUtc: created.startUtc,
          endUtc: created.endUtc,
          durationMinutes: created.durationMinutes,
          price: created.price,
          currency: created.currency,
          timezone: config.timezone,
          cancellationDeadlineUtc: created.cancellationDeadlineUtc,
        },
        cancellationToken: rawToken,
        cancellationPath: `/store/${slug}/appointments/${rawToken}/cancel`,
        message: config.requireApproval
          ? "Your appointment request has been submitted and is pending confirmation."
          : "Your appointment has been confirmed.",
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    Logger.error("Booking creation error", msg);
    if (
      msg.includes("no longer available") ||
      msg.includes("E11000") ||
      msg.includes("conflict") ||
      msg.includes("overlap")
    ) {
      return NextResponse.json({ error: msg }, { status: 409 });
    }
    return NextResponse.json({ error: msg || "Failed to create appointment." }, { status: 500 });
  }
}
