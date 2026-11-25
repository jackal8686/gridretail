import { NextRequest, NextResponse } from "next/server";
import { Logger } from "@/lib/logger";
import { AppointmentRepository } from "@/lib/repositories/appointment.repository";
import { StoreRepository } from "@/lib/repositories/store.repository";
import { hashCancellationToken, DEFAULT_APPOINTMENT_CONFIG } from "@/lib/scheduling/availability";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { cancellationToken, appointmentId, customerEmail, reason } = body;

    let appointment = null;

    if (cancellationToken && typeof cancellationToken === "string" && cancellationToken.trim().length >= 16) {
      const tokenHash = hashCancellationToken(cancellationToken);
      appointment = await AppointmentRepository.findByCancellationTokenHash(tokenHash);
    } else if (appointmentId && customerEmail && typeof customerEmail === "string") {
      const candidate = await AppointmentRepository.findById(appointmentId);
      if (candidate && candidate.customerEmail.toLowerCase().trim() === customerEmail.toLowerCase().trim()) {
        appointment = candidate;
      }
    } else {
      return NextResponse.json(
        { error: "A valid cancellation token or verified customer email and appointment ID are required." },
        { status: 400 }
      );
    }

    if (!appointment) {
      return NextResponse.json({ error: "Appointment not found or unauthorized." }, { status: 404 });
    }

    if (appointment.status === "Cancelled") {
      return NextResponse.json({
        success: true,
        message: "This appointment has already been cancelled.",
        status: "Cancelled",
      });
    }

    if (appointment.status === "Completed") {
      return NextResponse.json(
        { error: "Completed appointments cannot be cancelled." },
        { status: 400 }
      );
    }

    // Check cancellation deadline according to policy
    const now = new Date();
    const deadline = appointment.cancellationDeadlineUtc
      ? new Date(appointment.cancellationDeadlineUtc)
      : new Date(new Date(appointment.startUtc).getTime() - 24 * 60 * 60 * 1000);

    if (now > deadline) {
      const store = await StoreRepository.findById(appointment.storeId);
      const config = store?.appointmentConfig || DEFAULT_APPOINTMENT_CONFIG;
      const noticeHours = config.cancellationPolicy?.noticeHours || 24;
      return NextResponse.json(
        {
          error: `The cancellation deadline for this appointment has passed. According to policy, cancellations must be made at least ${noticeHours} hours in advance.`,
          deadlinePassed: true,
        },
        { status: 400 }
      );
    }

    const cancelled = await AppointmentRepository.cancel(
      appointment.id,
      reason ? String(reason).trim() : "Cancelled by client via self-service link"
    );

    return NextResponse.json({
      success: true,
      message: "Your appointment has been successfully cancelled. The time slot has been released.",
      appointment: {
        id: cancelled?.id,
        confirmationNumber: cancelled?.confirmationNumber,
        status: "Cancelled",
        cancelledAtUtc: cancelled?.cancelledAtUtc,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    Logger.error("Cancellation error", msg);
    return NextResponse.json({ error: "Failed to cancel appointment." }, { status: 500 });
  }
}
