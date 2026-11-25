import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { LeadReminderRepository } from "@/lib/repositories/lead-reminder.repository";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; leadId: string; reminderId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden: Reminders require Administrator credentials." },
        { status: 403 }
      );
    }

    const { id: storeId, reminderId } = await params;
    const body = await request.json();

    if (!body.status) {
      return NextResponse.json({ error: "Status is required." }, { status: 400 });
    }

    const updated = await LeadReminderRepository.updateStatus(storeId, reminderId, body.status);
    if (!updated) {
      return NextResponse.json({ error: "Reminder not found" }, { status: 404 });
    }

    return NextResponse.json({ reminder: updated });
  } catch (error) {
    console.error("Error updating reminder:", error);
    return NextResponse.json({ error: "Failed to update reminder" }, { status: 500 });
  }
}
