import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { LeadReminderRepository } from "@/lib/repositories/lead-reminder.repository";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; leadId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden: Reminders require Administrator credentials." },
        { status: 403 }
      );
    }

    const { id: storeId, leadId } = await params;
    const body = await request.json();

    if (!body.title || !body.dueAt) {
      return NextResponse.json({ error: "Title and due date are required." }, { status: 400 });
    }

    const reminder = await LeadReminderRepository.create({
      storeId,
      leadId,
      title: body.title,
      dueAt: body.dueAt,
      assignedTo: body.assignedTo,
    });

    return NextResponse.json({ reminder }, { status: 201 });
  } catch (error) {
    console.error("Error creating reminder:", error);
    return NextResponse.json({ error: "Failed to create reminder" }, { status: 500 });
  }
}
