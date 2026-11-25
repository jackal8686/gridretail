import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { canAccessStore } from "@/lib/auth/permissions";
import { StoreRepository } from "@/lib/repositories/store.repository";
import { ServiceRepository } from "@/lib/repositories/service.repository";
import { ProviderRepository } from "@/lib/repositories/provider.repository";
import { AppointmentRepository } from "@/lib/repositories/appointment.repository";
import { Appointment, AppointmentStatus } from "@/types/appointment";

const VALID_TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  Pending: ["Confirmed", "Cancelled"],
  Confirmed: ["Completed", "Cancelled", "No-show"],
  Cancelled: [],
  Completed: [],
  "No-show": [],
};

interface RouteParams {
  params: Promise<{ id: string; appointmentId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, appointmentId } = await params;
  const store = await StoreRepository.findById(id);
  if (!store) {
    return NextResponse.json({ error: "Store not found" }, { status: 404 });
  }

  if (!canAccessStore({ id: session.user.id, role: session.user.role }, store, "view")) {
    return NextResponse.json({ error: "Forbidden: You do not have permission to view appointments for this store" }, { status: 403 });
  }

  const appointment = await AppointmentRepository.findById(appointmentId);
  if (!appointment || appointment.storeId !== id) {
    return NextResponse.json({ error: "Appointment not found in this store" }, { status: 404 });
  }

  return NextResponse.json({ appointment });
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, appointmentId } = await params;
  const store = await StoreRepository.findById(id);
  if (!store) {
    return NextResponse.json({ error: "Store not found" }, { status: 404 });
  }

  if (!canAccessStore({ id: session.user.id, role: session.user.role }, store, "edit")) {
    return NextResponse.json({ error: "Forbidden: You do not have permission to manage appointments for this store" }, { status: 403 });
  }

  const appointment = await AppointmentRepository.findById(appointmentId);
  if (!appointment || appointment.storeId !== id) {
    return NextResponse.json({ error: "Appointment not found in this store" }, { status: 404 });
  }

  try {
    const updates = (await request.json()) as Partial<Appointment>;
    const sanitizedUpdates: Partial<Appointment> = {};

    if (updates.status !== undefined && updates.status !== appointment.status) {
      const allowedNextStates = VALID_TRANSITIONS[appointment.status] || [];
      if (!allowedNextStates.includes(updates.status)) {
        return NextResponse.json(
          {
            error: `Invalid status transition: cannot transition appointment from "${appointment.status}" to "${updates.status}".`,
          },
          { status: 400 }
        );
      }

      sanitizedUpdates.status = updates.status;
      if (updates.status === "Cancelled" && !appointment.cancelledAtUtc) {
        sanitizedUpdates.cancelledAtUtc = new Date().toISOString();
        sanitizedUpdates.cancellationReason = updates.cancellationReason?.trim() || "Cancelled by staff administrator";
      }
    }

    if (updates.serviceId !== undefined) {
      const s = await ServiceRepository.findById(updates.serviceId);
      if (!s || s.storeId !== id) {
        return NextResponse.json({ error: "Invalid service selection for this store." }, { status: 404 });
      }
      sanitizedUpdates.serviceId = s.id;
      sanitizedUpdates.serviceName = s.name;
    }

    if (updates.providerId !== undefined) {
      if (updates.providerId) {
        const p = await ProviderRepository.findById(updates.providerId);
        if (!p || p.storeId !== id) {
          return NextResponse.json({ error: "Invalid provider selection for this store." }, { status: 404 });
        }
        sanitizedUpdates.providerId = p.id;
        sanitizedUpdates.providerName = p.name;
      } else {
        sanitizedUpdates.providerId = undefined;
        sanitizedUpdates.providerName = undefined;
      }
    }

    if (updates.adminNotes !== undefined) {
      sanitizedUpdates.adminNotes = updates.adminNotes.trim();
    }

    if (updates.customerNotes !== undefined) {
      sanitizedUpdates.customerNotes = updates.customerNotes.trim();
    }

    // Handle atomic reschedule if new start time is provided
    const newStartUtc = updates.startUtc || (updates as Record<string, unknown>).slotStartTime as string | undefined;
    if (newStartUtc) {
      const durationMs = (appointment.durationMinutes || 45) * 60 * 1000;
      const newEndUtc = updates.endUtc || new Date(new Date(newStartUtc).getTime() + durationMs).toISOString();
      const rescheduled = await AppointmentRepository.reschedule(
        appointmentId,
        newStartUtc,
        newEndUtc,
        sanitizedUpdates.providerId !== undefined ? sanitizedUpdates.providerId : appointment.providerId
      );
      if (!rescheduled) {
        return NextResponse.json({ error: "Failed to reschedule appointment" }, { status: 400 });
      }
      // Apply remaining notes or status updates if any
      if (Object.keys(sanitizedUpdates).length > 0) {
        const fullyUpdated = await AppointmentRepository.update(appointmentId, sanitizedUpdates);
        return NextResponse.json({ appointment: fullyUpdated || rescheduled });
      }
      return NextResponse.json({ appointment: rescheduled });
    }

    const updated = await AppointmentRepository.update(appointmentId, sanitizedUpdates);
    return NextResponse.json({ appointment: updated });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg || "Failed to update appointment" }, { status: 500 });
  }
}
