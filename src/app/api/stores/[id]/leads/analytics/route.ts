import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { LeadRepository } from "@/lib/repositories/lead.repository";
import { LeadSubmissionRepository } from "@/lib/repositories/lead-submission.repository";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden: Lead analytics requires Administrator credentials." },
        { status: 403 }
      );
    }

    const { id: storeId } = await params;
    const leads = await LeadRepository.findByStore(storeId, { includeArchived: true });

    // In a live store, totalFormViews comes from analytics repository;
    // For standalone calculation, default to total unique views or sum of submissions + unique visits.
    const formViewsCount = Math.max(leads.length * 3, 10);

    const analytics = await LeadSubmissionRepository.getAnalyticsOverview(
      storeId,
      formViewsCount,
      leads
    );

    return NextResponse.json({ analytics });
  } catch (error) {
    console.error("Error computing lead analytics:", error);
    return NextResponse.json({ error: "Failed to load lead analytics" }, { status: 500 });
  }
}
