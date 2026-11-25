import { NextRequest, NextResponse } from "next/server";
import { Logger } from "@/lib/logger";
import { AppointmentRepository } from "@/lib/repositories/appointment.repository";
import { StoreRepository } from "@/lib/repositories/store.repository";
import { hashCancellationToken, DEFAULT_APPOINTMENT_CONFIG } from "@/lib/scheduling/availability";

interface RouteParams {
  params: Promise<{ token: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { token } = await params;
    if (!token || token.trim().length < 16) {
      return NextResponse.json({ error: "Invalid cancellation token" }, { status: 400 });
    }

    const tokenHash = hashCancellationToken(token);
    const appointment = await AppointmentRepository.findByCancellationTokenHash(tokenHash);

    if (!appointment) {
      return NextResponse.json({ error: "Appointment not found or invalid token" }, { status: 404 });
    }

    const store = await StoreRepository.findById(appointment.storeId);
    const config = store?.appointmentConfig || DEFAULT_APPOINTMENT_CONFIG;

    const now = new Date();
    const deadline = appointment.cancellationDeadlineUtc
      ? new Date(appointment.cancellationDeadlineUtc)
      : new Date(new Date(appointment.startUtc).getTime() - 24 * 60 * 60 * 1000);
    const canCancel = appointment.status !== "Cancelled" && appointment.status !== "Completed" && now < deadline;

    return NextResponse.json({
      success: true,
      appointment: {
        confirmationNumber: appointment.confirmationNumber,
        serviceName: appointment.serviceName,
        providerName: appointment.providerName,
        startUtc: appointment.startUtc,
        endUtc: appointment.endUtc,
        durationMinutes: appointment.durationMinutes,
        status: appointment.status,
        timezone: config.timezone,
        cancellationDeadlineUtc: appointment.cancellationDeadlineUtc,
        canCancel,
        cancellationPolicyText: config.cancellationPolicy?.policyText || `Cancellations permitted up to ${config.cancellationPolicy?.noticeHours || 24} hours prior.`,
        storeName: store?.name || "Professional Services",
        storeSlug: store?.slug || "",
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    Logger.error("Appointment token query error", msg);
    return NextResponse.json({ error: "Failed to load appointment details" }, { status: 500 });
  }
}
