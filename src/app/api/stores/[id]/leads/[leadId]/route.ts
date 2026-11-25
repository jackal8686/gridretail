import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { LeadRepository } from "@/lib/repositories/lead.repository";
import { LeadSubmissionRepository } from "@/lib/repositories/lead-submission.repository";
import { LeadReminderRepository } from "@/lib/repositories/lead-reminder.repository";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; leadId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden: Lead details require Administrator credentials." },
        { status: 403 }
      );
    }

    const { id: storeId, leadId } = await params;
    const lead = await LeadRepository.findById(storeId, leadId);

    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    const [submissions, reminders, activities] = await Promise.all([
      LeadSubmissionRepository.findByLead(storeId, leadId),
      LeadReminderRepository.findByLead(storeId, leadId),
      LeadRepository.getActivities(storeId, leadId),
    ]);

    return NextResponse.json({
      lead,
      submissions,
      reminders,
      activities,
    });
  } catch (error) {
    console.error("Error fetching lead detail:", error);
    return NextResponse.json({ error: "Failed to fetch lead" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; leadId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden: Modifying lead requires Administrator credentials." },
        { status: 403 }
      );
    }

    const { id: storeId, leadId } = await params;
    const body = await request.json();

    const updated = await LeadRepository.update(storeId, leadId, body);
    if (!updated) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    return NextResponse.json({ lead: updated });
  } catch (error) {
    console.error("Error updating lead:", error);
    return NextResponse.json({ error: "Failed to update lead" }, { status: 500 });
  }
}

/**
 * Permanent GDPR-compliant deletion cascade:
 * Completely wipes lead, submissions, reminders, activities, and leaves
 * only a non-identifying audit record.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; leadId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden: Deleting lead requires Administrator credentials." },
        { status: 403 }
      );
    }

    const { id: storeId, leadId } = await params;
    const success = await LeadRepository.permanentlyDelete(storeId, leadId);

    if (!success) {
      return NextResponse.json({ error: "Lead not found or already deleted." }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "Lead and all associated personal data permanently deleted.",
    });
  } catch (error) {
    console.error("Error deleting lead:", error);
    return NextResponse.json({ error: "Failed to permanently delete lead" }, { status: 500 });
  }
}
